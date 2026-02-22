import os
import io
import csv
import uuid
import logging
import hashlib
import hmac
import secrets
import calendar
import unicodedata
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, create_engine, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker
from sqlalchemy.sql import func

logger = logging.getLogger("sistema_credito")

WEB_DIR = Path(__file__).resolve().parent / "web"

SESSION_COOKIE_NAME = "sc_session"
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "43200"))
SESSION_IDLE_TIMEOUT_SECONDS = int(os.getenv("SESSION_IDLE_TIMEOUT_SECONDS", "1800"))
SESSION_DB_SYNC_INTERVAL_SECONDS = int(os.getenv("SESSION_DB_SYNC_INTERVAL_SECONDS", "60"))
SESSION_IDLE_PASSIVE_PATHS = {
    "/app/api/processos",
}
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() in {"1", "true", "yes"}
CORRETOR_ROUTE_ENABLED = os.getenv("CORRETOR_ROUTE_ENABLED", "false").lower() in {"1", "true", "yes"}
try:
    GESTOR_META_MENSAL = max(0, int(os.getenv("GESTOR_META_MENSAL", "0")))
except ValueError:
    GESTOR_META_MENSAL = 0
META_MENSAL_RUNTIME_KEY = "gestor_meta_mensal"
ROLE_CORRETOR = "corretor"
ROLE_CCA = "cca"
ROLE_ANALISTA = "analista"
ROLE_ADMIN = "admin"
ROLE_GESTOR = "gestor"

VALID_ROLES = {ROLE_CORRETOR, ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN, ROLE_GESTOR}

APP_CCA_USER = os.getenv("APP_CCA_USER", os.getenv("APP_LOGIN_USER", "cca"))
APP_CCA_PASSWORD = os.getenv("APP_CCA_PASSWORD", os.getenv("APP_LOGIN_PASSWORD", "Troque#Cca123"))
APP_ANALISTA_USER = os.getenv("APP_ANALISTA_USER", "analista")
APP_ANALISTA_PASSWORD = os.getenv("APP_ANALISTA_PASSWORD", "Troque#Analista123")
APP_CORRETOR_USER = os.getenv("APP_CORRETOR_USER", "corretor")
APP_CORRETOR_PASSWORD = os.getenv("APP_CORRETOR_PASSWORD", "Troque#Corretor123")
APP_ADMIN_USER = os.getenv("APP_ADMIN_USER", "douglasadm")
APP_ADMIN_PASSWORD = os.getenv("APP_ADMIN_PASSWORD", "Troque#Admin123")
APP_GESTOR_USER = os.getenv("APP_GESTOR_USER", "gestor")
APP_GESTOR_PASSWORD = os.getenv("APP_GESTOR_PASSWORD", "Troque#Gestor123")

PASSWORD_HASH_ITERATIONS = int(os.getenv("PASSWORD_HASH_ITERATIONS", "200000"))
PASSWORD_MIN_LENGTH = int(os.getenv("PASSWORD_MIN_LENGTH", "10"))
PASSWORD_REQUIRE_UPPER = os.getenv("PASSWORD_REQUIRE_UPPER", "true").lower() in {"1", "true", "yes"}
PASSWORD_REQUIRE_LOWER = os.getenv("PASSWORD_REQUIRE_LOWER", "true").lower() in {"1", "true", "yes"}
PASSWORD_REQUIRE_DIGIT = os.getenv("PASSWORD_REQUIRE_DIGIT", "true").lower() in {"1", "true", "yes"}
PASSWORD_REQUIRE_SYMBOL = os.getenv("PASSWORD_REQUIRE_SYMBOL", "true").lower() in {"1", "true", "yes"}
ALLOW_WEAK_SEED_PASSWORDS = os.getenv("ALLOW_WEAK_SEED_PASSWORDS", "false").lower() in {"1", "true", "yes"}
ENABLE_LEGACY_DEMO_USERS = os.getenv("ENABLE_LEGACY_DEMO_USERS", "false").lower() in {"1", "true", "yes"}
ACTIVE_SESSIONS: dict[str, dict[str, Any]] = {}
PROCESS_LIST_CACHE_TTL_SECONDS = int(os.getenv("PROCESS_LIST_CACHE_TTL_SECONDS", "8"))
try:
    FALL_RISK_DAYS = max(1, int(os.getenv("FALL_RISK_DAYS", "15")))
except ValueError:
    FALL_RISK_DAYS = 15
RUNTIME_SCHEMA_REVISION = "2026-02-20-fluxo-v2-import-estagios-v7"
PENDENCIA_INFO_MIN_LENGTH = 0
PROCESS_LIST_CACHE: dict[str, dict[str, Any]] = {}
SEED_USERS_READY = False


def _normalize_username(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def _build_app_users() -> dict[str, dict[str, str]]:
    users: dict[str, dict[str, str]] = {}
    configs = [
        (APP_CORRETOR_USER, APP_CORRETOR_PASSWORD, ROLE_CORRETOR),
        (APP_CCA_USER, APP_CCA_PASSWORD, ROLE_CCA),
        (APP_ANALISTA_USER, APP_ANALISTA_PASSWORD, ROLE_ANALISTA),
        (APP_ADMIN_USER, APP_ADMIN_PASSWORD, ROLE_ADMIN),
        (APP_GESTOR_USER, APP_GESTOR_PASSWORD, ROLE_GESTOR),
    ]
    if ENABLE_LEGACY_DEMO_USERS:
        configs.extend(
            [
                ("Douglas", "1234", ROLE_ANALISTA),
                ("Fabio", "1234", ROLE_CORRETOR),
                ("Endy", "1234", ROLE_CCA),
                ("Douglasadm", "12345", ROLE_ADMIN),
            ]
        )

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


def _warn_default_credentials() -> None:
    defaults = {
        _normalize_username(APP_CORRETOR_USER): ("corretor", "Troque#Corretor123"),
        _normalize_username(APP_CCA_USER): ("cca", "Troque#Cca123"),
        _normalize_username(APP_ANALISTA_USER): ("analista", "Troque#Analista123"),
        _normalize_username(APP_ADMIN_USER): ("admin", "Troque#Admin123"),
        _normalize_username(APP_GESTOR_USER): ("gestor", "Troque#Gestor123"),
    }
    for username, (role, expected_password) in defaults.items():
        configured = APP_USERS.get(username, {}).get("password")
        if configured == expected_password:
            logger.warning("Credencial padrao em uso para perfil '%s'. Troque a senha no ambiente.", role)


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


def _password_policy_error(password: str) -> Optional[str]:
    value = password or ""
    if len(value) < PASSWORD_MIN_LENGTH:
        return f"Senha deve ter ao menos {PASSWORD_MIN_LENGTH} caracteres."
    if PASSWORD_REQUIRE_UPPER and not any(ch.isupper() for ch in value):
        return "Senha deve conter ao menos 1 letra maiuscula."
    if PASSWORD_REQUIRE_LOWER and not any(ch.islower() for ch in value):
        return "Senha deve conter ao menos 1 letra minuscula."
    if PASSWORD_REQUIRE_DIGIT and not any(ch.isdigit() for ch in value):
        return "Senha deve conter ao menos 1 numero."
    if PASSWORD_REQUIRE_SYMBOL and not any(not ch.isalnum() for ch in value):
        return "Senha deve conter ao menos 1 simbolo."
    return None


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
    if role_key == ROLE_GESTOR:
        return "/app/gestor"
    if role_key == ROLE_ANALISTA:
        return "/app/analista"
    if role_key == ROLE_CCA:
        return "/app/cca"
    if role_key == ROLE_CORRETOR:
        return "/app/corretor" if CORRETOR_ROUTE_ENABLED else "/login"
    return "/app/analista"


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
        "db_checked_at": now,
        "expires_at": now + timedelta(seconds=SESSION_TTL_SECONDS),
    }
    return token


def _sync_session_from_db(token: str, session: dict[str, Any]) -> Optional[dict[str, Any]]:
    now = _utcnow()
    if SESSION_DB_SYNC_INTERVAL_SECONDS > 0:
        checked_at = session.get("db_checked_at")
        if isinstance(checked_at, datetime):
            checked_at_utc = checked_at if checked_at.tzinfo else checked_at.replace(tzinfo=timezone.utc)
            if checked_at_utc + timedelta(seconds=SESSION_DB_SYNC_INTERVAL_SECONDS) > now:
                return session

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
        session["db_checked_at"] = now
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


def _process_list_cache_key(
    role: str,
    username: str,
    limit: Optional[int],
    offset: int,
) -> str:
    return f"{role}|{username}|{limit if limit is not None else 'all'}|{offset}"


def _get_cached_process_list(cache_key: str) -> Optional[list["ProcessoOverviewOut"]]:
    if PROCESS_LIST_CACHE_TTL_SECONDS <= 0:
        return None
    cached = PROCESS_LIST_CACHE.get(cache_key)
    if not cached:
        return None
    expires_at = cached.get("expires_at")
    if not isinstance(expires_at, datetime) or expires_at <= _utcnow():
        PROCESS_LIST_CACHE.pop(cache_key, None)
        return None
    data = cached.get("data")
    if isinstance(data, list):
        return data
    return None


def _set_cached_process_list(cache_key: str, data: list["ProcessoOverviewOut"]) -> None:
    if PROCESS_LIST_CACHE_TTL_SECONDS <= 0:
        return
    PROCESS_LIST_CACHE[cache_key] = {
        "data": data,
        "expires_at": _utcnow() + timedelta(seconds=PROCESS_LIST_CACHE_TTL_SECONDS),
    }


def _invalidate_process_list_cache() -> None:
    if PROCESS_LIST_CACHE:
        PROCESS_LIST_CACHE.clear()


def _extract_origin_host(value: Optional[str]) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    parsed = urlparse(raw)
    host = (parsed.netloc or "").strip().lower()
    if host.endswith(":80"):
        host = host[:-3]
    if host.endswith(":443"):
        host = host[:-4]
    return host


def _request_host(request: Request) -> str:
    host = (
        (request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc or "")
        .strip()
        .lower()
    )
    if host.endswith(":80"):
        host = host[:-3]
    if host.endswith(":443"):
        host = host[:-4]
    return host


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

ESTAGIO_COMERCIAL_VALUES = [
    "RESERVA",
    "EM_PROCESSO",
    "CREDITO",
    "SECRETARIA_VENDAS",
    "ASSINATURA_DIRETORIA",
    "AUTORIZACAO_DIRETORIA",
    "ENVIO_SIENGE",
    "VENDA_FINALIZADA",
]
ESTAGIO_COMERCIAL_SET = set(ESTAGIO_COMERCIAL_VALUES)
ESTAGIO_COMERCIAL_INDEX = {value: idx for idx, value in enumerate(ESTAGIO_COMERCIAL_VALUES)}
REPASSE_ETAPAS_VALUES = [
    "EM_REPASSE",
    "INICIO_REPASSE",
    "ASSINATURA_AUTORIZADA",
]
REPASSE_ETAPAS_SET = set(REPASSE_ETAPAS_VALUES)
ESTAGIOS_REPASSE_COMERCIAL = {
    "ASSINATURA_DIRETORIA",
    "AUTORIZACAO_DIRETORIA",
    "ENVIO_SIENGE",
    "VENDA_FINALIZADA",
}
ESTAGIOS_DASH_COMERCIAL = {"EM_PROCESSO", "CREDITO", "SECRETARIA_VENDAS"}
IMPORT_REQUIRED_COLUMNS = {
    "nome_cliente",
    "data_cadastro",
    "estagio",
    "empreendimento",
    "corretor",
    "imobiliaria",
}
IMPORT_COLUMN_ALIASES = {
    "nome": "nome_cliente",
    "cliente": "nome_cliente",
    "nome_cliente": "nome_cliente",
    "nome_do_cliente": "nome_cliente",
    "data": "data_cadastro",
    "data_cadastro": "data_cadastro",
    "data_de_cadastro": "data_cadastro",
    "estagio": "estagio",
    "empreendimento": "empreendimento",
    "obra": "empreendimento",
    "corretor": "corretor",
    "imobiliaria": "imobiliaria",
}

SLA_OWNER_NONE = "NONE"
SLA_OWNER_CORRETOR = "CORRETOR"
SLA_OWNER_ANALISTA = "ANALISTA"
SLA_OWNER_CCA = "CCA"
SLA_OWNER_VALUES = {SLA_OWNER_NONE, SLA_OWNER_CORRETOR, SLA_OWNER_ANALISTA, SLA_OWNER_CCA}


def _status_token(value: Optional[str]) -> str:
    return (value or "").strip().upper()


def _normalize_text_key(value: Optional[str]) -> str:
    text = str(value or "").strip().lower()
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch)).replace(" ", "_")


def _process_estagio_comercial(value: Optional[str], fallback: str = "RESERVA") -> str:
    token = _normalize_text_key(value)
    aliases = {
        "reserva": "RESERVA",
        "processo": "EM_PROCESSO",
        "em_processo": "EM_PROCESSO",
        "credito": "CREDITO",
        "secretaria_vendas": "SECRETARIA_VENDAS",
        "secretaria_de_vendas": "SECRETARIA_VENDAS",
        "assinatura_diretoria": "ASSINATURA_DIRETORIA",
        "aprovacao_diretoria": "AUTORIZACAO_DIRETORIA",
        "aprovacao_da_diretoria": "AUTORIZACAO_DIRETORIA",
        "autorizacao_diretoria": "AUTORIZACAO_DIRETORIA",
        "envio_sienge": "ENVIO_SIENGE",
        "venda_finalizada": "VENDA_FINALIZADA",
    }
    mapped = aliases.get(token, "")
    return mapped if mapped in ESTAGIO_COMERCIAL_SET else fallback


def _process_etapa_repasse(value: Optional[str], fallback: Optional[str] = None) -> Optional[str]:
    token = _normalize_text_key(value)
    aliases = {
        "em_repasse": "EM_REPASSE",
        "inicio_repasse": "INICIO_REPASSE",
        "assinatura_autorizada": "ASSINATURA_AUTORIZADA",
    }
    mapped = aliases.get(token, "")
    if mapped in REPASSE_ETAPAS_SET:
        return mapped
    return fallback


def _should_be_in_repasse(processo: "Processo") -> bool:
    stage = _process_estagio_comercial(getattr(processo, "estagio_comercial", None))
    return stage in ESTAGIOS_REPASSE_COMERCIAL


def _fila_atual_from_processo(processo: "Processo") -> str:
    if _should_be_in_repasse(processo) or _process_etapa_repasse(getattr(processo, "etapa_repasse", None)):
        return "REPASSE"
    return "COMERCIAL"


def _can_set_assinatura_autorizada(processo: "Processo") -> bool:
    stage = _process_estagio_comercial(getattr(processo, "estagio_comercial", None))
    sinal = _process_sinal_status(getattr(processo, "status_sinal", None))
    fiador = _process_fiador_status(getattr(processo, "status_fiador", None))
    agehab = _process_agehab_status(getattr(processo, "status_agehab", None))
    caixa = _process_caixa_status(getattr(processo, "status_cca", None))
    geral = _process_geral_status(getattr(processo, "status_geral", None))
    return (
        stage == "VENDA_FINALIZADA"
        and geral not in {"CANCELADO", "DISTRATO", "REPROVADO"}
        and sinal in {"NAO_TEM", "PAGO"}
        and fiador in {"NAO_TEM", "FINALIZADO"}
        and agehab == "VALIDADO_AGEHAB"
        and caixa in {"AGENDADO", "ASSINATURA_CAIXA"}
    )


def _sync_estagio_repasse_rules(processo: "Processo", now: Optional[datetime] = None) -> None:
    stage = _process_estagio_comercial(getattr(processo, "estagio_comercial", None))
    processo.estagio_comercial = stage
    etapa_repasse = _process_etapa_repasse(getattr(processo, "etapa_repasse", None))
    if stage in ESTAGIOS_REPASSE_COMERCIAL:
        if not etapa_repasse:
            processo.etapa_repasse = "EM_REPASSE"
    else:
        # Se voltou para estagio comercial anterior ao repasse, sai da trilha de repasse.
        # Mantemos etapa apenas quando assinatura de caixa ja foi concluida.
        if etapa_repasse and _status_token(getattr(processo, "status_cca", None)) != "ASSINATURA_CAIXA":
            processo.etapa_repasse = None

    if stage == "RESERVA":
        processo.status_geral = "NOVO"
        processo.status_credito = "EM_ANALISE"
    elif stage == "VENDA_FINALIZADA":
        # Venda finalizada no comercial nao implica assinatura de caixa.
        # A assinatura depende da trilha de repasse e validacoes (sinal/fiador/agehab/cca).
        if _status_token(processo.status_geral) in {"", "NOVO", "PENDENCIADO"}:
            processo.status_geral = "EM_ANDAMENTO"
        if _status_token(processo.status_credito) not in {"APROVADO", "REPROVADO"}:
            processo.status_credito = "APROVADO"
    else:
        processo.status_geral = "EM_ANDAMENTO"
        if _status_token(processo.status_credito) == "REPROVADO":
            processo.status_credito = "EM_ANALISE"


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
    return _status_token(processo.status_cca) == "ANALISE_CCA"


def _is_cca_sla_pendencia_condition(processo: "Processo") -> bool:
    return _status_token(processo.status_cca) == "PENDENTE_CCA" or _status_token(processo.status_agehab) == "PENDENTE_AGEHAB"


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


def _compute_sla_seconds(processo: "Processo", owner: str, now: Optional[datetime] = None) -> int:
    owner_norm = _normalize_sla_owner(owner)
    total_seconds = _get_sla_seconds(processo, owner_norm)
    active_owner = _normalize_sla_owner(getattr(processo, "sla_owner", SLA_OWNER_NONE))
    if owner_norm != SLA_OWNER_NONE and owner_norm == active_owner:
        started_at = _as_utc(getattr(processo, "sla_active_since", None))
        now_utc = _as_utc(now) or _utcnow()
        if started_at and now_utc > started_at:
            total_seconds += int((now_utc - started_at).total_seconds())
    return max(0, total_seconds)


def _compute_sla_hours(processo: "Processo", owner: str, now: Optional[datetime] = None) -> int:
    total_seconds = _compute_sla_seconds(processo, owner, now)
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
        .filter(Documento.processo_id == processo_id, Documento.status_doc.in_(["ENVIADO", "APROVADO", "NAO_APLICA"]))
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

    if trigger_key == "analista_pendenciou":
        _switch_sla_owner(processo, SLA_OWNER_CORRETOR, now_utc)
        return

    if trigger_key == "cca_pendenciou" or _is_cca_sla_pendencia_condition(processo):
        _switch_sla_owner(processo, SLA_OWNER_ANALISTA, now_utc)
        return

    if _is_cca_sla_start_condition(processo):
        _switch_sla_owner(processo, SLA_OWNER_CCA, now_utc)
        return

    if trigger_key == "corretor_enviou" and has_enviado_docs:
        _switch_sla_owner(processo, SLA_OWNER_ANALISTA, now_utc)
        return

    if current_owner == SLA_OWNER_NONE:
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


def _is_pendencia_status(field: str, status_value: Optional[str]) -> bool:
    token = _status_token(status_value)
    if field in {"status_credito", "status_geral"}:
        return token == "PENDENCIADO"
    if field in {"status_cca", "status_agehab"}:
        return token.startswith("PENDENTE_")
    if field in {"status_sinal", "status_fiador"}:
        return token == "PENDENTE"
    return False


def _validate_status_transition(field: str, current_value: Optional[str], next_value: Optional[str]) -> None:
    current = _status_token(current_value)
    nxt = _status_token(next_value)
    if not current or current == nxt:
        return

    if field == "status_geral" and current in PROCESS_GERAL_FINAL_STATUSES and nxt != current:
        # Permite fechamento administrativo apos aprovacao/reprovacao.
        if current in {"APROVADO", "REPROVADO"} and nxt in {"CANCELADO", "DISTRATO"}:
            return
        raise HTTPException(status_code=422, detail="Processo finalizado nao permite reabertura de status geral.")
    if field == "status_cca" and current in PROCESS_CCA_FINAL_STATUSES and nxt != current:
        raise HTTPException(status_code=422, detail="Status Caixa finalizado nao permite reabertura.")
    if field == "status_geral" and current == "NOVO" and nxt in {"APROVADO", "REPROVADO"}:
        raise HTTPException(status_code=422, detail="Status geral nao pode ir de NOVO direto para resultado final.")


def _stringify_audit_value(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, datetime):
        return _as_utc(value).isoformat() if _as_utc(value) else value.isoformat()
    text = str(value).strip()
    return text or None


def _doc_status(value: Optional[str], fallback: str = "PENDENTE") -> str:
    raw = (value or "").strip().upper()
    aliases = {
        "NAO APLICA": "NAO_APLICA",
        "N/A": "NAO_APLICA",
    }
    raw = aliases.get(raw, raw)
    allowed = {"PENDENTE", "ENVIADO", "APROVADO", "NAO_APLICA"}
    return raw if raw in allowed else fallback


def _doc_is_done(status_doc: Optional[str]) -> bool:
    token = _doc_status(status_doc, fallback="PENDENTE")
    return token in {"ENVIADO", "APROVADO", "NAO_APLICA"}


def _credit_status(value: Optional[str], fallback: str = "ANALISE") -> str:
    raw = (value or "").strip().upper()
    aliases = {
        "EM_ANALISE": "ANALISE",
        "EM ANALISE": "ANALISE",
        "AGUARDANDO ENVIO": "AGUARDANDO_ENVIO",
        "NAO APLICA": "NAO_APLICA",
        "N/A": "NAO_APLICA",
    }
    raw = aliases.get(raw, raw)
    allowed = {"AGUARDANDO_ENVIO", "ANALISE", "PENDENCIADO", "APROVADO", "REPROVADO", "NAO_APLICA"}
    return raw if raw in allowed else fallback


def _normalize_pendencia_info(value: Optional[str]) -> Optional[str]:
    text = " ".join(str(value or "").strip().split())
    return text or None


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


def _ensure_default_documentos(db: Session, processo_id: uuid.UUID, *, autocommit: bool = True) -> None:
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
                status_credito="AGUARDANDO_ENVIO",
            )
        )
        created = True

    if created and autocommit:
        db.commit()


class Base(DeclarativeBase):
    pass


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    corretor: Mapped[Optional[str]] = mapped_column(Text)
    obra: Mapped[Optional[str]] = mapped_column(Text)
    imobiliaria: Mapped[Optional[str]] = mapped_column(Text)
    data_cadastro_origem: Mapped[Optional[date]] = mapped_column(Date)
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
    estagio_comercial: Mapped[str] = mapped_column(String(40), nullable=False, default="RESERVA")
    etapa_repasse: Mapped[Optional[str]] = mapped_column(String(40))
    cca_responsavel: Mapped[Optional[str]] = mapped_column(String(120))
    pendente_fiador: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pendente_sinal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    nao_contar_mes: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
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
    status_credito: Mapped[str] = mapped_column(String, nullable=False, default="AGUARDANDO_ENVIO")
    pendencia_info: Mapped[Optional[str]] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    processo: Mapped["Processo"] = relationship(back_populates="documentos")


class ProcessoEvento(Base):
    __tablename__ = "processo_eventos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    processo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("processos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_username: Mapped[str] = mapped_column(String(120), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(20), nullable=False, default="system")
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    field_name: Mapped[Optional[str]] = mapped_column(String(100))
    old_value: Mapped[Optional[str]] = mapped_column(Text)
    new_value: Mapped[Optional[str]] = mapped_column(Text)
    details: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class SistemaLog(Base):
    __tablename__ = "sistema_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_username: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    actor_role: Mapped[str] = mapped_column(String(20), nullable=False, default="system", index=True)
    tela: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    acao: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entidade_tipo: Mapped[Optional[str]] = mapped_column(String(60))
    entidade_id: Mapped[Optional[str]] = mapped_column(String(120))
    details: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


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
    imobiliaria: Optional[str] = None
    data_cadastro_origem: Optional[date] = None


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
    estagio_comercial: Optional[str] = None
    etapa_repasse: Optional[str] = None
    cca_responsavel: Optional[str] = None
    pendente_fiador: Optional[bool] = None
    pendente_sinal: Optional[bool] = None
    nao_contar_mes: Optional[bool] = None
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
    estagio_comercial: str
    etapa_repasse: Optional[str] = None
    fila_atual: Optional[str] = None
    cca_responsavel: Optional[str] = None
    pendente_fiador: bool
    pendente_sinal: bool
    nao_contar_mes: bool
    sla_credito_dias: Optional[int] = None
    sla_corretor_dias: Optional[int] = None
    sla_cca_dias: Optional[int] = None
    sla_analista_horas: Optional[int] = None
    sla_corretor_horas: Optional[int] = None
    sla_cca_horas: Optional[int] = None
    sla_analista_seconds: Optional[int] = None
    sla_corretor_seconds: Optional[int] = None
    sla_cca_seconds: Optional[int] = None
    sla_owner: Optional[str] = None
    sla_active_since: Optional[datetime] = None
    observacao: Optional[str] = None
    created_at: Optional[datetime] = None


class DocumentoCreate(BaseModel):
    processo_id: uuid.UUID
    categoria: str
    nome: str


class DocumentoUpdate(BaseModel):
    status_doc: Optional[str] = None
    status_credito: Optional[str] = None
    pendencia_info: Optional[str] = None


class DocumentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    processo_id: uuid.UUID
    categoria: str
    nome: str
    status_doc: str
    status_credito: str
    pendencia_info: Optional[str] = None


class ProcessoEventoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    processo_id: uuid.UUID
    actor_username: str
    actor_role: str
    event_type: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime


class SistemaLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    actor_username: str
    actor_role: str
    tela: str
    acao: str
    entidade_tipo: Optional[str] = None
    entidade_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime


class ProcessoMetricasFunnelOut(BaseModel):
    novo: int
    em_andamento: int
    pendenciado: int
    aprovado: int
    reprovado: int
    distrato: int
    cancelado: int


class ProcessoMetricasSlaOut(BaseModel):
    analista_alerta_24h: int
    analista_critico_48h: int
    corretor_alerta_24h: int
    corretor_critico_48h: int
    cca_alerta_24h: int
    cca_critico_48h: int


class ProcessoMetricasQualidadeOut(BaseModel):
    processos_com_pendencia: int
    first_pass_yield_percent: float
    media_retrabalho_por_processo: float


class ProcessoMetricasOut(BaseModel):
    total_processos: int
    funnel: ProcessoMetricasFunnelOut
    sla: ProcessoMetricasSlaOut
    qualidade: ProcessoMetricasQualidadeOut
    updated_at: datetime


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
    imobiliaria: Optional[str] = None
    data_cadastro_origem: Optional[date] = None
    estagio_comercial: Optional[str] = None


class ProcessoOverviewOut(BaseModel):
    processo_id: uuid.UUID
    cliente_id: uuid.UUID
    cliente_nome: str
    corretor: Optional[str] = None
    obra: Optional[str] = None
    imobiliaria: Optional[str] = None
    status_credito: str
    status_geral: str
    status_cca: str
    status_agehab: str
    status_sinal: str
    status_fiador: str
    estagio_comercial: str
    etapa_repasse: Optional[str] = None
    fila_atual: Optional[str] = None
    cca_responsavel: Optional[str] = None
    pendente_fiador: bool
    pendente_sinal: bool
    nao_contar_mes: bool
    sla_credito_dias: Optional[int] = None
    sla_corretor_dias: Optional[int] = None
    sla_cca_dias: Optional[int] = None
    sla_analista_horas: Optional[int] = None
    sla_corretor_horas: Optional[int] = None
    sla_cca_horas: Optional[int] = None
    sla_analista_seconds: Optional[int] = None
    sla_corretor_seconds: Optional[int] = None
    sla_cca_seconds: Optional[int] = None
    sla_owner: Optional[str] = None
    sla_active_since: Optional[datetime] = None
    data_cadastro_origem: Optional[date] = None
    created_at: Optional[datetime] = None


class ImportPlanilhaRowOut(BaseModel):
    linha: int
    nome_cliente: Optional[str] = None
    status: str
    motivo: Optional[str] = None


class ImportPlanilhaOut(BaseModel):
    ok: bool
    total_linhas: int
    importados: int
    ignorados_existentes: int
    invalidados: int
    resultados: list[ImportPlanilhaRowOut]


class GestorMetaPayload(BaseModel):
    meta: int


class GestorMetaOut(BaseModel):
    meta: int
    fonte: str


class ProcessoFullOut(BaseModel):
    processo: ProcessoOut
    cliente: ClienteOut
    documentos: list[DocumentoOut]


class DocumentoBulkItem(BaseModel):
    categoria: str
    nome: str
    status_doc: Optional[str] = None
    status_credito: Optional[str] = None
    pendencia_info: Optional[str] = None


class DocumentoBulkUpsert(BaseModel):
    documentos: list[DocumentoBulkItem]


def _record_processo_event(
    db: Session,
    *,
    processo_id: uuid.UUID,
    actor_username: str,
    actor_role: str,
    event_type: str,
    field_name: Optional[str] = None,
    old_value: Any = None,
    new_value: Any = None,
    details: Optional[str] = None,
) -> None:
    role_raw = (actor_role or "").strip().lower()
    db.add(
        ProcessoEvento(
            processo_id=processo_id,
            actor_username=_normalize_username(actor_username) or "system",
            actor_role=role_raw if role_raw in VALID_ROLES else "system",
            event_type=(event_type or "").strip().upper() or "EVENT",
            field_name=(field_name or "").strip() or None,
            old_value=_stringify_audit_value(old_value),
            new_value=_stringify_audit_value(new_value),
            details=(details or "").strip() or None,
        )
    )


def _record_system_log(
    db: Session,
    *,
    actor_username: str,
    actor_role: str,
    tela: str,
    acao: str,
    entidade_tipo: Optional[str] = None,
    entidade_id: Optional[str] = None,
    details: Optional[str] = None,
) -> None:
    role_raw = (actor_role or "").strip().lower()
    db.add(
        SistemaLog(
            actor_username=_normalize_username(actor_username) or "system",
            actor_role=role_raw if role_raw in VALID_ROLES else "system",
            tela=(tela or "").strip().lower() or "sistema",
            acao=(acao or "").strip().upper() or "EVENT",
            entidade_tipo=(entidade_tipo or "").strip().lower() or None,
            entidade_id=(entidade_id or "").strip() or None,
            details=(details or "").strip() or None,
        )
    )


def _processo_has_pendencia(processo: "Processo") -> bool:
    status_values = {
        "status_credito": processo.status_credito,
        "status_geral": processo.status_geral,
        "status_cca": processo.status_cca,
        "status_agehab": processo.status_agehab,
        "status_sinal": processo.status_sinal,
        "status_fiador": processo.status_fiador,
    }
    return any(_is_pendencia_status(field, value) for field, value in status_values.items())


def _query_processos_by_scope(db: Session, role: str, username: str):
    query = db.query(Processo)
    if role == ROLE_CORRETOR:
        if not username:
            return query.filter(text("1=0"))
        query = query.join(Cliente, Processo.cliente_id == Cliente.id).filter(
            func.lower(func.trim(func.coalesce(Cliente.corretor, ""))) == username
        )
    elif role == ROLE_CCA:
        if not username:
            return query.filter(text("1=0"))
        query = query.filter(func.lower(func.trim(func.coalesce(Processo.cca_responsavel, ""))) == username)
    return query


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


def _ensure_seed_users(db: Session, force: bool = False) -> None:
    global SEED_USERS_READY
    if SEED_USERS_READY and not force:
        return

    seeds = []
    for username, account in APP_USERS.items():
        seeds.append((username, account["password"], _normalize_role(account["role"])))
    admin_seed_username = _normalize_username(APP_ADMIN_USER)

    created = 0
    changed = 0
    for username, password, role in seeds:
        policy_error = _password_policy_error(password)
        if policy_error and not ALLOW_WEAK_SEED_PASSWORDS:
            logger.warning("Seed ignorado para usuario '%s': %s", username, policy_error)
            continue
        if policy_error:
            logger.warning("Senha fraca em usuario seed '%s': %s", username, policy_error)

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
    SEED_USERS_READY = True


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


def _normalize_cliente_key(value: Optional[str]) -> str:
    raw = " ".join((value or "").strip().lower().split())
    if not raw:
        return ""
    normalized = unicodedata.normalize("NFKD", raw)
    ascii_text = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return " ".join(ascii_text.split())


def _parse_import_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)):
        serial = int(value)
        if 1 <= serial <= 60000:
            # Excel serial date (compatible with 1900 date system).
            return (datetime(1899, 12, 30) + timedelta(days=serial)).date()
        return None

    raw = str(value).strip()
    if not raw:
        return None
    try:
        numeric = float(raw.replace(",", "."))
        serial = int(numeric)
        if 1 <= serial <= 60000:
            return (datetime(1899, 12, 30) + timedelta(days=serial)).date()
    except ValueError:
        pass
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _normalize_import_header(value: Any) -> str:
    token = _normalize_text_key(str(value or ""))
    return IMPORT_COLUMN_ALIASES.get(token, token)


def _canonicalize_import_rows(raw_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for raw in raw_rows:
        item: dict[str, Any] = {}
        for key, value in (raw or {}).items():
            canonical = _normalize_import_header(key)
            if canonical in IMPORT_REQUIRED_COLUMNS:
                item[canonical] = value
        rows.append(item)
    return rows


def _parse_csv_import(content: bytes) -> list[dict[str, Any]]:
    text_value = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text_value))
    return [dict(row) for row in reader if row is not None]


def _parse_xlsx_import(content: bytes) -> list[dict[str, Any]]:
    try:
        from openpyxl import load_workbook  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=422,
            detail="Importacao XLSX indisponivel no servidor. Instale a dependencia openpyxl.",
        ) from exc

    wb = load_workbook(io.BytesIO(content), data_only=True, read_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)
    header_row = next(rows_iter, None)
    if not header_row:
        return []
    headers = [str(cell or "").strip() for cell in header_row]
    rows: list[dict[str, Any]] = []
    for values in rows_iter:
        item: dict[str, Any] = {}
        for idx, header in enumerate(headers):
            if not header:
                continue
            item[header] = values[idx] if idx < len(values) else None
        rows.append(item)
    return rows


def _load_import_rows(filename: Optional[str], content: bytes) -> list[dict[str, Any]]:
    name = (filename or "").lower().strip()
    if name.endswith(".csv"):
        return _canonicalize_import_rows(_parse_csv_import(content))
    if name.endswith(".xlsx"):
        return _canonicalize_import_rows(_parse_xlsx_import(content))
    raise HTTPException(status_code=422, detail="Formato nao suportado. Envie arquivo .csv ou .xlsx.")


def _set_runtime_meta(db: Session, key: str, value: str) -> None:
    table_exists = db.execute(text("SELECT to_regclass('public.app_runtime_meta')")).scalar()
    if not table_exists:
        return
    db.execute(
        text(
            """
            INSERT INTO app_runtime_meta (meta_key, meta_value, updated_at)
            VALUES (:key, :value, NOW())
            ON CONFLICT (meta_key) DO UPDATE
            SET meta_value = EXCLUDED.meta_value,
                updated_at = NOW()
            """
        ),
        {"key": key, "value": value},
    )


def _get_runtime_meta(db: Session, key: str) -> Optional[str]:
    table_exists = db.execute(text("SELECT to_regclass('public.app_runtime_meta')")).scalar()
    if not table_exists:
        return None
    return db.execute(
        text("SELECT meta_value FROM app_runtime_meta WHERE meta_key = :key"),
        {"key": key},
    ).scalar()


def _resolve_gestor_meta_mensal(db: Session) -> tuple[int, str]:
    runtime_value = _get_runtime_meta(db, META_MENSAL_RUNTIME_KEY)
    if runtime_value is not None:
        try:
            return max(0, int(str(runtime_value).strip() or "0")), "runtime"
        except ValueError:
            pass
    return GESTOR_META_MENSAL, "env"


def _reconcile_active_sla_timers(db: Session, now: Optional[datetime] = None) -> int:
    now_utc = _as_utc(now) or _utcnow()
    processos = (
        db.query(Processo)
        .filter(Processo.sla_owner != SLA_OWNER_NONE, Processo.sla_active_since.isnot(None))
        .all()
    )
    reconciled = 0
    for processo in processos:
        _accrue_current_sla(processo, now_utc)
        _refresh_sla_snapshots(processo, now_utc)
        reconciled += 1

    if reconciled:
        db.commit()
        _invalidate_process_list_cache()
    return reconciled


def _ensure_runtime_schema(db: Session) -> None:
    processos_table = db.execute(text("SELECT to_regclass('public.processos')")).scalar()
    if not processos_table:
        return

    clientes_table = db.execute(text("SELECT to_regclass('public.clientes')")).scalar()
    documentos_table = db.execute(text("SELECT to_regclass('public.documentos')")).scalar()

    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS app_runtime_meta (
                meta_key TEXT PRIMARY KEY,
                meta_value TEXT NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS processo_eventos (
                id UUID PRIMARY KEY,
                processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
                actor_username TEXT NOT NULL,
                actor_role VARCHAR(20) NOT NULL DEFAULT 'system',
                event_type VARCHAR(50) NOT NULL,
                field_name VARCHAR(100),
                old_value TEXT,
                new_value TEXT,
                details TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS sistema_logs (
                id UUID PRIMARY KEY,
                actor_username TEXT NOT NULL,
                actor_role VARCHAR(20) NOT NULL DEFAULT 'system',
                tela VARCHAR(60) NOT NULL,
                acao VARCHAR(80) NOT NULL,
                entidade_tipo VARCHAR(60),
                entidade_id VARCHAR(120),
                details TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )

    statements = [
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS status_credito VARCHAR(30) DEFAULT 'EM_ANALISE'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS status_sinal VARCHAR(30) DEFAULT 'NAO_TEM'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS status_fiador VARCHAR(30) DEFAULT 'NAO_TEM'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS estagio_comercial VARCHAR(40) DEFAULT 'RESERVA'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS etapa_repasse VARCHAR(40)",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS cca_responsavel VARCHAR(120)",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS nao_contar_mes BOOLEAN DEFAULT FALSE",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_cca_dias INTEGER",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_owner VARCHAR(20) DEFAULT 'NONE'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_active_since TIMESTAMPTZ",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_analista_seconds INTEGER DEFAULT 0",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_corretor_seconds INTEGER DEFAULT 0",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_cca_seconds INTEGER DEFAULT 0",
    ]
    for stmt in statements:
        db.execute(text(stmt))
    db.execute(text("UPDATE processos SET nao_contar_mes = FALSE WHERE nao_contar_mes IS NULL"))

    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_created_at ON processos (created_at DESC)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_cliente_id ON processos (cliente_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_status_geral ON processos (status_geral)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_status_credito ON processos (status_credito)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_status_cca ON processos (status_cca)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_status_agehab ON processos (status_agehab)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_estagio_comercial ON processos (estagio_comercial)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_etapa_repasse ON processos (etapa_repasse)"))
    db.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_processos_cca_responsavel_norm
            ON processos ((LOWER(TRIM(COALESCE(cca_responsavel, '')))))
            """
        )
    )

    if clientes_table:
        db.execute(text("ALTER TABLE clientes DROP COLUMN IF EXISTS reserva"))
        db.execute(text("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS imobiliaria TEXT"))
        db.execute(text("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS data_cadastro_origem DATE"))
        db.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_clientes_corretor_norm
                ON clientes ((LOWER(TRIM(COALESCE(corretor, '')))))
                """
            )
        )

    if documentos_table:
        db.execute(text("ALTER TABLE documentos ADD COLUMN IF NOT EXISTS pendencia_info TEXT"))
        db.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_documentos_processo_categoria_nome
                ON documentos (processo_id, categoria, nome)
                """
            )
        )
        db.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_documentos_processo_status_doc
                ON documentos (processo_id, status_doc)
                """
            )
        )
        db.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_documentos_processo_status_credito
                ON documentos (processo_id, status_credito)
                """
            )
        )

    db.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_processo_eventos_processo_created_at
            ON processo_eventos (processo_id, created_at DESC)
            """
        )
    )
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processo_eventos_created_at ON processo_eventos (created_at DESC)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_sistema_logs_created_at ON sistema_logs (created_at DESC)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_sistema_logs_actor_username ON sistema_logs (LOWER(TRIM(actor_username)))"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_sistema_logs_tela ON sistema_logs (LOWER(TRIM(tela)))"))

    current_revision = db.execute(
        text("SELECT meta_value FROM app_runtime_meta WHERE meta_key = 'runtime_schema_revision'")
    ).scalar()
    if current_revision == RUNTIME_SCHEMA_REVISION:
        db.commit()
        return

    if documentos_table:
        db.execute(
            text(
                """
                UPDATE documentos
                SET status_credito = CASE
                    WHEN UPPER(COALESCE(status_credito, '')) IN ('PENDENCIADO', 'APROVADO', 'REPROVADO', 'NAO_APLICA') THEN UPPER(status_credito)
                    WHEN UPPER(COALESCE(status_credito, '')) IN ('AGUARDANDO_ENVIO', 'AGUARDANDO ENVIO') THEN 'AGUARDANDO_ENVIO'
                    WHEN UPPER(COALESCE(status_doc, '')) = 'NAO_APLICA' THEN 'NAO_APLICA'
                    WHEN UPPER(COALESCE(status_doc, '')) = 'PENDENTE' THEN 'AGUARDANDO_ENVIO'
                    ELSE 'ANALISE'
                END
                """
            )
        )

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
            SET estagio_comercial = CASE
                WHEN UPPER(COALESCE(estagio_comercial, '')) IN (
                    'RESERVA', 'EM_PROCESSO', 'CREDITO', 'SECRETARIA_VENDAS',
                    'ASSINATURA_DIRETORIA', 'AUTORIZACAO_DIRETORIA', 'ENVIO_SIENGE', 'VENDA_FINALIZADA'
                ) THEN UPPER(estagio_comercial)
                WHEN UPPER(COALESCE(status_geral, '')) IN ('NOVO') THEN 'RESERVA'
                WHEN UPPER(COALESCE(status_geral, '')) IN ('APROVADO') THEN 'VENDA_FINALIZADA'
                WHEN UPPER(COALESCE(status_cca, '')) IN ('ASSINATURA_CAIXA') THEN 'VENDA_FINALIZADA'
                ELSE 'EM_PROCESSO'
            END
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE processos
            SET etapa_repasse = CASE
                WHEN UPPER(COALESCE(etapa_repasse, '')) IN ('EM_REPASSE', 'INICIO_REPASSE', 'ASSINATURA_AUTORIZADA')
                    THEN UPPER(etapa_repasse)
                WHEN UPPER(COALESCE(estagio_comercial, '')) IN ('ASSINATURA_DIRETORIA', 'AUTORIZACAO_DIRETORIA', 'ENVIO_SIENGE', 'VENDA_FINALIZADA')
                    THEN 'EM_REPASSE'
                ELSE NULL
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
    db.execute(
        text(
            """
            UPDATE processos
            SET sla_owner = 'ANALISTA',
                sla_active_since = COALESCE(sla_active_since, NOW())
            WHERE UPPER(COALESCE(sla_owner, 'NONE')) = 'NONE'
              AND UPPER(COALESCE(status_geral, '')) NOT IN ('APROVADO', 'REPROVADO', 'DISTRATO', 'CANCELADO')
              AND UPPER(COALESCE(status_cca, '')) NOT IN ('ASSINATURA_CAIXA', 'FINALIZADO')
            """
        )
    )
    db.execute(
        text(
            """
            INSERT INTO app_runtime_meta (meta_key, meta_value, updated_at)
            VALUES ('runtime_schema_revision', :revision, NOW())
            ON CONFLICT (meta_key) DO UPDATE
            SET meta_value = EXCLUDED.meta_value,
                updated_at = NOW()
            """
        ),
        {"revision": RUNTIME_SCHEMA_REVISION},
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

    _warn_default_credentials()

    if not SESSION_COOKIE_SECURE:
        logger.warning("SESSION_COOKIE_SECURE=false. Use true em producao com HTTPS.")

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
                    now_utc = _utcnow()
                    _set_runtime_meta(db, "sla_runtime_started_at", now_utc.isoformat())
                    reconciled = _reconcile_active_sla_timers(db, now_utc)
                    _set_runtime_meta(db, "sla_runtime_last_reconcile_count", str(reconciled))
                    db.commit()
                finally:
                    db.close()
        except SQLAlchemyError:
            logger.exception("Falha ao preparar tabela de usuarios da aplicacao.")
            if os.getenv("STARTUP_DB_STRICT", "false").lower() in {"1", "true", "yes"}:
                raise
    try:
        yield
    finally:
        if SessionLocal is not None:
            db = SessionLocal()
            try:
                _set_runtime_meta(db, "sla_runtime_stopped_at", _utcnow().isoformat())
                db.commit()
            except SQLAlchemyError:
                db.rollback()
                logger.exception("Falha ao registrar checkpoint de parada do runtime.")
            finally:
                db.close()


app = FastAPI(title="Sistema Credito API", lifespan=lifespan)


@app.middleware("http")
async def enforce_same_origin_for_write_requests(request: Request, call_next):
    method = (request.method or "").upper()
    path = (request.url.path or "").rstrip("/") or "/"
    if method in {"POST", "PUT", "PATCH", "DELETE"} and (path.startswith("/app/api/") or path.startswith("/auth/")):
        origin_host = _extract_origin_host(request.headers.get("origin"))
        if not origin_host:
            origin_host = _extract_origin_host(request.headers.get("referer"))
        if origin_host:
            req_host = _request_host(request)
            if req_host and origin_host != req_host:
                return JSONResponse(status_code=403, content={"detail": "Origem invalida para operacao autenticada."})
    return await call_next(request)


@app.get("/")
def root(request: Request):
    accept = (request.headers.get("accept") or "").lower()
    if "text/html" in accept:
        return RedirectResponse(url="/app", status_code=302)
    return {"service": "sistema-credito-api", "status": "ok"}


def _html_page(filename: str) -> FileResponse:
    response = FileResponse(WEB_DIR / filename)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.get("/login")
def login_page(request: Request):
    session = _read_session(request)
    if session:
        return RedirectResponse(url=_home_for_session(session), status_code=302)
    return _html_page("login.html")


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
    return _html_page("cca.html")


@app.get("/app/checklist")
def app_checklist_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role not in {ROLE_ANALISTA, ROLE_CCA, ROLE_ADMIN}:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return _html_page("checklist.html")


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
    if not CORRETOR_ROUTE_ENABLED:
        token = request.cookies.get(SESSION_COOKIE_NAME)
        if token:
            ACTIVE_SESSIONS.pop(token, None)
        response = RedirectResponse(url="/login", status_code=302)
        response.delete_cookie(key=SESSION_COOKIE_NAME)
        return response
    return _html_page("corretor_painel.html")


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

    return _html_page("analista_painel.html")


@app.get("/app/analista/acompanhamento")
def app_analista_acompanhamento_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role != ROLE_ANALISTA:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return _html_page("analista_acompanhamento.html")


@app.get("/app/analista/repasse")
def app_analista_repasse_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role != ROLE_ANALISTA:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return _html_page("analista_repasse.html")


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
    return _html_page("analista.html")


@app.get("/app/analista/importacao")
def app_analista_importacao_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role != ROLE_ANALISTA:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return _html_page("analista_importacao.html")


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
    return _html_page("admin.html")


@app.get("/app/gestor")
def app_gestor_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role not in {ROLE_GESTOR, ROLE_ADMIN}:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return _html_page("gestor.html")


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
    return _html_page("change_password.html")


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
    normalized_role = _normalize_role(user.role)
    if normalized_role == ROLE_CORRETOR and not CORRETOR_ROUTE_ENABLED:
        raise HTTPException(status_code=403, detail="Acesso do perfil corretor esta inativo no momento.")

    user.last_login_at = _utcnow()
    db.commit()
    db.refresh(user)

    token = _new_session(
        user_id=user.id,
        username=user.username,
        role=normalized_role,
        must_change_password=bool(user.must_change_password),
    )
    home = "/app/trocar-senha" if user.must_change_password else _home_for_role(user.role)
    response = JSONResponse(
        {
            "ok": True,
            "username": user.username,
            "role": normalized_role,
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
    policy_error = _password_policy_error(new_password)
    if policy_error:
        raise HTTPException(status_code=422, detail=policy_error)

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
        ACTIVE_SESSIONS[token]["db_checked_at"] = _utcnow()

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
    session: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    username = _normalize_username(payload.username)
    if not username:
        raise HTTPException(status_code=422, detail="Usuario obrigatorio")
    policy_error = _password_policy_error(payload.password or "")
    if policy_error:
        raise HTTPException(status_code=422, detail=policy_error)
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
    db.flush()
    _record_system_log(
        db,
        actor_username=_normalize_username(str(session.get("username", ""))),
        actor_role=_normalize_role(str(session.get("role", ""))),
        tela="admin",
        acao="USUARIO_CRIADO",
        entidade_tipo="usuario",
        entidade_id=str(user.id),
        details=f"username={user.username}; role={user.role}; force_change_password=true",
    )
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
    actor_username = _normalize_username(str(session.get("username", "")))
    actor_role = _normalize_role(str(session.get("role", "")))
    change_notes: list[str] = []

    if payload.role is not None:
        role = (payload.role or "").strip().lower()
        if role not in VALID_ROLES:
            raise HTTPException(status_code=422, detail="Perfil invalido")
        if user.role != role:
            change_notes.append(f"role:{user.role}->{role}")
        user.role = role

    if payload.is_active is not None:
        if current_user_id and current_user_id == str(user.id) and not bool(payload.is_active):
            raise HTTPException(status_code=422, detail="Admin nao pode bloquear a si mesmo")
        if bool(user.is_active) != bool(payload.is_active):
            change_notes.append(f"is_active:{bool(user.is_active)}->{bool(payload.is_active)}")
        user.is_active = bool(payload.is_active)
        if not user.is_active:
            _drop_sessions_for_user(user.id)

    if change_notes:
        _record_system_log(
            db,
            actor_username=actor_username,
            actor_role=actor_role,
            tela="admin",
            acao="USUARIO_ATUALIZADO",
            entidade_tipo="usuario",
            entidade_id=str(user.id),
            details=f"username={user.username}; " + "; ".join(change_notes),
        )

    db.commit()
    db.refresh(user)

    return user


@app.post("/app/api/admin/users/{user_id}/reset-password", response_model=AppUserOut)
def admin_reset_password(
    user_id: uuid.UUID,
    payload: AdminResetPasswordPayload,
    session: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    user = db.get(AppUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    policy_error = _password_policy_error(payload.new_password or "")
    if policy_error:
        raise HTTPException(status_code=422, detail=policy_error)

    _set_user_password(user, payload.new_password, must_change_password=payload.force_change_password)
    _record_system_log(
        db,
        actor_username=_normalize_username(str(session.get("username", ""))),
        actor_role=_normalize_role(str(session.get("role", ""))),
        tela="admin",
        acao="USUARIO_RESET_SENHA",
        entidade_tipo="usuario",
        entidade_id=str(user.id),
        details=f"username={user.username}; force_change_password={bool(payload.force_change_password)}",
    )
    db.commit()
    db.refresh(user)
    _drop_sessions_for_user(user.id)
    return user


@app.get("/app/api/ccas", response_model=list[str])
def app_list_ccas(
    _: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN)),
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
    _: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN)),
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
    session: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    nome = _normalize_empreendimento_nome(payload.nome)
    if not nome:
        raise HTTPException(status_code=422, detail="Nome do empreendimento obrigatorio")

    existing = db.query(Empreendimento).filter(func.lower(Empreendimento.nome) == nome.lower()).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            _record_system_log(
                db,
                actor_username=_normalize_username(str(session.get("username", ""))),
                actor_role=_normalize_role(str(session.get("role", ""))),
                tela="admin",
                acao="EMPREENDIMENTO_REATIVADO",
                entidade_tipo="empreendimento",
                entidade_id=str(existing.id),
                details=f"nome={existing.nome}",
            )
            db.commit()
            db.refresh(existing)
        return existing

    empreendimento = Empreendimento(nome=nome, is_active=True)
    db.add(empreendimento)
    db.flush()
    _record_system_log(
        db,
        actor_username=_normalize_username(str(session.get("username", ""))),
        actor_role=_normalize_role(str(session.get("role", ""))),
        tela="admin",
        acao="EMPREENDIMENTO_CRIADO",
        entidade_tipo="empreendimento",
        entidade_id=str(empreendimento.id),
        details=f"nome={empreendimento.nome}",
    )
    db.commit()
    db.refresh(empreendimento)
    return empreendimento


@app.delete("/app/api/admin/empreendimentos/{empreendimento_id}")
def admin_delete_empreendimento(
    empreendimento_id: uuid.UUID,
    session: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    empreendimento = db.get(Empreendimento, empreendimento_id)
    if not empreendimento:
        raise HTTPException(status_code=404, detail="Empreendimento nao encontrado")
    empreendimento.is_active = False
    _record_system_log(
        db,
        actor_username=_normalize_username(str(session.get("username", ""))),
        actor_role=_normalize_role(str(session.get("role", ""))),
        tela="admin",
        acao="EMPREENDIMENTO_DESATIVADO",
        entidade_tipo="empreendimento",
        entidade_id=str(empreendimento.id),
        details=f"nome={empreendimento.nome}",
    )
    db.commit()
    return {"ok": True}


@app.get("/app/api/admin/logs", response_model=list[SistemaLogOut])
def admin_list_system_logs(
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
    limit: int = Query(default=300, ge=1, le=2000),
    tela: Optional[str] = Query(default=None),
    username: Optional[str] = Query(default=None),
):
    query = db.query(SistemaLog)
    if tela:
        query = query.filter(func.lower(func.trim(SistemaLog.tela)) == tela.strip().lower())
    if username:
        normalized_username = _normalize_username(username)
        if normalized_username:
            query = query.filter(func.lower(func.trim(SistemaLog.actor_username)) == normalized_username)
    return query.order_by(SistemaLog.created_at.desc()).limit(limit).all()


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
def create_cliente(
    payload: ClienteCreate,
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    cliente = Cliente(**payload.model_dump())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@app.get("/api/clientes", response_model=list[ClienteOut])
def list_clientes(
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    return db.query(Cliente).order_by(Cliente.created_at.desc()).all()


@app.post("/api/processos", response_model=ProcessoOut)
def create_processo(
    payload: ProcessoCreate,
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    cliente = db.get(Cliente, payload.cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")

    processo = Processo(cliente_id=payload.cliente_id)
    _switch_sla_owner(processo, SLA_OWNER_ANALISTA, _utcnow())
    db.add(processo)
    db.commit()
    db.refresh(processo)
    _ensure_default_documentos(db, processo.id)
    _invalidate_process_list_cache()
    return processo


@app.get("/api/processos/{processo_id}", response_model=ProcessoOut)
def get_processo(
    processo_id: uuid.UUID,
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    processo = db.get(Processo, processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo nao encontrado")
    return processo


@app.patch("/api/processos/{processo_id}", response_model=ProcessoOut)
def patch_processo(
    processo_id: uuid.UUID,
    payload: ProcessoUpdate,
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    processo = db.get(Processo, processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo nao encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(processo, field, value)

    db.commit()
    db.refresh(processo)
    _invalidate_process_list_cache()
    return processo


@app.post("/api/documentos", response_model=DocumentoOut)
def create_documento(
    payload: DocumentoCreate,
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    processo = db.get(Processo, payload.processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo nao encontrado")

    documento = Documento(**payload.model_dump())
    db.add(documento)
    db.commit()
    db.refresh(documento)
    _invalidate_process_list_cache()
    return documento


@app.get("/api/processos/{processo_id}/documentos", response_model=list[DocumentoOut])
def list_documentos(
    processo_id: uuid.UUID,
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    return db.query(Documento).filter(Documento.processo_id == processo_id).all()


@app.patch("/api/documentos/{documento_id}", response_model=DocumentoOut)
def patch_documento(
    documento_id: uuid.UUID,
    payload: DocumentoUpdate,
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    documento = db.get(Documento, documento_id)
    if not documento:
        raise HTTPException(status_code=404, detail="Documento nao encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(documento, field, value)

    db.commit()
    db.refresh(documento)
    _invalidate_process_list_cache()
    return documento


@app.get("/app/api/processos", response_model=list[ProcessoOverviewOut])
def app_list_processos(
    session: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
    limit: Optional[int] = Query(default=120, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    role = _normalize_role(str(session.get("role", "")))
    username = _normalize_username(str(session.get("username", "")))
    cache_key = _process_list_cache_key(role, username, limit, offset)

    cached = _get_cached_process_list(cache_key)
    if cached is not None:
        return cached

    query = db.query(Processo, Cliente).join(Cliente, Processo.cliente_id == Cliente.id)
    if role == ROLE_CORRETOR:
        if not username:
            return []
        query = query.filter(func.lower(func.trim(func.coalesce(Cliente.corretor, ""))) == username)
    elif role == ROLE_CCA:
        if not username:
            return []
        query = query.filter(func.lower(func.trim(func.coalesce(Processo.cca_responsavel, ""))) == username)

    query = query.order_by(Processo.created_at.desc()).offset(offset)
    if limit is not None:
        query = query.limit(limit)

    rows = query.all()
    now = _utcnow()
    output: list[ProcessoOverviewOut] = []
    for processo, cliente in rows:
        sla_analista_seconds = _compute_sla_seconds(processo, SLA_OWNER_ANALISTA, now)
        sla_corretor_seconds = _compute_sla_seconds(processo, SLA_OWNER_CORRETOR, now)
        sla_cca_seconds = _compute_sla_seconds(processo, SLA_OWNER_CCA, now)
        sla_analista_horas = sla_analista_seconds // 3600
        sla_corretor_horas = sla_corretor_seconds // 3600
        sla_cca_horas = sla_cca_seconds // 3600
        output.append(
            ProcessoOverviewOut(
                processo_id=processo.id,
                cliente_id=cliente.id,
                cliente_nome=cliente.nome,
                corretor=cliente.corretor,
                obra=cliente.obra,
                imobiliaria=getattr(cliente, 'imobiliaria', None),
                status_credito=processo.status_credito,
                status_geral=processo.status_geral,
                status_cca=processo.status_cca,
                status_agehab=processo.status_agehab,
                status_sinal=processo.status_sinal,
                status_fiador=processo.status_fiador,
                estagio_comercial=_process_estagio_comercial(processo.estagio_comercial),
                etapa_repasse=_process_etapa_repasse(processo.etapa_repasse),
                fila_atual=_fila_atual_from_processo(processo),
                cca_responsavel=processo.cca_responsavel,
                pendente_fiador=processo.pendente_fiador,
                pendente_sinal=processo.pendente_sinal,
                nao_contar_mes=bool(getattr(processo, "nao_contar_mes", False)),
                sla_credito_dias=sla_analista_horas // 24,
                sla_corretor_dias=sla_corretor_horas // 24,
                sla_cca_dias=sla_cca_horas // 24,
                sla_analista_horas=sla_analista_horas,
                sla_corretor_horas=sla_corretor_horas,
                sla_cca_horas=sla_cca_horas,
                sla_analista_seconds=sla_analista_seconds,
                sla_corretor_seconds=sla_corretor_seconds,
                sla_cca_seconds=sla_cca_seconds,
                sla_owner=_normalize_sla_owner(processo.sla_owner),
                sla_active_since=_as_utc(processo.sla_active_since),
                data_cadastro_origem=getattr(cliente, "data_cadastro_origem", None),
                created_at=processo.created_at,
            )
        )

    _set_cached_process_list(cache_key, output)
    return output


@app.get("/app/api/gestor/dashboard")
def app_gestor_dashboard(
    _: dict[str, Any] = Depends(require_roles(ROLE_GESTOR, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    rows = db.query(Processo, Cliente).join(Cliente, Processo.cliente_id == Cliente.id).all()
    now = _utcnow()
    total_bruto = len(rows)
    total = 0

    total_comercial = 0
    total_credito = 0
    total_repasse = 0
    total_assinados = 0
    provaveis_cair = 0
    perdas_mes = 0
    nao_contar_mes_total = 0
    chegadas_ultimos_7_dias = 0

    clientes_comercial: list[dict[str, Any]] = []
    clientes_repasse: list[dict[str, Any]] = []
    clientes_assinados: list[dict[str, Any]] = []
    clientes_prontos_repasse: list[dict[str, Any]] = []
    clientes_credito: list[dict[str, Any]] = []
    clientes_perdas_mes: list[dict[str, Any]] = []
    clientes_excluidos_mes: list[dict[str, Any]] = []
    clientes_chegadas_7d: list[dict[str, Any]] = []
    clientes_provaveis_cair: list[dict[str, Any]] = []
    clientes_estagios: list[dict[str, Any]] = []

    imob_map: dict[str, int] = {}
    imob_corretores: dict[str, dict[str, int]] = {}
    start_7d = now.date() - timedelta(days=6)

    sla_comercial_sum = 0
    sla_comercial_count = 0
    sla_credito_sum = 0
    sla_credito_count = 0
    sla_cca_sum = 0
    sla_cca_count = 0
    processo_ids = [processo.id for processo, _ in rows]
    pendencias_docs_por_processo: dict[uuid.UUID, int] = {}
    if processo_ids:
        pendencias_docs_rows = (
            db.query(Documento.processo_id, func.count(Documento.id))
            .filter(Documento.processo_id.in_(processo_ids), Documento.status_credito == "PENDENCIADO")
            .group_by(Documento.processo_id)
            .all()
        )
        pendencias_docs_por_processo = {
            processo_id: int(total_docs or 0) for processo_id, total_docs in pendencias_docs_rows
        }

    for processo, cliente in rows:
        estagio = _process_estagio_comercial(getattr(processo, "estagio_comercial", None))
        etapa_repasse = _process_etapa_repasse(getattr(processo, "etapa_repasse", None))
        fila_atual = _fila_atual_from_processo(processo)
        status_geral = _status_token(getattr(processo, "status_geral", None))
        status_cca = _status_token(getattr(processo, "status_cca", None))
        status_agehab = _status_token(getattr(processo, "status_agehab", None))
        status_sinal = _status_token(getattr(processo, "status_sinal", None))
        status_fiador = _status_token(getattr(processo, "status_fiador", None))
        created_at_utc = _as_utc(processo.created_at)
        updated_at_utc = _as_utc(getattr(processo, "updated_at", None)) or created_at_utc
        data_referencia = cliente.data_cadastro_origem or (created_at_utc.date() if created_at_utc else None)
        dias_em_aberto = (now.date() - data_referencia).days if data_referencia else None
        nao_contar_mes = bool(getattr(processo, "nao_contar_mes", False))
        pendencias_docs = int(pendencias_docs_por_processo.get(processo.id, 0))
        tem_pendencia_status = _processo_has_pendencia(processo)
        tem_pendencia = tem_pendencia_status or pendencias_docs > 0
        sinal_ok = status_sinal in {"NAO_TEM", "PAGO"}
        fiador_ok = status_fiador in {"NAO_TEM", "FINALIZADO"}
        caixa_ok = status_cca in {"CONFORME", "ASSINATURA_CAIXA", "FINALIZADO"}
        pronto_para_repassar = (
            estagio == "VENDA_FINALIZADA"
            and status_agehab == "VALIDADO_AGEHAB"
            and sinal_ok
            and fiador_ok
            and caixa_ok
        )

        cliente_item = {
            "processo_id": str(processo.id),
            "cliente_nome": cliente.nome,
            "corretor": cliente.corretor,
            "obra": cliente.obra,
            "imobiliaria": getattr(cliente, "imobiliaria", None),
            "estagio_comercial": estagio,
            "etapa_repasse": etapa_repasse,
            "fila_atual": fila_atual,
            "status_geral": processo.status_geral,
            "status_credito": processo.status_credito,
            "status_cca": processo.status_cca,
            "status_agehab": processo.status_agehab,
            "status_sinal": processo.status_sinal,
            "status_fiador": processo.status_fiador,
            "dias_em_aberto": dias_em_aberto,
            "data_cadastro_origem": data_referencia.isoformat() if data_referencia else None,
            "pendencias_documentos": pendencias_docs,
            "tem_pendencia_status": tem_pendencia_status,
            "tem_pendencia": tem_pendencia,
            "nao_contar_mes": nao_contar_mes,
            "pronto_para_repassar": pronto_para_repassar,
        }

        if nao_contar_mes:
            nao_contar_mes_total += 1
            clientes_excluidos_mes.append(cliente_item)
            continue

        total += 1
        clientes_estagios.append(cliente_item)
        if data_referencia and data_referencia >= start_7d:
            chegadas_ultimos_7_dias += 1
            clientes_chegadas_7d.append(cliente_item)

        if estagio == "EM_PROCESSO":
            total_comercial += 1
            clientes_comercial.append(cliente_item)
            sla_comercial_sum += _compute_sla_hours(processo, SLA_OWNER_CORRETOR, now)
            sla_comercial_count += 1
        else:
            total_credito += 1
            clientes_credito.append(cliente_item)
            sla_credito_sum += _compute_sla_hours(processo, SLA_OWNER_ANALISTA, now)
            sla_credito_count += 1
            sla_cca_sum += _compute_sla_hours(processo, SLA_OWNER_CCA, now)
            sla_cca_count += 1

        if estagio in ESTAGIOS_REPASSE_COMERCIAL:
            total_repasse += 1
            clientes_repasse.append(cliente_item)

        if status_cca in PROCESS_CCA_FINAL_STATUSES:
            total_assinados += 1
            clientes_assinados.append(cliente_item)

        if pronto_para_repassar:
            clientes_prontos_repasse.append(cliente_item)

        if estagio == "EM_PROCESSO" and dias_em_aberto is not None and dias_em_aberto > FALL_RISK_DAYS:
            provaveis_cair += 1
            clientes_provaveis_cair.append(cliente_item)

        if (
            status_geral in {"CANCELADO", "DISTRATO"}
            and updated_at_utc is not None
            and updated_at_utc.year == now.year
            and updated_at_utc.month == now.month
        ):
            perdas_mes += 1
            clientes_perdas_mes.append(cliente_item)

        imob_name = (getattr(cliente, "imobiliaria", None) or "Sem imobiliaria").strip() or "Sem imobiliaria"
        imob_map[imob_name] = imob_map.get(imob_name, 0) + 1
        corretor_name = (cliente.corretor or "Sem corretor").strip() or "Sem corretor"
        if imob_name not in imob_corretores:
            imob_corretores[imob_name] = {}
        imob_corretores[imob_name][corretor_name] = imob_corretores[imob_name].get(corretor_name, 0) + 1

    imobs = [
        {
            "nome": k,
            "total": v,
            "corretores": [
                {"nome": ck, "total": cv}
                for ck, cv in sorted(imob_corretores.get(k, {}).items(), key=lambda x: -x[1])
            ],
        }
        for k, v in sorted(imob_map.items(), key=lambda x: -x[1])
    ]

    hoje = now.date()
    dias_no_mes = calendar.monthrange(hoje.year, hoje.month)[1]
    dias_decorridos = max(1, hoje.day)
    meta, meta_source = _resolve_gestor_meta_mensal(db)
    real = total_assinados
    previsao = real + total
    dias_restantes = max(1, dias_no_mes - dias_decorridos)
    media_necessaria_dia = round(max(0, meta - real) / dias_restantes, 2)

    sla_medio_comercial_horas = round(sla_comercial_sum / sla_comercial_count) if sla_comercial_count else 0
    sla_medio_credito_horas = round(sla_credito_sum / sla_credito_count) if sla_credito_count else 0
    sla_medio_cca_horas = round(sla_cca_sum / sla_cca_count) if sla_cca_count else 0
    media_chegadas_dia_7d = round(chegadas_ultimos_7_dias / 7, 2)
    projecao_chegadas_30_dias = int(round(media_chegadas_dia_7d * 30))

    clientes_por_fase: dict[str, list[dict[str, Any]]] = {
        "assinados": clientes_assinados,
        "conformidade_ok": clientes_prontos_repasse,
        "enviados_conformidade": clientes_comercial,
        "em_analise": clientes_credito,
        "com_pendencias": clientes_perdas_mes,
        "passiveis_cair": clientes_provaveis_cair,
        "nao_iniciado": clientes_excluidos_mes,
        "sla_comercial": clientes_comercial,
        "sla_credito": clientes_credito,
        "sla_cca": clientes_credito,
        "chegada": clientes_assinados,
        "media_necessaria": clientes_prontos_repasse,
        "comercial": clientes_comercial,
        "repasse": clientes_repasse,
        "realizados": clientes_assinados,
        "perdas": clientes_perdas_mes,
    }

    return {
        "total": total,
        "total_bruto": total_bruto,
        "assinados": total_assinados,
        "conformidade_ok": len(clientes_prontos_repasse),
        "enviados_conformidade": total_comercial,
        "em_analise": total_credito,
        "com_pendencias": perdas_mes,
        "passiveis_cair": provaveis_cair,
        "nao_iniciado": nao_contar_mes_total,
        "processos_ativos": total,
        "sla_medio_comercial_horas": sla_medio_comercial_horas,
        "sla_medio_credito_horas": sla_medio_credito_horas,
        "sla_medio_cca_horas": sla_medio_cca_horas,
        "media_necessaria_dia": media_necessaria_dia,
        "chegadas_ultimos_7_dias": chegadas_ultimos_7_dias,
        "media_chegadas_dia_7d": media_chegadas_dia_7d,
        "projecao_chegadas_30_dias": projecao_chegadas_30_dias,
        "janela_chegadas_dias": 7,
        "janela_projecao_chegadas_dias": 30,
        "dias_estimativa_queda": FALL_RISK_DAYS,
        "clientes_por_fase": clientes_por_fase,
        "imobiliarias": imobs,
        "total_comercial": total_comercial,
        "total_repasse": total_repasse,
        "total_credito": total_credito,
        "provaveis_cair": provaveis_cair,
        "total_assinados": total_assinados,
        "meta": meta,
        "meta_fonte": meta_source,
        "real": real,
        "previsao": previsao,
        "perdas_mes": perdas_mes,
        "nao_contar_mes": nao_contar_mes_total,
        "clientes_estagios": clientes_estagios,
    }


@app.get("/app/api/gestor/meta", response_model=GestorMetaOut)
def app_get_gestor_meta(
    _: dict[str, Any] = Depends(require_roles(ROLE_GESTOR, ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    meta, fonte = _resolve_gestor_meta_mensal(db)
    return GestorMetaOut(meta=meta, fonte=fonte)


@app.put("/app/api/gestor/meta", response_model=GestorMetaOut)
def app_set_gestor_meta(
    payload: GestorMetaPayload,
    session: dict[str, Any] = Depends(require_roles(ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    meta_value = max(0, int(payload.meta or 0))
    _set_runtime_meta(db, META_MENSAL_RUNTIME_KEY, str(meta_value))
    _record_system_log(
        db,
        actor_username=_normalize_username(str(session.get("username", ""))),
        actor_role=_normalize_role(str(session.get("role", ""))),
        tela="analista_painel",
        acao="META_GESTOR_ATUALIZADA",
        entidade_tipo="configuracao",
        entidade_id=META_MENSAL_RUNTIME_KEY,
        details=f"meta={meta_value}",
    )
    db.commit()
    meta, fonte = _resolve_gestor_meta_mensal(db)
    return GestorMetaOut(meta=meta, fonte=fonte)


@app.post("/app/api/processos/intake")
def app_create_intake(
    payload: ProcessoIntakeCreate,
    session: dict[str, Any] = Depends(require_roles(ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    username = _normalize_username(str(session.get("username", "")))
    obra_nome = _resolve_empreendimento_nome(db, payload.obra)
    if payload.obra and not obra_nome:
        raise HTTPException(status_code=422, detail="Empreendimento invalido. Selecione um empreendimento cadastrado.")
    estagio = _process_estagio_comercial(payload.estagio_comercial, fallback="RESERVA")

    cliente = Cliente(
        nome=payload.nome.strip(),
        corretor=_normalize_username(payload.corretor) if payload.corretor else None,
        obra=obra_nome,
        imobiliaria=(payload.imobiliaria or "").strip() or None,
        data_cadastro_origem=payload.data_cadastro_origem,
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)

    processo = Processo(
        cliente_id=cliente.id,
        estagio_comercial=estagio,
        etapa_repasse="EM_REPASSE" if estagio in ESTAGIOS_REPASSE_COMERCIAL else None,
    )
    _sync_estagio_repasse_rules(processo, _utcnow())
    _switch_sla_owner(processo, SLA_OWNER_ANALISTA, _utcnow())
    db.add(processo)
    db.commit()
    db.refresh(processo)
    _record_processo_event(
        db,
        processo_id=processo.id,
        actor_username=username,
        actor_role=_normalize_role(str(session.get("role", ""))),
        event_type="PROCESSO_CRIADO",
        details=f"Cliente: {cliente.nome}",
    )
    _record_system_log(
        db,
        actor_username=username,
        actor_role=_normalize_role(str(session.get("role", ""))),
        tela="checklist",
        acao="PROCESSO_CRIADO",
        entidade_tipo="processo",
        entidade_id=str(processo.id),
        details=(
            f"cliente={cliente.nome}; corretor={cliente.corretor or '-'}; obra={cliente.obra or '-'}; "
            f"imobiliaria={cliente.imobiliaria or '-'}; estagio={processo.estagio_comercial}"
        ),
    )
    db.commit()

    _ensure_default_documentos(db, processo.id)
    _invalidate_process_list_cache()
    return {"ok": True, "cliente_id": str(cliente.id), "processo_id": str(processo.id)}


@app.post("/app/api/processos/importar", response_model=ImportPlanilhaOut)
async def app_importar_processos_planilha(
    file: UploadFile = File(...),
    session: dict[str, Any] = Depends(require_roles(ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    filename = (file.filename or "").strip()
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Arquivo vazio.")

    raw_rows = _load_import_rows(filename, content)
    provided_columns: set[str] = set()
    for row in raw_rows:
        provided_columns.update(row.keys())

    missing = sorted(IMPORT_REQUIRED_COLUMNS - provided_columns)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Colunas obrigatorias ausentes: {', '.join(missing)}",
        )

    actor_username = _normalize_username(str(session.get("username", "")))
    actor_role = _normalize_role(str(session.get("role", "")))
    existing_keys = {
        _normalize_cliente_key(name)
        for (name,) in db.query(Cliente.nome).all()
        if _normalize_cliente_key(name)
    }
    created_keys_in_batch: set[str] = set()

    resultados: list[ImportPlanilhaRowOut] = []
    importados = 0
    ignorados_existentes = 0
    invalidados = 0

    for row_number, row in enumerate(raw_rows, start=2):
        nome = " ".join(str(row.get("nome_cliente") or "").strip().split())
        stage_raw = row.get("estagio")
        estagio = _process_estagio_comercial(stage_raw, fallback="")
        cadastro_raw = row.get("data_cadastro")
        data_cadastro_origem = _parse_import_date(cadastro_raw)

        if not nome:
            invalidados += 1
            resultados.append(
                ImportPlanilhaRowOut(
                    linha=row_number,
                    nome_cliente=None,
                    status="invalido",
                    motivo="nome_cliente vazio",
                )
            )
            continue

        if not estagio:
            invalidados += 1
            resultados.append(
                ImportPlanilhaRowOut(
                    linha=row_number,
                    nome_cliente=nome,
                    status="invalido",
                    motivo=f"estagio invalido: {stage_raw}",
                )
            )
            continue

        if not str(cadastro_raw or "").strip():
            invalidados += 1
            resultados.append(
                ImportPlanilhaRowOut(
                    linha=row_number,
                    nome_cliente=nome,
                    status="invalido",
                    motivo="data_cadastro obrigatoria",
                )
            )
            continue

        if data_cadastro_origem is None:
            invalidados += 1
            resultados.append(
                ImportPlanilhaRowOut(
                    linha=row_number,
                    nome_cliente=nome,
                    status="invalido",
                    motivo="data_cadastro invalida",
                )
            )
            continue

        cliente_key = _normalize_cliente_key(nome)
        if not cliente_key:
            invalidados += 1
            resultados.append(
                ImportPlanilhaRowOut(
                    linha=row_number,
                    nome_cliente=nome,
                    status="invalido",
                    motivo="nome_cliente invalido",
                )
            )
            continue

        if cliente_key in existing_keys or cliente_key in created_keys_in_batch:
            ignorados_existentes += 1
            resultados.append(
                ImportPlanilhaRowOut(
                    linha=row_number,
                    nome_cliente=nome,
                    status="ignorado_existente",
                    motivo="cliente ja existe na base",
                )
            )
            continue

        empreendimento_raw = _normalize_empreendimento_nome(row.get("empreendimento"))
        empreendimento_resolvido = _resolve_empreendimento_nome(db, empreendimento_raw)
        empreendimento = empreendimento_resolvido or empreendimento_raw or None

        cliente = Cliente(
            nome=nome,
            corretor=_normalize_username(str(row.get("corretor") or "")) or None,
            obra=empreendimento,
            imobiliaria=" ".join(str(row.get("imobiliaria") or "").strip().split()) or None,
            data_cadastro_origem=data_cadastro_origem,
        )
        db.add(cliente)
        db.flush()

        processo = Processo(
            cliente_id=cliente.id,
            estagio_comercial=estagio,
            etapa_repasse="EM_REPASSE" if estagio in ESTAGIOS_REPASSE_COMERCIAL else None,
        )
        _sync_estagio_repasse_rules(processo, _utcnow())
        _switch_sla_owner(processo, SLA_OWNER_ANALISTA, _utcnow())
        db.add(processo)
        db.flush()

        _record_processo_event(
            db,
            processo_id=processo.id,
            actor_username=actor_username,
            actor_role=actor_role,
            event_type="PROCESSO_IMPORTADO_PLANILHA",
            details=f"cliente={cliente.nome}; estagio={processo.estagio_comercial}",
        )
        _record_system_log(
            db,
            actor_username=actor_username,
            actor_role=actor_role,
            tela="analista_painel",
            acao="IMPORTACAO_PLANILHA_ITEM",
            entidade_tipo="processo",
            entidade_id=str(processo.id),
            details=(
                f"linha={row_number}; cliente={cliente.nome}; estagio={processo.estagio_comercial}; "
                f"empreendimento={cliente.obra or '-'}"
            ),
        )
        _ensure_default_documentos(db, processo.id, autocommit=False)

        created_keys_in_batch.add(cliente_key)
        importados += 1
        resultados.append(
            ImportPlanilhaRowOut(
                linha=row_number,
                nome_cliente=nome,
                status="importado",
                motivo=None,
            )
        )

    db.commit()
    _invalidate_process_list_cache()

    return ImportPlanilhaOut(
        ok=True,
        total_linhas=len(raw_rows),
        importados=importados,
        ignorados_existentes=ignorados_existentes,
        invalidados=invalidados,
        resultados=resultados,
    )


@app.get("/app/api/processos/{processo_id}/full", response_model=ProcessoFullOut)
def app_get_processo_full(
    processo_id: uuid.UUID,
    session: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN)),
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
    processo_out.sla_corretor_seconds = _compute_sla_seconds(processo, SLA_OWNER_CORRETOR, now)
    processo_out.sla_analista_seconds = _compute_sla_seconds(processo, SLA_OWNER_ANALISTA, now)
    processo_out.sla_cca_seconds = _compute_sla_seconds(processo, SLA_OWNER_CCA, now)
    processo_out.sla_corretor_horas = processo_out.sla_corretor_seconds // 3600
    processo_out.sla_analista_horas = processo_out.sla_analista_seconds // 3600
    processo_out.sla_cca_horas = processo_out.sla_cca_seconds // 3600
    processo_out.sla_corretor_dias = processo_out.sla_corretor_horas // 24
    processo_out.sla_credito_dias = processo_out.sla_analista_horas // 24
    processo_out.sla_cca_dias = processo_out.sla_cca_horas // 24
    processo_out.sla_owner = _normalize_sla_owner(processo.sla_owner)
    processo_out.sla_active_since = _as_utc(processo.sla_active_since)
    processo_out.estagio_comercial = _process_estagio_comercial(processo.estagio_comercial)
    processo_out.etapa_repasse = _process_etapa_repasse(processo.etapa_repasse)
    processo_out.fila_atual = _fila_atual_from_processo(processo)

    return ProcessoFullOut(
        processo=processo_out,
        cliente=ClienteOut.model_validate(cliente),
        documentos=[DocumentoOut.model_validate(doc) for doc in documentos],
    )


@app.get("/app/api/processos/{processo_id}/eventos", response_model=list[ProcessoEventoOut])
def app_list_processo_eventos(
    processo_id: uuid.UUID,
    session: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
    limit: int = Query(default=200, ge=1, le=1000),
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

    return (
        db.query(ProcessoEvento)
        .filter(ProcessoEvento.processo_id == processo_id)
        .order_by(ProcessoEvento.created_at.desc())
        .limit(limit)
        .all()
    )


@app.get("/app/api/metricas/processos", response_model=ProcessoMetricasOut)
def app_get_metricas_processos(
    session: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    role = _normalize_role(str(session.get("role", "")))
    username = _normalize_username(str(session.get("username", "")))
    processos = _query_processos_by_scope(db, role, username).order_by(Processo.created_at.desc()).all()

    total = len(processos)
    funnel = {
        "novo": 0,
        "em_andamento": 0,
        "pendenciado": 0,
        "aprovado": 0,
        "reprovado": 0,
        "distrato": 0,
        "cancelado": 0,
    }
    sla = {
        "analista_alerta_24h": 0,
        "analista_critico_48h": 0,
        "corretor_alerta_24h": 0,
        "corretor_critico_48h": 0,
        "cca_alerta_24h": 0,
        "cca_critico_48h": 0,
    }

    now = _utcnow()
    process_ids: list[uuid.UUID] = []
    pendencias_atuais: set[uuid.UUID] = set()
    for processo in processos:
        process_ids.append(processo.id)
        geral = _status_token(processo.status_geral).lower()
        if geral in funnel:
            funnel[geral] += 1

        sla_analista = _compute_sla_hours(processo, SLA_OWNER_ANALISTA, now)
        sla_corretor = _compute_sla_hours(processo, SLA_OWNER_CORRETOR, now)
        sla_cca = _compute_sla_hours(processo, SLA_OWNER_CCA, now)

        if sla_analista >= 24:
            sla["analista_alerta_24h"] += 1
        if sla_analista >= 48:
            sla["analista_critico_48h"] += 1
        if sla_corretor >= 24:
            sla["corretor_alerta_24h"] += 1
        if sla_corretor >= 48:
            sla["corretor_critico_48h"] += 1
        if sla_cca >= 24:
            sla["cca_alerta_24h"] += 1
        if sla_cca >= 48:
            sla["cca_critico_48h"] += 1

        if _processo_has_pendencia(processo):
            pendencias_atuais.add(processo.id)

    pendencias_historicas: set[uuid.UUID] = set()
    total_eventos_pendencia = 0
    if process_ids:
        pendencia_rows = (
            db.query(ProcessoEvento.processo_id, func.count(ProcessoEvento.id))
            .filter(ProcessoEvento.processo_id.in_(process_ids), ProcessoEvento.event_type == "PENDENCIA")
            .group_by(ProcessoEvento.processo_id)
            .all()
        )
        for processo_id, count in pendencia_rows:
            pendencias_historicas.add(processo_id)
            total_eventos_pendencia += int(count or 0)

    processos_com_pendencia = len(pendencias_atuais.union(pendencias_historicas))
    first_pass_yield = round(((total - processos_com_pendencia) / total) * 100, 2) if total > 0 else 0.0
    media_retrabalho = round(total_eventos_pendencia / total, 2) if total > 0 else 0.0

    return ProcessoMetricasOut(
        total_processos=total,
        funnel=ProcessoMetricasFunnelOut(**funnel),
        sla=ProcessoMetricasSlaOut(**sla),
        qualidade=ProcessoMetricasQualidadeOut(
            processos_com_pendencia=processos_com_pendencia,
            first_pass_yield_percent=first_pass_yield,
            media_retrabalho_por_processo=media_retrabalho,
        ),
        updated_at=now,
    )


@app.patch("/app/api/processos/{processo_id}", response_model=ProcessoOut)
def app_patch_processo(
    processo_id: uuid.UUID,
    payload: ProcessoUpdate,
    session: dict[str, Any] = Depends(require_roles(ROLE_ANALISTA)),
    db: Session = Depends(get_db),
):
    processo = db.get(Processo, processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo nao encontrado")

    actor_role = _normalize_role(str(session.get("role", "")))
    actor_username = _normalize_username(str(session.get("username", "")))
    changes = payload.model_dump(exclude_unset=True)
    sla_trigger: Optional[str] = None
    old_sla_owner = _normalize_sla_owner(processo.sla_owner)
    estagio_changed = False
    assinatura_caixa_requested = False

    for field, value in changes.items():
        if field == "status_credito":
            status_credito = _process_credit_status(value)
            _validate_status_transition(field, processo.status_credito, status_credito)
            old_value = processo.status_credito
            processo.status_credito = status_credito
            if status_credito == "PENDENCIADO":
                sla_trigger = "analista_pendenciou"
            if old_value != status_credito:
                event_type = "RETORNO_PENDENCIA" if _is_pendencia_status(field, old_value) and not _is_pendencia_status(field, status_credito) else ("PENDENCIA" if _is_pendencia_status(field, status_credito) else "STATUS_CHANGE")
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type=event_type,
                    field_name=field,
                    old_value=old_value,
                    new_value=status_credito,
                )
        elif field == "status_geral":
            status_geral = _process_geral_status(value)
            _validate_status_transition(field, processo.status_geral, status_geral)
            old_value = processo.status_geral
            processo.status_geral = status_geral
            if status_geral == "PENDENCIADO":
                sla_trigger = "analista_pendenciou"
            if old_value != status_geral:
                event_type = "RETORNO_PENDENCIA" if _is_pendencia_status(field, old_value) and not _is_pendencia_status(field, status_geral) else ("PENDENCIA" if _is_pendencia_status(field, status_geral) else "STATUS_CHANGE")
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type=event_type,
                    field_name=field,
                    old_value=old_value,
                    new_value=status_geral,
                )
        elif field == "status_cca":
            status_cca = _process_caixa_status(value)
            _validate_status_transition(field, processo.status_cca, status_cca)
            old_value = processo.status_cca
            processo.status_cca = status_cca
            if status_cca == "ASSINATURA_CAIXA":
                assinatura_caixa_requested = True
            if old_sla_owner == SLA_OWNER_CCA and status_cca == "PENDENTE_CCA":
                sla_trigger = "cca_pendenciou"
            if old_value != status_cca:
                event_type = "RETORNO_PENDENCIA" if _is_pendencia_status(field, old_value) and not _is_pendencia_status(field, status_cca) else ("PENDENCIA" if _is_pendencia_status(field, status_cca) else "STATUS_CHANGE")
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type=event_type,
                    field_name=field,
                    old_value=old_value,
                    new_value=status_cca,
                )
        elif field == "status_agehab":
            status_agehab = _process_agehab_status(value)
            _validate_status_transition(field, processo.status_agehab, status_agehab)
            old_value = processo.status_agehab
            processo.status_agehab = status_agehab
            if old_sla_owner == SLA_OWNER_CCA and status_agehab == "PENDENTE_AGEHAB":
                sla_trigger = "cca_pendenciou"
            if old_value != status_agehab:
                event_type = "RETORNO_PENDENCIA" if _is_pendencia_status(field, old_value) and not _is_pendencia_status(field, status_agehab) else ("PENDENCIA" if _is_pendencia_status(field, status_agehab) else "STATUS_CHANGE")
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type=event_type,
                    field_name=field,
                    old_value=old_value,
                    new_value=status_agehab,
                )
        elif field == "status_sinal":
            status_sinal = _process_sinal_status(value)
            _validate_status_transition(field, processo.status_sinal, status_sinal)
            old_value = processo.status_sinal
            processo.status_sinal = status_sinal
            processo.pendente_sinal = status_sinal == "PENDENTE"
            if old_value != status_sinal:
                event_type = "RETORNO_PENDENCIA" if _is_pendencia_status(field, old_value) and not _is_pendencia_status(field, status_sinal) else ("PENDENCIA" if _is_pendencia_status(field, status_sinal) else "STATUS_CHANGE")
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type=event_type,
                    field_name=field,
                    old_value=old_value,
                    new_value=status_sinal,
                )
        elif field == "status_fiador":
            status_fiador = _process_fiador_status(value)
            _validate_status_transition(field, processo.status_fiador, status_fiador)
            old_value = processo.status_fiador
            processo.status_fiador = status_fiador
            processo.pendente_fiador = status_fiador == "PENDENTE"
            if old_value != status_fiador:
                event_type = "RETORNO_PENDENCIA" if _is_pendencia_status(field, old_value) and not _is_pendencia_status(field, status_fiador) else ("PENDENCIA" if _is_pendencia_status(field, status_fiador) else "STATUS_CHANGE")
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type=event_type,
                    field_name=field,
                    old_value=old_value,
                    new_value=status_fiador,
                )
        elif field == "estagio_comercial":
            next_stage = _process_estagio_comercial(value, fallback="")
            if not next_stage:
                raise HTTPException(status_code=422, detail="Estagio comercial invalido.")
            old_value = _process_estagio_comercial(processo.estagio_comercial)
            processo.estagio_comercial = next_stage
            estagio_changed = old_value != next_stage
            if old_value != next_stage:
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type="ESTAGIO_COMERCIAL_UPDATE",
                    field_name=field,
                    old_value=old_value,
                    new_value=next_stage,
                )
            etapa_before = _process_etapa_repasse(processo.etapa_repasse)
            entered_repasse = old_value not in ESTAGIOS_REPASSE_COMERCIAL and next_stage in ESTAGIOS_REPASSE_COMERCIAL
            if entered_repasse:
                processo.etapa_repasse = "EM_REPASSE"
            _sync_estagio_repasse_rules(processo, _utcnow())
            etapa_after = _process_etapa_repasse(processo.etapa_repasse)
            if etapa_before != etapa_after:
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type="ETAPA_REPASSE_AUTO",
                    field_name="etapa_repasse",
                    old_value=etapa_before,
                    new_value=etapa_after,
                    details="entrada_automatica_repasse",
                )
        elif field == "etapa_repasse":
            next_step = _process_etapa_repasse(value, fallback=None)
            if value is not None and str(value).strip() and not next_step:
                raise HTTPException(status_code=422, detail="Etapa de repasse invalida.")
            current_stage = _process_estagio_comercial(getattr(processo, "estagio_comercial", None))
            if next_step in {"EM_REPASSE", "INICIO_REPASSE"} and current_stage not in ESTAGIOS_REPASSE_COMERCIAL:
                raise HTTPException(
                    status_code=422,
                    detail="Etapa de repasse so pode ser usada a partir de ASSINATURA_DIRETORIA.",
                )
            if next_step == "ASSINATURA_AUTORIZADA" and not _can_set_assinatura_autorizada(processo):
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Nao pode avancar para ASSINATURA_AUTORIZADA. "
                        "Exige estagio VENDA_FINALIZADA, sinal/fiador regular, Agehab validada e Caixa em AGENDADO."
                    ),
                )
            old_value = _process_etapa_repasse(processo.etapa_repasse)
            processo.etapa_repasse = next_step
            if old_value != next_step:
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type="ETAPA_REPASSE_UPDATE",
                    field_name=field,
                    old_value=old_value,
                    new_value=next_step,
                )
        elif field == "cca_responsavel":
            old_value = processo.cca_responsavel
            cca_username = _normalize_username(value)
            if not cca_username:
                processo.cca_responsavel = None
            else:
                cca_user = _get_user_by_username(db, cca_username)
                if not cca_user or _normalize_role(cca_user.role) != ROLE_CCA or not cca_user.is_active:
                    raise HTTPException(status_code=422, detail="CCA invalido")
                processo.cca_responsavel = cca_user.username
            if old_value != processo.cca_responsavel:
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type="ATRIBUICAO_CCA",
                    field_name=field,
                    old_value=old_value,
                    new_value=processo.cca_responsavel,
                )
        elif field in {"sla_credito_dias", "sla_corretor_dias", "sla_cca_dias"}:
            # SLA passa a ser calculado automaticamente pelo backend.
            continue
        else:
            old_value = getattr(processo, field, None)
            setattr(processo, field, value)
            new_value = getattr(processo, field, None)
            if old_value != new_value:
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type="PROCESSO_UPDATE" if field != "observacao" else "OBSERVACAO_UPDATE",
                    field_name=field,
                    old_value=old_value,
                    new_value=new_value,
                )

    if estagio_changed:
        _sync_estagio_repasse_rules(processo, _utcnow())

    if assinatura_caixa_requested:
        if not _can_set_assinatura_autorizada(processo):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Nao pode avancar para ASSINATURA_CAIXA. "
                    "Exige VENDA_FINALIZADA, sinal/fiador regular, Agehab validada e Caixa em AGENDADO."
                ),
            )
        old_etapa = _process_etapa_repasse(processo.etapa_repasse)
        if old_etapa != "ASSINATURA_AUTORIZADA":
            processo.etapa_repasse = "ASSINATURA_AUTORIZADA"
            _record_processo_event(
                db,
                processo_id=processo.id,
                actor_username=actor_username,
                actor_role=actor_role,
                event_type="ETAPA_REPASSE_AUTO",
                field_name="etapa_repasse",
                old_value=old_etapa,
                new_value="ASSINATURA_AUTORIZADA",
                details="assinatura_caixa_confirmada",
            )
        if _status_token(processo.status_geral) not in {"CANCELADO", "DISTRATO"}:
            processo.status_geral = "APROVADO"
        processo.status_credito = "APROVADO"

    _apply_sla_rules(
        processo,
        trigger=sla_trigger,
        has_enviado_docs=_process_has_enviado_docs(db, processo.id),
    )
    new_sla_owner = _normalize_sla_owner(processo.sla_owner)
    if old_sla_owner != new_sla_owner:
        _record_processo_event(
            db,
            processo_id=processo.id,
            actor_username=actor_username,
            actor_role=actor_role,
            event_type="SLA_OWNER_CHANGE",
            field_name="sla_owner",
            old_value=old_sla_owner,
            new_value=new_sla_owner,
            details=(sla_trigger or "regra_automatica"),
        )

    if changes:
        ordered_fields = ",".join(sorted(changes.keys()))
        _record_system_log(
            db,
            actor_username=actor_username,
            actor_role=actor_role,
            tela="analista",
            acao="PROCESSO_ATUALIZADO",
            entidade_tipo="processo",
            entidade_id=str(processo.id),
            details=(
                f"campos={ordered_fields}; "
                f"status_geral={processo.status_geral}; status_credito={processo.status_credito}; "
                f"status_cca={processo.status_cca}; status_agehab={processo.status_agehab}"
            ),
        )

    db.commit()
    db.refresh(processo)
    _invalidate_process_list_cache()

    now = _utcnow()
    processo_out = ProcessoOut.model_validate(processo)
    processo_out.sla_corretor_seconds = _compute_sla_seconds(processo, SLA_OWNER_CORRETOR, now)
    processo_out.sla_analista_seconds = _compute_sla_seconds(processo, SLA_OWNER_ANALISTA, now)
    processo_out.sla_cca_seconds = _compute_sla_seconds(processo, SLA_OWNER_CCA, now)
    processo_out.sla_corretor_horas = processo_out.sla_corretor_seconds // 3600
    processo_out.sla_analista_horas = processo_out.sla_analista_seconds // 3600
    processo_out.sla_cca_horas = processo_out.sla_cca_seconds // 3600
    processo_out.sla_corretor_dias = processo_out.sla_corretor_horas // 24
    processo_out.sla_credito_dias = processo_out.sla_analista_horas // 24
    processo_out.sla_cca_dias = processo_out.sla_cca_horas // 24
    processo_out.sla_owner = _normalize_sla_owner(processo.sla_owner)
    processo_out.sla_active_since = _as_utc(processo.sla_active_since)
    processo_out.estagio_comercial = _process_estagio_comercial(processo.estagio_comercial)
    processo_out.etapa_repasse = _process_etapa_repasse(processo.etapa_repasse)
    processo_out.fila_atual = _fila_atual_from_processo(processo)
    return processo_out


@app.put("/app/api/processos/{processo_id}/documentos", response_model=list[DocumentoOut])
def app_bulk_upsert_documentos(
    processo_id: uuid.UUID,
    payload: DocumentoBulkUpsert,
    session: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN)),
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

    old_status_credito = processo.status_credito
    old_status_geral = processo.status_geral
    old_sla_owner = _normalize_sla_owner(processo.sla_owner)

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
    existing_docs = (
        db.query(Documento)
        .filter(Documento.processo_id == processo_id)
        .all()
    )
    docs_by_key: dict[tuple[str, str], Documento] = {
        (doc.categoria, doc.nome): doc for doc in existing_docs
    }

    for (categoria, nome), item in dedup_map.items():
        documento = docs_by_key.get((categoria, nome))

        status_doc = _doc_status(item.status_doc) if item.status_doc is not None else None
        status_credito = (
            _credit_status(item.status_credito)
            if can_update_credit and item.status_credito is not None
            else None
        )
        pendencia_info = _normalize_pendencia_info(item.pendencia_info)

        if documento:
            old_status_doc = documento.status_doc
            old_status_credito_doc = documento.status_credito
            old_pendencia_info = _normalize_pendencia_info(documento.pendencia_info)
            current_credit = _credit_status(documento.status_credito, fallback="AGUARDANDO_ENVIO")
            if status_doc is not None:
                if not (role == ROLE_CORRETOR and _doc_is_done(documento.status_doc)):
                    documento.status_doc = status_doc
                    if role == ROLE_CORRETOR:
                        if _doc_is_done(status_doc) and current_credit == "AGUARDANDO_ENVIO":
                            documento.status_credito = "ANALISE"
                        elif status_doc == "PENDENTE" and current_credit in {"AGUARDANDO_ENVIO", "ANALISE"}:
                            documento.status_credito = "AGUARDANDO_ENVIO"
            if status_credito is not None:
                documento.status_credito = status_credito
            elif documento.status_doc == "NAO_APLICA":
                documento.status_credito = "NAO_APLICA"
            elif _doc_is_done(documento.status_doc) and _credit_status(documento.status_credito, fallback="AGUARDANDO_ENVIO") == "AGUARDANDO_ENVIO":
                documento.status_credito = "ANALISE"
            next_credit = _credit_status(documento.status_credito, fallback="AGUARDANDO_ENVIO")
            became_pending_doc = old_status_doc != "PENDENTE" and documento.status_doc == "PENDENTE"
            if not _doc_is_done(documento.status_doc) and next_credit != "PENDENCIADO":
                documento.status_credito = "AGUARDANDO_ENVIO"
                next_credit = "AGUARDANDO_ENVIO"
            if (
                documento.status_doc == "PENDENTE"
                and next_credit == "PENDENCIADO"
                and not became_pending_doc
                and not pendencia_info
                and not old_pendencia_info
            ):
                documento.status_credito = "AGUARDANDO_ENVIO"
                next_credit = "AGUARDANDO_ENVIO"
            if next_credit == "PENDENCIADO":
                if pendencia_info:
                    documento.pendencia_info = pendencia_info
                elif role == ROLE_ANALISTA and (became_pending_doc or not old_pendencia_info):
                    raise HTTPException(
                        status_code=422,
                        detail=(f"Documento '{nome}' foi pendenciado. Informe pendencia_info."),
                    )
                elif old_pendencia_info:
                    documento.pendencia_info = old_pendencia_info
            else:
                documento.pendencia_info = None

            normalized_pendencia_info = _normalize_pendencia_info(documento.pendencia_info)
            documento.pendencia_info = normalized_pendencia_info
            if old_status_doc != documento.status_doc:
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=username,
                    actor_role=role,
                    event_type="DOCUMENTO_STATUS_DOC",
                    field_name=f"{categoria}:{nome}:status_doc",
                    old_value=old_status_doc,
                    new_value=documento.status_doc,
                )
            if old_status_credito_doc != documento.status_credito:
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=username,
                    actor_role=role,
                    event_type="DOCUMENTO_STATUS_CREDITO",
                    field_name=f"{categoria}:{nome}:status_credito",
                    old_value=old_status_credito_doc,
                    new_value=documento.status_credito,
                )
            if old_pendencia_info != documento.pendencia_info:
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=username,
                    actor_role=role,
                    event_type="DOCUMENTO_PENDENCIA_INFO",
                    field_name=f"{categoria}:{nome}:pendencia_info",
                    old_value=old_pendencia_info,
                    new_value=documento.pendencia_info,
                )
        else:
            if can_update_credit:
                if (status_doc or "").upper() == "NAO_APLICA":
                    credito_default = status_credito or "NAO_APLICA"
                else:
                    credito_default = status_credito or ("ANALISE" if _doc_is_done(status_doc) else "AGUARDANDO_ENVIO")
            else:
                credito_default = "NAO_APLICA" if (status_doc or "").upper() == "NAO_APLICA" else ("ANALISE" if _doc_is_done(status_doc) else "AGUARDANDO_ENVIO")
            credito_default_norm = _credit_status(credito_default, fallback="AGUARDANDO_ENVIO")
            status_doc_norm = status_doc or "PENDENTE"
            if not _doc_is_done(status_doc_norm):
                if credito_default_norm != "PENDENCIADO":
                    credito_default_norm = "AGUARDANDO_ENVIO"
                elif not pendencia_info:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Documento '{nome}' foi pendenciado. Informe pendencia_info.",
                    )
            if credito_default_norm == "PENDENCIADO" and not pendencia_info:
                raise HTTPException(
                    status_code=422,
                    detail=f"Documento '{nome}' foi pendenciado. Informe pendencia_info.",
                )
            novo_documento = Documento(
                processo_id=processo_id,
                categoria=categoria,
                nome=nome,
                status_doc=status_doc_norm,
                status_credito=credito_default_norm,
                pendencia_info=pendencia_info if credito_default_norm == "PENDENCIADO" else None,
            )
            docs_by_key[(categoria, nome)] = novo_documento
            db.add(novo_documento)
            _record_processo_event(
                db,
                processo_id=processo.id,
                actor_username=username,
                actor_role=role,
                event_type="DOCUMENTO_CRIADO",
                field_name=f"{categoria}:{nome}",
                new_value=f"{novo_documento.status_doc}|{novo_documento.status_credito}",
            )

    db.flush()

    documentos = (
        db.query(Documento)
        .filter(Documento.processo_id == processo_id)
        .order_by(Documento.categoria.asc(), Documento.nome.asc())
        .all()
    )
    has_enviado_docs = any(_doc_is_done(doc.status_doc) for doc in documentos)
    enviados_count = sum(1 for doc in documentos if _doc_is_done(doc.status_doc))

    sla_trigger: Optional[str] = None
    if role == ROLE_CORRETOR and has_enviado_docs:
        if _status_token(processo.status_credito) == "PENDENCIADO":
            processo.status_credito = "EM_ANALISE"
        if _status_token(processo.status_geral) in {"NOVO", "PENDENCIADO"}:
            processo.status_geral = "EM_ANDAMENTO"
        sla_trigger = "corretor_enviou"

    if old_status_credito != processo.status_credito:
        _record_processo_event(
            db,
            processo_id=processo.id,
            actor_username=username,
            actor_role=role,
            event_type="STATUS_CHANGE",
            field_name="status_credito",
            old_value=old_status_credito,
            new_value=processo.status_credito,
            details="ajuste_automatico_documentos",
        )
    if old_status_geral != processo.status_geral:
        event_type = "RETORNO_PENDENCIA" if _is_pendencia_status("status_geral", old_status_geral) and not _is_pendencia_status("status_geral", processo.status_geral) else "STATUS_CHANGE"
        _record_processo_event(
            db,
            processo_id=processo.id,
            actor_username=username,
            actor_role=role,
            event_type=event_type,
            field_name="status_geral",
            old_value=old_status_geral,
            new_value=processo.status_geral,
            details="ajuste_automatico_documentos",
        )

    _apply_sla_rules(processo, trigger=sla_trigger, has_enviado_docs=has_enviado_docs)
    new_sla_owner = _normalize_sla_owner(processo.sla_owner)
    if old_sla_owner != new_sla_owner:
        _record_processo_event(
            db,
            processo_id=processo.id,
            actor_username=username,
            actor_role=role,
            event_type="SLA_OWNER_CHANGE",
            field_name="sla_owner",
            old_value=old_sla_owner,
            new_value=new_sla_owner,
            details=(sla_trigger or "regra_automatica"),
        )

    tela_origem = "checklist" if role == ROLE_CORRETOR else ("analista" if role == ROLE_ANALISTA else "admin")
    _record_system_log(
        db,
        actor_username=username,
        actor_role=role,
        tela=tela_origem,
        acao="DOCUMENTOS_SALVOS",
        entidade_tipo="processo",
        entidade_id=str(processo.id),
        details=(
            f"documentos_recebidos={len(dedup_map)}; "
            f"documentos_enviados={enviados_count}; "
            f"status_geral={processo.status_geral}; status_credito={processo.status_credito}"
        ),
    )

    db.commit()
    _invalidate_process_list_cache()
    documentos = (
        db.query(Documento)
        .filter(Documento.processo_id == processo_id)
        .order_by(Documento.categoria.asc(), Documento.nome.asc())
        .all()
    )
    return documentos

