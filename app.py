import os
import uuid
import logging
import hashlib
import hmac
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, create_engine, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker
from sqlalchemy.sql import func

logger = logging.getLogger("sistema_credito")

WEB_DIR = Path(__file__).resolve().parent / "web"

SESSION_COOKIE_NAME = "sc_session"
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "43200"))
SESSION_IDLE_TIMEOUT_SECONDS = int(os.getenv("SESSION_IDLE_TIMEOUT_SECONDS", "1800"))
SESSION_IDLE_PASSIVE_PATHS = {
    "/app/api/processos",
}
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() in {"1", "true", "yes"}
ROLE_CORRETOR = "corretor"
ROLE_CCA = "cca"
ROLE_ANALISTA = "analista"
ROLE_ADMIN = "admin"

VALID_ROLES = {ROLE_CORRETOR, ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN}

APP_CCA_USER = os.getenv("APP_CCA_USER", os.getenv("APP_LOGIN_USER", "cca"))
APP_CCA_PASSWORD = os.getenv("APP_CCA_PASSWORD", os.getenv("APP_LOGIN_PASSWORD", "cca123"))
APP_ANALISTA_USER = os.getenv("APP_ANALISTA_USER", "analista")
APP_ANALISTA_PASSWORD = os.getenv("APP_ANALISTA_PASSWORD", "analista123")
APP_CORRETOR_USER = os.getenv("APP_CORRETOR_USER", "corretor")
APP_CORRETOR_PASSWORD = os.getenv("APP_CORRETOR_PASSWORD", "corretor123")
APP_ADMIN_USER = os.getenv("APP_ADMIN_USER", "douglasadm")
APP_ADMIN_PASSWORD = os.getenv("APP_ADMIN_PASSWORD", "12345")

PASSWORD_HASH_ITERATIONS = int(os.getenv("PASSWORD_HASH_ITERATIONS", "200000"))
ACTIVE_SESSIONS: dict[str, dict[str, Any]] = {}


def _normalize_username(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def _build_app_users() -> dict[str, dict[str, str]]:
    users: dict[str, dict[str, str]] = {}
    configs = [
        (APP_CORRETOR_USER, APP_CORRETOR_PASSWORD, ROLE_CORRETOR),
        (APP_CCA_USER, APP_CCA_PASSWORD, ROLE_CCA),
        (APP_ANALISTA_USER, APP_ANALISTA_PASSWORD, ROLE_ANALISTA),
        (APP_ADMIN_USER, APP_ADMIN_PASSWORD, ROLE_ADMIN),
        ("Douglas", "1234", ROLE_ANALISTA),
        ("Fabio", "1234", ROLE_CORRETOR),
        ("Endy", "1234", ROLE_CCA),
        ("Douglasadm", "12345", ROLE_ADMIN),
    ]

    for username_raw, password, role in configs:
        username = _normalize_username(username_raw)
        if not username or not password:
            continue
        if username in users:
            logger.warning("Usuario duplicado nas credenciais da aplicacao: %s", username)
        users[username] = {"password": password, "role": role}
    return users


APP_USERS = _build_app_users()


def _normalize_database_url(raw_url: str) -> str:
    url = raw_url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    if "sslmode=" not in url:
        joiner = "&" if "?" in url else "?"
        url = f"{url}{joiner}sslmode=require"
    return url


def _looks_like_placeholder_url(raw_url: str) -> bool:
    text = raw_url.upper()
    markers = (
        "YOUR-PASSWORD",
        "<PASSWORD>",
        "<PROJECT-REF>",
        "<REGION>",
    )
    return any(marker in text for marker in markers)


DATABASE_URL = os.getenv("DATABASE_URL")
DB_URL_HAS_PLACEHOLDERS = bool(DATABASE_URL and _looks_like_placeholder_url(DATABASE_URL))
engine = None
SessionLocal = None

if DATABASE_URL:
    try:
        engine = create_engine(
            _normalize_database_url(DATABASE_URL),
            pool_pre_ping=True,
            pool_use_lifo=True,
            pool_size=int(os.getenv("DB_POOL_SIZE", "3")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "2")),
            pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
            pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),
            connect_args={"connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "10"))},
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    except Exception:
        engine = None
        SessionLocal = None
        logger.exception("DATABASE_URL invalido: falha ao inicializar engine.")


def _is_supabase_direct_host(raw_url: str) -> bool:
    try:
        parsed = urlparse(_normalize_database_url(raw_url))
        host = (parsed.hostname or "").lower()
        return host.startswith("db.") and host.endswith(".supabase.co")
    except Exception:
        logger.warning("DATABASE_URL com formato invalido; nao foi possivel validar host Supabase.")
        return False


def _db_error_hint(exc: SQLAlchemyError) -> str:
    text = str(getattr(exc, "orig", exc)).lower()

    if "password authentication failed" in text:
        return (
            "Autenticacao no banco falhou. Confirme usuario/senha do DATABASE_URL "
            "(incluindo URL encode da senha)."
        )

    if "could not translate host name" in text or "name or service not known" in text:
        return "Host do banco invalido no DATABASE_URL. Revise host/porta do Supabase pooler."

    if "timed out" in text or "timeout" in text:
        return "Timeout ao conectar no banco. Verifique rede e host do Supabase pooler."

    if "connection refused" in text or "could not connect" in text:
        return "Conexao recusada pelo banco. Verifique host, porta e credenciais no DATABASE_URL."

    if DATABASE_URL and _is_supabase_direct_host(DATABASE_URL):
        return (
            "DATABASE_URL parece usar conexao direta Supabase. Em Render, use a URL do "
            "Supavisor transaction mode (porta 6543)."
        )

    return "Falha de conexao com banco. Revise o DATABASE_URL e a conectividade com o Supabase."


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_salt() -> str:
    return secrets.token_hex(16)


def _hash_password(password: str, salt: str) -> str:
    raw = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        PASSWORD_HASH_ITERATIONS,
    )
    return raw.hex()


def _verify_password(password: str, password_hash: str, password_salt: str) -> bool:
    try:
        computed = _hash_password(password, password_salt)
    except Exception:
        return False
    return hmac.compare_digest(computed, password_hash)


def _normalize_role(value: Optional[str]) -> str:
    role = (value or "").strip().lower()
    return role if role in VALID_ROLES else ROLE_CORRETOR


def _home_for_session(session: Optional[dict[str, Any]]) -> str:
    if not session:
        return "/login"
    if bool(session.get("must_change_password")):
        return "/app/trocar-senha"
    return _home_for_role(str(session.get("role", "")))


def _home_for_role(role: Optional[str]) -> str:
    role_key = (role or "").strip().lower()
    if role_key == ROLE_ADMIN:
        return "/app/admin"
    if role_key == ROLE_ANALISTA:
        return "/app/analista"
    if role_key == ROLE_CCA:
        return "/app/cca"
    return "/app/corretor"


def _new_session(user_id: uuid.UUID, username: str, role: str, must_change_password: bool) -> str:
    token = uuid.uuid4().hex
    now = _utcnow()
    ACTIVE_SESSIONS[token] = {
        "user_id": str(user_id),
        "username": username,
        "role": role,
        "must_change_password": bool(must_change_password),
        "created_at": now,
        "last_seen_at": now,
        "expires_at": now + timedelta(seconds=SESSION_TTL_SECONDS),
    }
    return token


def _sync_session_from_db(token: str, session: dict[str, Any]) -> Optional[dict[str, Any]]:
    user_id_raw = str(session.get("user_id", "")).strip()
    if not user_id_raw or SessionLocal is None:
        return session

    try:
        user_id = uuid.UUID(user_id_raw)
    except ValueError:
        ACTIVE_SESSIONS.pop(token, None)
        return None

    try:
        db = SessionLocal()
    except Exception:
        logger.exception("Falha ao abrir sessao de banco para validar sessao ativa.")
        return session

    try:
        user = db.get(AppUser, user_id)
        if not user or not user.is_active:
            ACTIVE_SESSIONS.pop(token, None)
            return None
        session["username"] = user.username
        session["role"] = _normalize_role(user.role)
        session["must_change_password"] = bool(user.must_change_password)
        return session
    except Exception:
        logger.exception("Falha ao validar usuario da sessao no banco.")
        return session
    finally:
        db.close()


def _drop_sessions_for_user(user_id: uuid.UUID) -> None:
    user_id_str = str(user_id)
    stale_tokens = [token for token, data in ACTIVE_SESSIONS.items() if str(data.get("user_id", "")) == user_id_str]
    for token in stale_tokens:
        ACTIVE_SESSIONS.pop(token, None)


def _should_touch_session(request: Request) -> bool:
    method = (request.method or "").upper()
    if method != "GET":
        return True

    path = (request.url.path or "").rstrip("/") or "/"
    return path not in SESSION_IDLE_PASSIVE_PATHS


def _read_session(request: Request) -> Optional[dict[str, Any]]:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None

    session = ACTIVE_SESSIONS.get(token)
    if not session:
        return None

    synced = _sync_session_from_db(token, session)
    if not synced:
        return None
    session = synced

    now = _utcnow()
    expires_at = session.get("expires_at")
    if not isinstance(expires_at, datetime) or expires_at <= now:
        ACTIVE_SESSIONS.pop(token, None)
        return None

    if SESSION_IDLE_TIMEOUT_SECONDS > 0:
        last_seen = session.get("last_seen_at") or session.get("created_at")
        if not isinstance(last_seen, datetime):
            ACTIVE_SESSIONS.pop(token, None)
            return None
        if last_seen + timedelta(seconds=SESSION_IDLE_TIMEOUT_SECONDS) <= now:
            ACTIVE_SESSIONS.pop(token, None)
            return None

    # Sliding idle timeout: requisicoes passivas (polling) nao renovam atividade.
    if _should_touch_session(request):
        session["last_seen_at"] = now
    return session


def _read_session_user(request: Request) -> Optional[str]:
    session = _read_session(request)
    if not session:
        return None
    return str(session.get("username", ""))


def _read_session_role(request: Request) -> Optional[str]:
    session = _read_session(request)
    if not session:
        return None
    return str(session.get("role", ""))


def require_app_session(request: Request) -> dict[str, Any]:
    session = _read_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Nao autenticado")
    return session


def require_fully_authenticated_session(request: Request) -> dict[str, Any]:
    session = require_app_session(request)
    if bool(session.get("must_change_password")):
        raise HTTPException(status_code=403, detail="Troca de senha obrigatoria")
    return session


def require_app_user(request: Request) -> str:
    session = require_fully_authenticated_session(request)
    username = str(session.get("username", ""))
    if not username:
        raise HTTPException(status_code=401, detail="Nao autenticado")
    return username


def require_roles(*roles: str):
    allowed_roles = {_normalize_role(role) for role in roles if role}

    def _dependency(request: Request) -> dict[str, Any]:
        session = require_fully_authenticated_session(request)
        role = _normalize_role(str(session.get("role", "")))
        if allowed_roles and role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Sem permissao para este perfil")
        return session

    return _dependency


PROCESS_CREDITO_STATUSES = {"EM_ANALISE", "PENDENCIADO", "APROVADO", "REPROVADO"}
PROCESS_GERAL_STATUSES = {"NOVO", "EM_ANDAMENTO", "PENDENCIADO", "APROVADO", "REPROVADO", "DISTRATO", "CANCELADO"}
PROCESS_CAIXA_STATUSES = {
    "ANALISE_CREDITO",
    "PENDENTE_CREDITO",
    "ANALISE_CCA",
    "PENDENTE_CCA",
    "AGUARDANDO_CONFORMIDADE",
    "CONFORME",
    "TRATANDO_PRODUTO",
    "AGENDADO",
    "ASSINATURA_CAIXA",
}
PROCESS_AGEHAB_STATUSES = {"ANALISE_CREDITO", "PENDENTE_CREDITO", "ENVIO_AGEHAB", "PENDENTE_AGEHAB", "VALIDADO_AGEHAB"}
PROCESS_SINAL_STATUSES = {"NAO_TEM", "PENDENTE", "PAGO"}
PROCESS_FIADOR_STATUSES = {"NAO_TEM", "PENDENTE", "FINALIZADO"}
PROCESS_GERAL_FINAL_STATUSES = {"APROVADO", "REPROVADO", "DISTRATO", "CANCELADO"}
PROCESS_CCA_FINAL_STATUSES = {"ASSINATURA_CAIXA", "FINALIZADO"}

SLA_OWNER_NONE = "NONE"
SLA_OWNER_CORRETOR = "CORRETOR"
SLA_OWNER_ANALISTA = "ANALISTA"
SLA_OWNER_CCA = "CCA"
SLA_OWNER_VALUES = {SLA_OWNER_NONE, SLA_OWNER_CORRETOR, SLA_OWNER_ANALISTA, SLA_OWNER_CCA}


def _status_token(value: Optional[str]) -> str:
    return (value or "").strip().upper()


def _normalize_sla_owner(value: Optional[str], fallback: str = SLA_OWNER_NONE) -> str:
    raw = _status_token(value)
    return raw if raw in SLA_OWNER_VALUES else fallback


def _as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _seconds_from_value(value: Any) -> int:
    try:
        parsed = int(value or 0)
    except (TypeError, ValueError):
        return 0
    return max(0, parsed)


def _is_cca_sla_start_condition(processo: "Processo") -> bool:
    return _status_token(processo.status_cca) == "ANALISE_CCA" and _status_token(processo.status_agehab) == "ENVIO_AGEHAB"


def _is_cca_sla_end_condition(processo: "Processo") -> bool:
    return _status_token(processo.status_cca) in PROCESS_CCA_FINAL_STATUSES


def _is_processo_finalizado(processo: "Processo") -> bool:
    return _status_token(processo.status_geral) in PROCESS_GERAL_FINAL_STATUSES


def _get_sla_seconds(processo: "Processo", owner: str) -> int:
    owner_norm = _normalize_sla_owner(owner)
    if owner_norm == SLA_OWNER_CORRETOR:
        return _seconds_from_value(getattr(processo, "sla_corretor_seconds", 0))
    if owner_norm == SLA_OWNER_ANALISTA:
        return _seconds_from_value(getattr(processo, "sla_analista_seconds", 0))
    if owner_norm == SLA_OWNER_CCA:
        return _seconds_from_value(getattr(processo, "sla_cca_seconds", 0))
    return 0


def _set_sla_seconds(processo: "Processo", owner: str, seconds: int) -> None:
    owner_norm = _normalize_sla_owner(owner)
    value = max(0, int(seconds))
    if owner_norm == SLA_OWNER_CORRETOR:
        processo.sla_corretor_seconds = value
    elif owner_norm == SLA_OWNER_ANALISTA:
        processo.sla_analista_seconds = value
    elif owner_norm == SLA_OWNER_CCA:
        processo.sla_cca_seconds = value


def _compute_sla_hours(processo: "Processo", owner: str, now: Optional[datetime] = None) -> int:
    owner_norm = _normalize_sla_owner(owner)
    total_seconds = _get_sla_seconds(processo, owner_norm)
    active_owner = _normalize_sla_owner(getattr(processo, "sla_owner", SLA_OWNER_NONE))
    if owner_norm != SLA_OWNER_NONE and owner_norm == active_owner:
        started_at = _as_utc(getattr(processo, "sla_active_since", None))
        now_utc = _as_utc(now) or _utcnow()
        if started_at and now_utc > started_at:
            total_seconds += int((now_utc - started_at).total_seconds())
    return max(0, total_seconds // 3600)


def _refresh_sla_snapshots(processo: "Processo", now: Optional[datetime] = None) -> None:
    now_utc = _as_utc(now) or _utcnow()
    sla_corretor_horas = _compute_sla_hours(processo, SLA_OWNER_CORRETOR, now_utc)
    sla_analista_horas = _compute_sla_hours(processo, SLA_OWNER_ANALISTA, now_utc)
    sla_cca_horas = _compute_sla_hours(processo, SLA_OWNER_CCA, now_utc)
    processo.sla_corretor_dias = sla_corretor_horas // 24
    processo.sla_credito_dias = sla_analista_horas // 24
    processo.sla_cca_dias = sla_cca_horas // 24


def _accrue_current_sla(processo: "Processo", now: Optional[datetime] = None) -> None:
    now_utc = _as_utc(now) or _utcnow()
    owner = _normalize_sla_owner(getattr(processo, "sla_owner", SLA_OWNER_NONE))
    if owner == SLA_OWNER_NONE:
        processo.sla_active_since = None
        return

    started_at = _as_utc(getattr(processo, "sla_active_since", None))
    if started_at is None:
        processo.sla_active_since = now_utc
        return

    if now_utc <= started_at:
        return

    elapsed = int((now_utc - started_at).total_seconds())
    if elapsed <= 0:
        return

    current = _get_sla_seconds(processo, owner)
    _set_sla_seconds(processo, owner, current + elapsed)
    processo.sla_active_since = now_utc


def _switch_sla_owner(processo: "Processo", owner: str, now: Optional[datetime] = None) -> None:
    now_utc = _as_utc(now) or _utcnow()
    target_owner = _normalize_sla_owner(owner)
    current_owner = _normalize_sla_owner(getattr(processo, "sla_owner", SLA_OWNER_NONE))

    if target_owner == current_owner:
        if target_owner == SLA_OWNER_NONE:
            processo.sla_active_since = None
        elif _as_utc(getattr(processo, "sla_active_since", None)) is None:
            processo.sla_active_since = now_utc
        _refresh_sla_snapshots(processo, now_utc)
        return

    _accrue_current_sla(processo, now_utc)
    processo.sla_owner = target_owner
    processo.sla_active_since = None if target_owner == SLA_OWNER_NONE else now_utc
    _refresh_sla_snapshots(processo, now_utc)


def _process_has_enviado_docs(db: Session, processo_id: uuid.UUID) -> bool:
    row = (
        db.query(Documento.id)
        .filter(Documento.processo_id == processo_id, Documento.status_doc == "ENVIADO")
        .first()
    )
    return row is not None


def _apply_sla_rules(
    processo: "Processo",
    *,
    trigger: Optional[str] = None,
    has_enviado_docs: bool = False,
    now: Optional[datetime] = None,
) -> None:
    now_utc = _as_utc(now) or _utcnow()
    trigger_key = (trigger or "").strip().lower()
    current_owner = _normalize_sla_owner(getattr(processo, "sla_owner", SLA_OWNER_NONE))

    if _is_processo_finalizado(processo) or _is_cca_sla_end_condition(processo):
        _switch_sla_owner(processo, SLA_OWNER_NONE, now_utc)
        return

    if current_owner == SLA_OWNER_CCA:
        _switch_sla_owner(processo, SLA_OWNER_CCA, now_utc)
        return

    if _is_cca_sla_start_condition(processo):
        _switch_sla_owner(processo, SLA_OWNER_CCA, now_utc)
        return

    if trigger_key == "analista_pendenciou":
        _switch_sla_owner(processo, SLA_OWNER_CORRETOR, now_utc)
        return

    if trigger_key == "corretor_enviou" and has_enviado_docs:
        _switch_sla_owner(processo, SLA_OWNER_ANALISTA, now_utc)
        return

    if current_owner == SLA_OWNER_NONE and has_enviado_docs:
        _switch_sla_owner(processo, SLA_OWNER_ANALISTA, now_utc)
        return

    _switch_sla_owner(processo, current_owner, now_utc)


def _process_credit_status(value: Optional[str], fallback: str = "EM_ANALISE") -> str:
    raw = _status_token(value)
    aliases = {
        "ANALISE": "EM_ANALISE",
        "EM ANALISE": "EM_ANALISE",
        "PENDENTE": "PENDENCIADO",
    }
    raw = aliases.get(raw, raw)
    return raw if raw in PROCESS_CREDITO_STATUSES else fallback


def _process_geral_status(value: Optional[str], fallback: str = "NOVO") -> str:
    raw = _status_token(value)
    aliases = {
        "EM_ANALISE": "EM_ANDAMENTO",
        "EM ANALISE": "EM_ANDAMENTO",
        "EMANDAMENTO": "EM_ANDAMENTO",
        "PENDENTE": "PENDENCIADO",
    }
    raw = aliases.get(raw, raw)
    return raw if raw in PROCESS_GERAL_STATUSES else fallback


def _process_caixa_status(value: Optional[str], fallback: str = "ANALISE_CREDITO") -> str:
    raw = _status_token(value)
    aliases = {
        "EM_ANALISE": "ANALISE_CREDITO",
        "EM ANALISE": "ANALISE_CREDITO",
        "PENDENTE": "PENDENTE_CREDITO",
        "APROVADO": "CONFORME",
        "REPROVADO": "PENDENTE_CREDITO",
    }
    raw = aliases.get(raw, raw)
    return raw if raw in PROCESS_CAIXA_STATUSES else fallback


def _process_agehab_status(value: Optional[str], fallback: str = "ANALISE_CREDITO") -> str:
    raw = _status_token(value)
    aliases = {
        "EM_ANALISE": "ANALISE_CREDITO",
        "EM ANALISE": "ANALISE_CREDITO",
        "PENDENTE": "PENDENTE_AGEHAB",
        "APROVADO": "VALIDADO_AGEHAB",
        "REPROVADO": "PENDENTE_AGEHAB",
        "ENVIO_AGEHAG": "ENVIO_AGEHAB",
    }
    raw = aliases.get(raw, raw)
    return raw if raw in PROCESS_AGEHAB_STATUSES else fallback


def _process_sinal_status(value: Optional[str], fallback: str = "NAO_TEM") -> str:
    raw = _status_token(value)
    aliases = {"NAO TEM": "NAO_TEM"}
    raw = aliases.get(raw, raw)
    return raw if raw in PROCESS_SINAL_STATUSES else fallback


def _process_fiador_status(value: Optional[str], fallback: str = "NAO_TEM") -> str:
    raw = _status_token(value)
    aliases = {"NAO TEM": "NAO_TEM"}
    raw = aliases.get(raw, raw)
    return raw if raw in PROCESS_FIADOR_STATUSES else fallback


def _doc_status(value: Optional[str], fallback: str = "PENDENTE") -> str:
    raw = (value or "").strip().upper()
    allowed = {"PENDENTE", "ENVIADO"}
    return raw if raw in allowed else fallback


def _credit_status(value: Optional[str], fallback: str = "ANALISE") -> str:
    raw = (value or "").strip().upper()
    allowed = {"ANALISE", "PENDENCIADO", "APROVADO", "REPROVADO"}
    return raw if raw in allowed else fallback


DEFAULT_DOCUMENTOS = [
    {"categoria": "proponente", "nome": "Identidade e CPF"},
    {"categoria": "proponente", "nome": "Comprovante de estado civil"},
    {"categoria": "proponente", "nome": "Comprovante de residencia"},
    {"categoria": "proponente", "nome": "Comprovante de renda"},
    {"categoria": "caixa", "nome": "Ficha de cadastro Caixa"},
    {"categoria": "caixa", "nome": "Ficha de abertura de conta"},
    {"categoria": "caixa", "nome": "MO"},
    {"categoria": "agehab", "nome": "Checklist Agehab"},
    {"categoria": "agehab", "nome": "Ficha Agehab"},
    {"categoria": "agehab", "nome": "Declaracao de endereco"},
]


def _ensure_default_documentos(db: Session, processo_id: uuid.UUID) -> None:
    existing = (
        db.query(Documento.categoria, Documento.nome)
        .filter(Documento.processo_id == processo_id)
        .all()
    )
    existing_keys = {(categoria, nome) for categoria, nome in existing}

    created = False
    for doc in DEFAULT_DOCUMENTOS:
        key = (doc["categoria"], doc["nome"])
        if key in existing_keys:
            continue
        db.add(
            Documento(
                processo_id=processo_id,
                categoria=doc["categoria"],
                nome=doc["nome"],
                status_doc="PENDENTE",
                status_credito="ANALISE",
            )
        )
        created = True

    if created:
        db.commit()


class Base(DeclarativeBase):
    pass


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    corretor: Mapped[Optional[str]] = mapped_column(Text)
    obra: Mapped[Optional[str]] = mapped_column(Text)
    reserva: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    processos: Mapped[list["Processo"]] = relationship(back_populates="cliente", cascade="all, delete-orphan")


class Processo(Base):
    __tablename__ = "processos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cliente_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="CASCADE"))
    status_credito: Mapped[str] = mapped_column(String, nullable=False, default="EM_ANALISE")
    status_geral: Mapped[str] = mapped_column(String, nullable=False, default="NOVO")
    status_cca: Mapped[str] = mapped_column(String, nullable=False, default="ANALISE_CREDITO")
    status_agehab: Mapped[str] = mapped_column(String, nullable=False, default="ANALISE_CREDITO")
    status_sinal: Mapped[str] = mapped_column(String, nullable=False, default="NAO_TEM")
    status_fiador: Mapped[str] = mapped_column(String, nullable=False, default="NAO_TEM")
    cca_responsavel: Mapped[Optional[str]] = mapped_column(String(120))
    pendente_fiador: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pendente_sinal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sla_credito_dias: Mapped[Optional[int]] = mapped_column(Integer)
    sla_corretor_dias: Mapped[Optional[int]] = mapped_column(Integer)
    sla_cca_dias: Mapped[Optional[int]] = mapped_column(Integer)
    sla_owner: Mapped[str] = mapped_column(String(20), nullable=False, default=SLA_OWNER_NONE)
    sla_active_since: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sla_analista_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sla_corretor_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sla_cca_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    observacao: Mapped[Optional[str]] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cliente: Mapped["Cliente"] = relationship(back_populates="processos")
    documentos: Mapped[list["Documento"]] = relationship(back_populates="processo", cascade="all, delete-orphan")


class Documento(Base):
    __tablename__ = "documentos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    processo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("processos.id", ondelete="CASCADE"),
    )
    categoria: Mapped[str] = mapped_column(String, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    status_doc: Mapped[str] = mapped_column(String, nullable=False, default="PENDENTE")
    status_credito: Mapped[str] = mapped_column(String, nullable=False, default="ANALISE")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    processo: Mapped["Processo"] = relationship(back_populates="documentos")


class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    password_salt: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default=ROLE_CORRETOR)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    must_change_password: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class Empreendimento(Base):
    __tablename__ = "empreendimentos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class ClienteCreate(BaseModel):
    nome: str
    corretor: Optional[str] = None
    obra: Optional[str] = None
    reserva: Optional[str] = None


class ClienteOut(ClienteCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


class ProcessoCreate(BaseModel):
    cliente_id: uuid.UUID


class ProcessoUpdate(BaseModel):
    status_credito: Optional[str] = None
    status_geral: Optional[str] = None
    status_cca: Optional[str] = None
    status_agehab: Optional[str] = None
    status_sinal: Optional[str] = None
    status_fiador: Optional[str] = None
    cca_responsavel: Optional[str] = None
    pendente_fiador: Optional[bool] = None
    pendente_sinal: Optional[bool] = None
    sla_credito_dias: Optional[int] = None
    sla_corretor_dias: Optional[int] = None
    sla_cca_dias: Optional[int] = None
    observacao: Optional[str] = None


class ProcessoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    cliente_id: uuid.UUID
    status_credito: str
    status_geral: str
    status_cca: str
    status_agehab: str
    status_sinal: str
    status_fiador: str
    cca_responsavel: Optional[str] = None
    pendente_fiador: bool
    pendente_sinal: bool
    sla_credito_dias: Optional[int] = None
    sla_corretor_dias: Optional[int] = None
    sla_cca_dias: Optional[int] = None
    sla_analista_horas: Optional[int] = None
    sla_corretor_horas: Optional[int] = None
    sla_cca_horas: Optional[int] = None
    sla_owner: Optional[str] = None
    observacao: Optional[str] = None


class DocumentoCreate(BaseModel):
    processo_id: uuid.UUID
    categoria: str
    nome: str


class DocumentoUpdate(BaseModel):
    status_doc: Optional[str] = None
    status_credito: Optional[str] = None


class DocumentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    processo_id: uuid.UUID
    categoria: str
    nome: str
    status_doc: str
    status_credito: str


class LoginPayload(BaseModel):
    username: str
    password: str


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str


class AdminUserCreate(BaseModel):
    username: str
    password: str
    role: str


class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AdminResetPasswordPayload(BaseModel):
    new_password: str
    force_change_password: bool = True


class AppUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    username: str
    role: str
    is_active: bool
    must_change_password: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class EmpreendimentoCreate(BaseModel):
    nome: str


class EmpreendimentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    nome: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProcessoIntakeCreate(BaseModel):
    nome: str
    corretor: Optional[str] = None
    obra: Optional[str] = None
    reserva: Optional[str] = None


class ProcessoOverviewOut(BaseModel):
    processo_id: uuid.UUID
    cliente_id: uuid.UUID
    cliente_nome: str
    corretor: Optional[str] = None
    obra: Optional[str] = None
    reserva: Optional[str] = None
    status_credito: str
    status_geral: str
    status_cca: str
    status_agehab: str
    status_sinal: str
    status_fiador: str
    cca_responsavel: Optional[str] = None
    pendente_fiador: bool
    pendente_sinal: bool
    sla_credito_dias: Optional[int] = None
    sla_corretor_dias: Optional[int] = None
    sla_cca_dias: Optional[int] = None
    sla_analista_horas: Optional[int] = None
    sla_corretor_horas: Optional[int] = None
    sla_cca_horas: Optional[int] = None
    sla_owner: Optional[str] = None
    created_at: Optional[datetime] = None


class ProcessoFullOut(BaseModel):
    processo: ProcessoOut
    cliente: ClienteOut
    documentos: list[DocumentoOut]


class DocumentoBulkItem(BaseModel):
    categoria: str
    nome: str
    status_doc: Optional[str] = None
    status_credito: Optional[str] = None


class DocumentoBulkUpsert(BaseModel):
    documentos: list[DocumentoBulkItem]


def _set_user_password(user: AppUser, password: str, must_change_password: bool = True) -> None:
    salt = _new_salt()
    user.password_salt = salt
    user.password_hash = _hash_password(password, salt)
    user.must_change_password = bool(must_change_password)


def _get_user_by_username(db: Session, username: str) -> Optional[AppUser]:
    username_key = _normalize_username(username)
    if not username_key:
        return None
    return db.query(AppUser).filter(func.lower(AppUser.username) == username_key).first()


def _ensure_seed_users(db: Session) -> None:
    seeds = []
    for username, account in APP_USERS.items():
        seeds.append((username, account["password"], _normalize_role(account["role"])))
    admin_seed_username = _normalize_username(APP_ADMIN_USER)

    created = 0
    changed = 0
    for username, password, role in seeds:
        existing = _get_user_by_username(db, username)
        if existing:
            # Usuarios seed entram com troca opcional para facilitar acesso inicial.
            is_admin_seed = _normalize_username(existing.username) == admin_seed_username
            if existing.must_change_password and (existing.last_login_at is None or is_admin_seed):
                existing.must_change_password = False
                changed += 1
            continue
        user = AppUser(
            username=_normalize_username(username),
            role=role,
            is_active=True,
            must_change_password=False,
        )
        _set_user_password(user, password, must_change_password=False)
        db.add(user)
        created += 1

    if created or changed:
        db.commit()


def _normalize_empreendimento_nome(value: Optional[str]) -> str:
    return " ".join((value or "").strip().split())


def _resolve_empreendimento_nome(db: Session, value: Optional[str]) -> Optional[str]:
    nome = _normalize_empreendimento_nome(value)
    if not nome:
        return None

    empreendimento = (
        db.query(Empreendimento)
        .filter(func.lower(Empreendimento.nome) == nome.lower(), Empreendimento.is_active.is_(True))
        .first()
    )
    if empreendimento:
        return empreendimento.nome
    return None


def _ensure_runtime_schema(db: Session) -> None:
    processos_table = db.execute(text("SELECT to_regclass('public.processos')")).scalar()
    if not processos_table:
        return

    statements = [
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS status_credito VARCHAR(30) DEFAULT 'EM_ANALISE'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS status_sinal VARCHAR(30) DEFAULT 'NAO_TEM'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS status_fiador VARCHAR(30) DEFAULT 'NAO_TEM'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS cca_responsavel VARCHAR(120)",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_cca_dias INTEGER",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_owner VARCHAR(20) DEFAULT 'NONE'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_active_since TIMESTAMPTZ",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_analista_seconds INTEGER DEFAULT 0",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_corretor_seconds INTEGER DEFAULT 0",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_cca_seconds INTEGER DEFAULT 0",
    ]
    for stmt in statements:
        db.execute(text(stmt))

    db.execute(
        text(
            """
            UPDATE processos
            SET status_credito = CASE
                WHEN UPPER(COALESCE(status_credito, '')) IN ('EM_ANALISE', 'PENDENCIADO', 'APROVADO', 'REPROVADO') THEN UPPER(status_credito)
                WHEN UPPER(COALESCE(status_credito, '')) IN ('ANALISE', 'EM ANALISE', 'EMANALISE') THEN 'EM_ANALISE'
                WHEN UPPER(COALESCE(status_credito, '')) IN ('PENDENTE') THEN 'PENDENCIADO'
                ELSE 'EM_ANALISE'
            END
            """
        )
    )

    db.execute(
        text(
            """
            UPDATE processos
            SET status_geral = CASE
                WHEN UPPER(COALESCE(status_geral, '')) IN ('NOVO', 'EM_ANDAMENTO', 'PENDENCIADO', 'APROVADO', 'REPROVADO', 'DISTRATO', 'CANCELADO') THEN UPPER(status_geral)
                WHEN UPPER(COALESCE(status_geral, '')) IN ('EM_ANALISE', 'EM ANALISE', 'EMANALISE') THEN 'EM_ANDAMENTO'
                WHEN UPPER(COALESCE(status_geral, '')) IN ('PENDENTE') THEN 'PENDENCIADO'
                ELSE 'NOVO'
            END
            """
        )
    )

    db.execute(
        text(
            """
            UPDATE processos
            SET status_cca = CASE
                WHEN UPPER(COALESCE(status_cca, '')) IN (
                    'ANALISE_CREDITO', 'PENDENTE_CREDITO', 'ANALISE_CCA', 'PENDENTE_CCA',
                    'AGUARDANDO_CONFORMIDADE', 'CONFORME', 'TRATANDO_PRODUTO', 'AGENDADO', 'ASSINATURA_CAIXA'
                ) THEN UPPER(status_cca)
                WHEN UPPER(COALESCE(status_cca, '')) IN ('EM_ANALISE', 'EM ANALISE', 'EMANALISE', 'ANALISE') THEN 'ANALISE_CREDITO'
                WHEN UPPER(COALESCE(status_cca, '')) IN ('PENDENTE', 'PENDENCIADO') THEN 'PENDENTE_CREDITO'
                WHEN UPPER(COALESCE(status_cca, '')) IN ('APROVADO') THEN 'CONFORME'
                WHEN UPPER(COALESCE(status_cca, '')) IN ('REPROVADO') THEN 'PENDENTE_CREDITO'
                ELSE 'ANALISE_CREDITO'
            END
            """
        )
    )

    db.execute(
        text(
            """
            UPDATE processos
            SET status_agehab = CASE
                WHEN UPPER(COALESCE(status_agehab, '')) IN ('ANALISE_CREDITO', 'PENDENTE_CREDITO', 'ENVIO_AGEHAB', 'PENDENTE_AGEHAB', 'VALIDADO_AGEHAB') THEN UPPER(status_agehab)
                WHEN UPPER(COALESCE(status_agehab, '')) IN ('EM_ANALISE', 'EM ANALISE', 'EMANALISE', 'ANALISE') THEN 'ANALISE_CREDITO'
                WHEN UPPER(COALESCE(status_agehab, '')) IN ('PENDENTE', 'PENDENCIADO') THEN 'PENDENTE_AGEHAB'
                WHEN UPPER(COALESCE(status_agehab, '')) IN ('APROVADO') THEN 'VALIDADO_AGEHAB'
                WHEN UPPER(COALESCE(status_agehab, '')) IN ('REPROVADO') THEN 'PENDENTE_AGEHAB'
                WHEN UPPER(COALESCE(status_agehab, '')) IN ('ENVIO_AGEHAG') THEN 'ENVIO_AGEHAB'
                ELSE 'ANALISE_CREDITO'
            END
            """
        )
    )

    db.execute(
        text(
            """
            UPDATE processos
            SET status_sinal = CASE
                WHEN UPPER(COALESCE(status_sinal, '')) IN ('NAO_TEM', 'PENDENTE', 'PAGO') THEN UPPER(status_sinal)
                WHEN pendente_sinal IS TRUE THEN 'PENDENTE'
                ELSE 'NAO_TEM'
            END
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE processos
            SET status_fiador = CASE
                WHEN UPPER(COALESCE(status_fiador, '')) IN ('NAO_TEM', 'PENDENTE', 'FINALIZADO') THEN UPPER(status_fiador)
                WHEN pendente_fiador IS TRUE THEN 'PENDENTE'
                ELSE 'NAO_TEM'
            END
            """
        )
    )

    db.execute(
        text(
            """
            UPDATE processos
            SET sla_owner = CASE
                WHEN UPPER(COALESCE(sla_owner, '')) IN ('NONE', 'CORRETOR', 'ANALISTA', 'CCA') THEN UPPER(sla_owner)
                ELSE 'NONE'
            END
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE processos
            SET sla_corretor_seconds = GREATEST(COALESCE(sla_corretor_seconds, 0), COALESCE(sla_corretor_dias, 0) * 86400)
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE processos
            SET sla_analista_seconds = GREATEST(COALESCE(sla_analista_seconds, 0), COALESCE(sla_credito_dias, 0) * 86400)
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE processos
            SET sla_cca_seconds = COALESCE(sla_cca_seconds, 0)
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE processos
            SET sla_cca_dias = COALESCE(sla_cca_dias, FLOOR(COALESCE(sla_cca_seconds, 0) / 86400.0)::INTEGER)
            """
        )
    )

    db.commit()


def get_db():
    if DB_URL_HAS_PLACEHOLDERS:
        raise HTTPException(
            status_code=503,
            detail="DATABASE_URL ainda contem placeholders. Configure a URL real do Supabase no Render.",
        )

    if SessionLocal is None:
        if DATABASE_URL:
            detail = "DATABASE_URL invalido. Revise usuario/senha/host e URL do pooler Supabase."
        else:
            detail = "DATABASE_URL nao configurado. Defina a conexao do Supabase no Render."
        raise HTTPException(
            status_code=503,
            detail=detail,
        )
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if DB_URL_HAS_PLACEHOLDERS:
        logger.warning("DATABASE_URL parece conter placeholders (<PASSWORD>, YOUR-PASSWORD, etc.).")

    if DATABASE_URL and _is_supabase_direct_host(DATABASE_URL):
        logger.warning(
            "DATABASE_URL aponta para conexao direta Supabase (db.<project-ref>.supabase.co), "
            "que normalmente exige IPv6. Em Render, use a URL do Supavisor transaction mode "
            "(aws-0-<region>.pooler.supabase.com:6543)."
        )

    if engine is not None and os.getenv("AUTO_CREATE_TABLES", "false").lower() in {"1", "true", "yes"}:
        try:
            Base.metadata.create_all(bind=engine)
        except SQLAlchemyError:
            logger.exception("Falha ao executar create_all no startup.")
            if os.getenv("STARTUP_DB_STRICT", "false").lower() in {"1", "true", "yes"}:
                raise

    if engine is not None:
        try:
            Base.metadata.create_all(bind=engine, tables=[AppUser.__table__, Empreendimento.__table__])
            if SessionLocal is not None:
                db = SessionLocal()
                try:
                    _ensure_seed_users(db)
                    _ensure_runtime_schema(db)
                finally:
                    db.close()
        except SQLAlchemyError:
            logger.exception("Falha ao preparar tabela de usuarios da aplicacao.")
            if os.getenv("STARTUP_DB_STRICT", "false").lower() in {"1", "true", "yes"}:
                raise
    yield


app = FastAPI(title="Sistema Credito API", lifespan=lifespan)


@app.get("/")
def root(request: Request):
    accept = (request.headers.get("accept") or "").lower()
    if "text/html" in accept:
        return RedirectResponse(url="/app", status_code=302)
    return {"service": "sistema-credito-api", "status": "ok"}


@app.get("/login")
def login_page(request: Request):
    session = _read_session(request)
    if session:
        return RedirectResponse(url=_home_for_session(session), status_code=302)
    return FileResponse(WEB_DIR / "login.html")


@app.get("/app")
def app_root(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    return RedirectResponse(url=_home_for_session(session), status_code=302)


@app.get("/app/cca")
def app_cca_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role not in {ROLE_CCA, ROLE_ANALISTA}:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return FileResponse(WEB_DIR / "cca.html")


@app.get("/app/checklist")
def app_checklist_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    return FileResponse(WEB_DIR / "checklist.html")


@app.get("/app/corretor")
def app_corretor_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role != ROLE_CORRETOR:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return FileResponse(WEB_DIR / "corretor_painel.html")


@app.get("/app/analista")
def app_analista_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role != ROLE_ANALISTA:
        return RedirectResponse(url=_home_for_role(role), status_code=302)

    processo_id = (request.query_params.get("processo_id") or "").strip()
    if processo_id:
        target = f"/app/analise?processo_id={processo_id}"
        return RedirectResponse(url=target, status_code=302)

    return FileResponse(WEB_DIR / "analista_painel.html")


@app.get("/app/analise")
def app_analise_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role != ROLE_ANALISTA:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return FileResponse(WEB_DIR / "analista.html")


@app.get("/app/admin")
def app_admin_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role != ROLE_ADMIN:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return FileResponse(WEB_DIR / "admin.html")


@app.get("/admin")
def admin_shortcut(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    return RedirectResponse(url=_home_for_session(session), status_code=302)


@app.get("/manutencao")
def maintenance_shortcut(request: Request):
    return admin_shortcut(request)


@app.get("/app/trocar-senha")
def app_change_password_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    return FileResponse(WEB_DIR / "change_password.html")


@app.post("/auth/login")
def auth_login(payload: LoginPayload, db: Session = Depends(get_db)):
    _ensure_seed_users(db)

    username = _normalize_username(payload.username)
    if not username:
        raise HTTPException(status_code=401, detail="Credenciais invalidas")

    user = _get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais invalidas")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Acesso bloqueado. Procure o administrador.")
    if not _verify_password(payload.password, user.password_hash, user.password_salt):
        raise HTTPException(status_code=401, detail="Credenciais invalidas")

    user.last_login_at = _utcnow()
    db.commit()
    db.refresh(user)

    token = _new_session(
        user_id=user.id,
        username=user.username,
        role=_normalize_role(user.role),
        must_change_password=bool(user.must_change_password),
    )
    home = "/app/trocar-senha" if user.must_change_password else _home_for_role(user.role)
    response = JSONResponse(
        {
            "ok": True,
            "username": user.username,
            "role": _normalize_role(user.role),
            "must_change_password": bool(user.must_change_password),
            "home": home,
        }
    )
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        max_age=SESSION_TTL_SECONDS,
    )
    return response


@app.post("/auth/logout")
def auth_logout(request: Request):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        ACTIVE_SESSIONS.pop(token, None)

    response = JSONResponse({"ok": True})
    response.delete_cookie(key=SESSION_COOKIE_NAME)
    return response


@app.get("/auth/me")
def auth_me(request: Request):
    session = _read_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Nao autenticado")
    username = str(session.get("username", ""))
    role = _normalize_role(str(session.get("role", "")))
    must_change_password = bool(session.get("must_change_password"))
    home = "/app/trocar-senha" if must_change_password else _home_for_role(role)
    return {
        "ok": True,
        "username": username,
        "role": role,
        "must_change_password": must_change_password,
        "home": home,
    }


@app.post("/auth/change-password")
def auth_change_password(
    payload: ChangePasswordPayload,
    request: Request,
    db: Session = Depends(get_db),
):
    session = require_app_session(request)
    user_id_raw = str(session.get("user_id", "")).strip()
    if not user_id_raw:
        raise HTTPException(status_code=401, detail="Sessao invalida")

    try:
        user_id = uuid.UUID(user_id_raw)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Sessao invalida") from exc

    user = db.get(AppUser, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="Acesso bloqueado")

    current_password = payload.current_password or ""
    new_password = (payload.new_password or "").strip()
    if len(new_password) < 4:
        raise HTTPException(status_code=422, detail="Nova senha deve ter ao menos 4 caracteres")

    if not _verify_password(current_password, user.password_hash, user.password_salt):
        raise HTTPException(status_code=401, detail="Senha atual invalida")

    _set_user_password(user, new_password, must_change_password=False)
    db.commit()
    db.refresh(user)

    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token and token in ACTIVE_SESSIONS:
        ACTIVE_SESSIONS[token]["must_change_password"] = False
        ACTIVE_SESSIONS[token]["role"] = _normalize_role(user.role)
        ACTIVE_SESSIONS[token]["username"] = user.username

    return {
        "ok": True,
        "username": user.username,
        "role": _normalize_role(user.role),
        "must_change_password": False,
        "home": _home_for_role(user.role),
    }


@app.get("/app/api/admin/users", response_model=list[AppUserOut])
def admin_list_users(
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    _ensure_seed_users(db)
    users = db.query(AppUser).order_by(func.lower(AppUser.username).asc()).all()
    return users


@app.post("/app/api/admin/users", response_model=AppUserOut)
def admin_create_user(
    payload: AdminUserCreate,
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    username = _normalize_username(payload.username)
    if not username:
        raise HTTPException(status_code=422, detail="Usuario obrigatorio")
    if len(payload.password or "") < 4:
        raise HTTPException(status_code=422, detail="Senha deve ter ao menos 4 caracteres")
    role = (payload.role or "").strip().lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=422, detail="Perfil invalido")
    if _get_user_by_username(db, username):
        raise HTTPException(status_code=409, detail="Usuario ja existe")

    user = AppUser(
        username=username,
        role=role,
        is_active=True,
        must_change_password=True,
    )
    _set_user_password(user, payload.password, must_change_password=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.patch("/app/api/admin/users/{user_id}", response_model=AppUserOut)
def admin_update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    session: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    user = db.get(AppUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    current_user_id = str(session.get("user_id", ""))

    if payload.role is not None:
        role = (payload.role or "").strip().lower()
        if role not in VALID_ROLES:
            raise HTTPException(status_code=422, detail="Perfil invalido")
        user.role = role

    if payload.is_active is not None:
        if current_user_id and current_user_id == str(user.id) and not bool(payload.is_active):
            raise HTTPException(status_code=422, detail="Admin nao pode bloquear a si mesmo")
        user.is_active = bool(payload.is_active)
        if not user.is_active:
            _drop_sessions_for_user(user.id)

    db.commit()
    db.refresh(user)

    return user


@app.post("/app/api/admin/users/{user_id}/reset-password", response_model=AppUserOut)
def admin_reset_password(
    user_id: uuid.UUID,
    payload: AdminResetPasswordPayload,
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    user = db.get(AppUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    if len(payload.new_password or "") < 4:
        raise HTTPException(status_code=422, detail="Senha deve ter ao menos 4 caracteres")

    _set_user_password(user, payload.new_password, must_change_password=payload.force_change_password)
    db.commit()
    db.refresh(user)
    _drop_sessions_for_user(user.id)
    return user


@app.get("/app/api/ccas", response_model=list[str])
def app_list_ccas(
    _: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(AppUser.username)
        .filter(AppUser.is_active.is_(True), func.lower(AppUser.role) == ROLE_CCA)
        .order_by(func.lower(AppUser.username).asc())
        .all()
    )
    return [row[0] for row in rows]


@app.get("/app/api/empreendimentos", response_model=list[EmpreendimentoOut])
def app_list_empreendimentos(
    _: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Empreendimento)
        .filter(Empreendimento.is_active.is_(True))
        .order_by(func.lower(Empreendimento.nome).asc())
        .all()
    )
    return rows


@app.get("/app/api/admin/empreendimentos", response_model=list[EmpreendimentoOut])
def admin_list_empreendimentos(
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    rows = db.query(Empreendimento).order_by(func.lower(Empreendimento.nome).asc()).all()
    return rows


@app.post("/app/api/admin/empreendimentos", response_model=EmpreendimentoOut)
def admin_create_empreendimento(
    payload: EmpreendimentoCreate,
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    nome = _normalize_empreendimento_nome(payload.nome)
    if not nome:
        raise HTTPException(status_code=422, detail="Nome do empreendimento obrigatorio")

    existing = db.query(Empreendimento).filter(func.lower(Empreendimento.nome) == nome.lower()).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
            db.refresh(existing)
        return existing

    empreendimento = Empreendimento(nome=nome, is_active=True)
    db.add(empreendimento)
    db.commit()
    db.refresh(empreendimento)
    return empreendimento


@app.delete("/app/api/admin/empreendimentos/{empreendimento_id}")
def admin_delete_empreendimento(
    empreendimento_id: uuid.UUID,
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    empreendimento = db.get(Empreendimento, empreendimento_id)
    if not empreendimento:
        raise HTTPException(status_code=404, detail="Empreendimento nao encontrado")
    empreendimento.is_active = False
    db.commit()
    return {"ok": True}


@app.get("/health")
def health():
    return {
        "ok": True,
        "db_configured": bool(DATABASE_URL),
        "db_url_valid": SessionLocal is not None,
        "db_url_has_placeholders": DB_URL_HAS_PLACEHOLDERS,
        "db_uses_direct_supabase_host": bool(DATABASE_URL and _is_supabase_direct_host(DATABASE_URL)),
    }


@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"ok": True}
    except SQLAlchemyError as exc:
        logger.warning("Falha no health check de banco: %s", exc.__class__.__name__)
        raise HTTPException(
            status_code=503,
            detail={
                "message": _db_error_hint(exc),
                "error_type": exc.__class__.__name__,
            },
        ) from exc


@app.get("/api/health")
def api_health():
    return {"ok": True}


@app.post("/api/clientes", response_model=ClienteOut)
def create_cliente(payload: ClienteCreate, db: Session = Depends(get_db)):
    cliente = Cliente(**payload.model_dump())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@app.get("/api/clientes", response_model=list[ClienteOut])
def list_clientes(db: Session = Depends(get_db)):
    return db.query(Cliente).order_by(Cliente.created_at.desc()).all()


@app.post("/api/processos", response_model=ProcessoOut)
def create_processo(payload: ProcessoCreate, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, payload.cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")

    processo = Processo(cliente_id=payload.cliente_id)
    db.add(processo)
    db.commit()
    db.refresh(processo)
    _ensure_default_documentos(db, processo.id)
    return processo


@app.get("/api/processos/{processo_id}", response_model=ProcessoOut)
def get_processo(processo_id: uuid.UUID, db: Session = Depends(get_db)):
    processo = db.get(Processo, processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo nao encontrado")
    return processo


@app.patch("/api/processos/{processo_id}", response_model=ProcessoOut)
def patch_processo(processo_id: uuid.UUID, payload: ProcessoUpdate, db: Session = Depends(get_db)):
    processo = db.get(Processo, processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo nao encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(processo, field, value)

    db.commit()
    db.refresh(processo)
    return processo


@app.post("/api/documentos", response_model=DocumentoOut)
def create_documento(payload: DocumentoCreate, db: Session = Depends(get_db)):
    processo = db.get(Processo, payload.processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo nao encontrado")

    documento = Documento(**payload.model_dump())
    db.add(documento)
    db.commit()
    db.refresh(documento)
    return documento


@app.get("/api/processos/{processo_id}/documentos", response_model=list[DocumentoOut])
def list_documentos(processo_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(Documento).filter(Documento.processo_id == processo_id).all()


@app.patch("/api/documentos/{documento_id}", response_model=DocumentoOut)
def patch_documento(documento_id: uuid.UUID, payload: DocumentoUpdate, db: Session = Depends(get_db)):
    documento = db.get(Documento, documento_id)
    if not documento:
        raise HTTPException(status_code=404, detail="Documento nao encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(documento, field, value)

    db.commit()
    db.refresh(documento)
    return documento


@app.get("/app/api/processos", response_model=list[ProcessoOverviewOut])
def app_list_processos(
    session: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    role = _normalize_role(str(session.get("role", "")))
    username = _normalize_username(str(session.get("username", "")))

    query = db.query(Processo, Cliente).join(Cliente, Processo.cliente_id == Cliente.id)
    if role == ROLE_CORRETOR:
        if not username:
            return []
        query = query.filter(func.lower(func.trim(func.coalesce(Cliente.corretor, ""))) == username)
    elif role == ROLE_CCA:
        if not username:
            return []
        query = query.filter(func.lower(func.trim(func.coalesce(Processo.cca_responsavel, ""))) == username)

    rows = query.order_by(Processo.created_at.desc()).all()
    now = _utcnow()

    return [
        ProcessoOverviewOut(
            processo_id=processo.id,
            cliente_id=cliente.id,
            cliente_nome=cliente.nome,
            corretor=cliente.corretor,
            obra=cliente.obra,
            reserva=cliente.reserva,
            status_credito=processo.status_credito,
            status_geral=processo.status_geral,
            status_cca=processo.status_cca,
            status_agehab=processo.status_agehab,
            status_sinal=processo.status_sinal,
            status_fiador=processo.status_fiador,
            cca_responsavel=processo.cca_responsavel,
            pendente_fiador=processo.pendente_fiador,
            pendente_sinal=processo.pendente_sinal,
            sla_credito_dias=_compute_sla_hours(processo, SLA_OWNER_ANALISTA, now) // 24,
            sla_corretor_dias=_compute_sla_hours(processo, SLA_OWNER_CORRETOR, now) // 24,
            sla_cca_dias=_compute_sla_hours(processo, SLA_OWNER_CCA, now) // 24,
            sla_analista_horas=_compute_sla_hours(processo, SLA_OWNER_ANALISTA, now),
            sla_corretor_horas=_compute_sla_hours(processo, SLA_OWNER_CORRETOR, now),
            sla_cca_horas=_compute_sla_hours(processo, SLA_OWNER_CCA, now),
            sla_owner=_normalize_sla_owner(processo.sla_owner),
            created_at=processo.created_at,
        )
        for processo, cliente in rows
    ]


@app.post("/app/api/processos/intake")
def app_create_intake(
    payload: ProcessoIntakeCreate,
    session: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_CCA, ROLE_ANALISTA)),
    db: Session = Depends(get_db),
):
    role = _normalize_role(str(session.get("role", "")))
    username = _normalize_username(str(session.get("username", "")))
    obra_nome = _resolve_empreendimento_nome(db, payload.obra)
    if role == ROLE_CORRETOR and not obra_nome:
        raise HTTPException(status_code=422, detail="Selecione um empreendimento cadastrado.")
    if payload.obra and not obra_nome:
        raise HTTPException(status_code=422, detail="Empreendimento invalido. Selecione um empreendimento cadastrado.")

    cliente = Cliente(
        nome=payload.nome.strip(),
        corretor=username if role == ROLE_CORRETOR else (_normalize_username(payload.corretor) if payload.corretor else None),
        obra=obra_nome,
        reserva=payload.reserva.strip() if payload.reserva else None,
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)

    processo = Processo(cliente_id=cliente.id)
    db.add(processo)
    db.commit()
    db.refresh(processo)

    _ensure_default_documentos(db, processo.id)
    return {"ok": True, "cliente_id": str(cliente.id), "processo_id": str(processo.id)}


@app.get("/app/api/processos/{processo_id}/full", response_model=ProcessoFullOut)
def app_get_processo_full(
    processo_id: uuid.UUID,
    session: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    processo = db.get(Processo, processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo nao encontrado")

    cliente = db.get(Cliente, processo.cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")

    role = _normalize_role(str(session.get("role", "")))
    username = _normalize_username(str(session.get("username", "")))
    if role == ROLE_CORRETOR and _normalize_username(cliente.corretor) != username:
        raise HTTPException(status_code=403, detail="Sem permissao para acessar este processo")
    if role == ROLE_CCA and _normalize_username(processo.cca_responsavel) != username:
        raise HTTPException(status_code=403, detail="Sem permissao para acessar este processo")

    _ensure_default_documentos(db, processo.id)
    documentos = (
        db.query(Documento)
        .filter(Documento.processo_id == processo.id)
        .order_by(Documento.categoria.asc(), Documento.nome.asc())
        .all()
    )

    now = _utcnow()
    processo_out = ProcessoOut.model_validate(processo)
    processo_out.sla_corretor_horas = _compute_sla_hours(processo, SLA_OWNER_CORRETOR, now)
    processo_out.sla_analista_horas = _compute_sla_hours(processo, SLA_OWNER_ANALISTA, now)
    processo_out.sla_cca_horas = _compute_sla_hours(processo, SLA_OWNER_CCA, now)
    processo_out.sla_corretor_dias = processo_out.sla_corretor_horas // 24
    processo_out.sla_credito_dias = processo_out.sla_analista_horas // 24
    processo_out.sla_cca_dias = processo_out.sla_cca_horas // 24
    processo_out.sla_owner = _normalize_sla_owner(processo.sla_owner)

    return ProcessoFullOut(
        processo=processo_out,
        cliente=ClienteOut.model_validate(cliente),
        documentos=[DocumentoOut.model_validate(doc) for doc in documentos],
    )


@app.patch("/app/api/processos/{processo_id}", response_model=ProcessoOut)
def app_patch_processo(
    processo_id: uuid.UUID,
    payload: ProcessoUpdate,
    _: dict[str, Any] = Depends(require_roles(ROLE_ANALISTA)),
    db: Session = Depends(get_db),
):
    processo = db.get(Processo, processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo nao encontrado")

    changes = payload.model_dump(exclude_unset=True)
    sla_trigger: Optional[str] = None
    for field, value in changes.items():
        if field == "status_credito":
            status_credito = _process_credit_status(value)
            processo.status_credito = status_credito
            if status_credito == "PENDENCIADO":
                sla_trigger = "analista_pendenciou"
        elif field == "status_geral":
            status_geral = _process_geral_status(value)
            processo.status_geral = status_geral
            if status_geral == "PENDENCIADO":
                sla_trigger = "analista_pendenciou"
        elif field == "status_cca":
            processo.status_cca = _process_caixa_status(value)
        elif field == "status_agehab":
            processo.status_agehab = _process_agehab_status(value)
        elif field == "status_sinal":
            status_sinal = _process_sinal_status(value)
            processo.status_sinal = status_sinal
            processo.pendente_sinal = status_sinal == "PENDENTE"
        elif field == "status_fiador":
            status_fiador = _process_fiador_status(value)
            processo.status_fiador = status_fiador
            processo.pendente_fiador = status_fiador == "PENDENTE"
        elif field == "cca_responsavel":
            username = _normalize_username(value)
            if not username:
                processo.cca_responsavel = None
            else:
                cca_user = _get_user_by_username(db, username)
                if not cca_user or _normalize_role(cca_user.role) != ROLE_CCA or not cca_user.is_active:
                    raise HTTPException(status_code=422, detail="CCA invalido")
                processo.cca_responsavel = cca_user.username
        elif field in {"sla_credito_dias", "sla_corretor_dias", "sla_cca_dias"}:
            # SLA passa a ser calculado automaticamente pelo backend.
            continue
        else:
            setattr(processo, field, value)

    _apply_sla_rules(
        processo,
        trigger=sla_trigger,
        has_enviado_docs=_process_has_enviado_docs(db, processo.id),
    )

    db.commit()
    db.refresh(processo)

    now = _utcnow()
    processo_out = ProcessoOut.model_validate(processo)
    processo_out.sla_corretor_horas = _compute_sla_hours(processo, SLA_OWNER_CORRETOR, now)
    processo_out.sla_analista_horas = _compute_sla_hours(processo, SLA_OWNER_ANALISTA, now)
    processo_out.sla_cca_horas = _compute_sla_hours(processo, SLA_OWNER_CCA, now)
    processo_out.sla_corretor_dias = processo_out.sla_corretor_horas // 24
    processo_out.sla_credito_dias = processo_out.sla_analista_horas // 24
    processo_out.sla_cca_dias = processo_out.sla_cca_horas // 24
    processo_out.sla_owner = _normalize_sla_owner(processo.sla_owner)
    return processo_out


@app.put("/app/api/processos/{processo_id}/documentos", response_model=list[DocumentoOut])
def app_bulk_upsert_documentos(
    processo_id: uuid.UUID,
    payload: DocumentoBulkUpsert,
    session: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    processo = db.get(Processo, processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo nao encontrado")

    role = _normalize_role(str(session.get("role", "")))
    username = _normalize_username(str(session.get("username", "")))
    if role == ROLE_CORRETOR:
        cliente = db.get(Cliente, processo.cliente_id)
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente nao encontrado")
        if _normalize_username(cliente.corretor) != username:
            raise HTTPException(status_code=403, detail="Sem permissao para atualizar este processo")
    if role == ROLE_CCA:
        if _normalize_username(processo.cca_responsavel) != username:
            raise HTTPException(status_code=403, detail="Sem permissao para atualizar este processo")
        raise HTTPException(status_code=403, detail="Perfil CCA possui acesso somente leitura nesta tela")

    if not payload.documentos:
        raise HTTPException(status_code=422, detail="Lista de documentos vazia")

    dedup_map: dict[tuple[str, str], DocumentoBulkItem] = {}
    for item in payload.documentos:
        categoria = item.categoria.strip()
        nome = item.nome.strip()
        if not categoria or not nome:
            continue
        dedup_map[(categoria, nome)] = item

    if not dedup_map:
        raise HTTPException(status_code=422, detail="Nenhum documento valido para salvar")

    can_update_credit = role == ROLE_ANALISTA

    for categoria, nome in dedup_map:
        item = dedup_map[(categoria, nome)]
        documento = (
            db.query(Documento)
            .filter(
                Documento.processo_id == processo_id,
                Documento.categoria == categoria,
                Documento.nome == nome,
            )
            .first()
        )

        status_doc = _doc_status(item.status_doc) if item.status_doc is not None else None
        status_credito = (
            _credit_status(item.status_credito)
            if can_update_credit and item.status_credito is not None
            else None
        )

        if documento:
            if status_doc is not None:
                if not (role == ROLE_CORRETOR and documento.status_doc == "ENVIADO"):
                    documento.status_doc = status_doc
            if status_credito is not None:
                documento.status_credito = status_credito
        else:
            db.add(
                Documento(
                    processo_id=processo_id,
                    categoria=categoria,
                    nome=nome,
                    status_doc=status_doc or "PENDENTE",
                    status_credito=status_credito or "ANALISE",
                )
            )

    db.flush()

    documentos = (
        db.query(Documento)
        .filter(Documento.processo_id == processo_id)
        .order_by(Documento.categoria.asc(), Documento.nome.asc())
        .all()
    )
    has_enviado_docs = any(doc.status_doc == "ENVIADO" for doc in documentos)

    sla_trigger: Optional[str] = None
    if role == ROLE_CORRETOR and has_enviado_docs:
        if _status_token(processo.status_credito) == "PENDENCIADO":
            processo.status_credito = "EM_ANALISE"
        if _status_token(processo.status_geral) in {"NOVO", "PENDENCIADO"}:
            processo.status_geral = "EM_ANDAMENTO"
        sla_trigger = "corretor_enviou"

    _apply_sla_rules(processo, trigger=sla_trigger, has_enviado_docs=has_enviado_docs)

    db.commit()
    documentos = (
        db.query(Documento)
        .filter(Documento.processo_id == processo_id)
        .order_by(Documento.categoria.asc(), Documento.nome.asc())
        .all()
    )
    return documentos
