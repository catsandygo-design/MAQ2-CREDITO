import os
import io
import csv
import uuid
import smtplib
import logging
import hashlib
import hmac
import secrets
import calendar
import unicodedata
from contextlib import asynccontextmanager
from datetime import date, datetime, time, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, and_, create_engine, or_, text
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
CORRETOR_ROUTE_ENABLED = os.getenv("CORRETOR_ROUTE_ENABLED", "true").lower() in {"1", "true", "yes"}
try:
    GESTOR_META_MENSAL = max(0, int(os.getenv("GESTOR_META_MENSAL", "0")))
except ValueError:
    GESTOR_META_MENSAL = 0
try:
    GESTOR_META_SEMANAL = max(0, int(os.getenv("GESTOR_META_SEMANAL", "0")))
except ValueError:
    GESTOR_META_SEMANAL = 0
META_MENSAL_RUNTIME_KEY = "gestor_meta_mensal"
META_SEMANAL_RUNTIME_KEY = "gestor_meta_semanal"
LAYOUT_BLACKHOLE_RUNTIME_KEY = "layout_blackhole_enabled"
USERS_SEED_MODE_RUNTIME_KEY = "users_seed_mode"
USERS_SEED_MODE_FULL = "full"
USERS_SEED_MODE_ADMIN_ONLY = "admin_only"
REPASSE_ARQUIVO_PERIODO_RUNTIME_KEY = "repasse_arquivo_periodo"
RESET_ADMIN_USERNAME = "douglasadm"
ROLE_CORRETOR = "corretor"
ROLE_CCA = "cca"
ROLE_ANALISTA = "analista"
ROLE_ADMIN = "admin"
ROLE_GESTOR = "gestor"
ROLE_GESTOR_CREDITO = "gestor_credito"

VALID_ROLES = {ROLE_CORRETOR, ROLE_CCA, ROLE_ANALISTA, ROLE_ADMIN, ROLE_GESTOR, ROLE_GESTOR_CREDITO}

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
APP_GESTOR_CREDITO_USER = os.getenv("APP_GESTOR_CREDITO_USER", "")
APP_GESTOR_CREDITO_PASSWORD = os.getenv("APP_GESTOR_CREDITO_PASSWORD", "")
FORCE_RECOVER_ADMIN_ON_STARTUP = os.getenv("FORCE_RECOVER_ADMIN_ON_STARTUP", "false").lower() in {"1", "true", "yes"}
EMAIL_SMTP_HOST = (os.getenv("EMAIL_SMTP_HOST", "") or "").strip()
try:
    EMAIL_SMTP_PORT = int(os.getenv("EMAIL_SMTP_PORT", "587"))
except ValueError:
    EMAIL_SMTP_PORT = 587
EMAIL_SMTP_USER = (os.getenv("EMAIL_SMTP_USER", "") or "").strip()
EMAIL_SMTP_PASSWORD = os.getenv("EMAIL_SMTP_PASSWORD", "")
EMAIL_SMTP_FROM = (os.getenv("EMAIL_SMTP_FROM", "") or "").strip()
EMAIL_SMTP_STARTTLS = os.getenv("EMAIL_SMTP_STARTTLS", "true").lower() in {"1", "true", "yes"}
EMAIL_CONFIRM_LINK_BASE_URL = (os.getenv("EMAIL_CONFIRM_LINK_BASE_URL", "") or "").strip()
try:
    EMAIL_CONFIRM_TOKEN_TTL_HOURS = max(1, int(os.getenv("EMAIL_CONFIRM_TOKEN_TTL_HOURS", "72")))
except ValueError:
    EMAIL_CONFIRM_TOKEN_TTL_HOURS = 72

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
try:
    DASHBOARD_MAX_DIAS_EM_ABERTO = max(30, int(os.getenv("DASHBOARD_MAX_DIAS_EM_ABERTO", "730")))
except ValueError:
    DASHBOARD_MAX_DIAS_EM_ABERTO = 730
try:
    DASHBOARD_IMPORT_DATE_BACKFILL_TOLERANCE_DAYS = max(
        0,
        int(os.getenv("DASHBOARD_IMPORT_DATE_BACKFILL_TOLERANCE_DAYS", "365")),
    )
except ValueError:
    DASHBOARD_IMPORT_DATE_BACKFILL_TOLERANCE_DAYS = 365
RUNTIME_SCHEMA_REVISION = "2026-03-01-cca-analise-financeira-v2"
PENDENCIA_INFO_MIN_LENGTH = 0
PROCESS_LIST_CACHE: dict[str, dict[str, Any]] = {}
SEED_USERS_READY = False


def _normalize_username(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def _normalize_corretor_nome_curto(value: Optional[str]) -> str:
    cleaned = " ".join(str(value or "").strip().split())
    if not cleaned:
        return ""

    # Remove observacoes comuns no fim (ex.: " - CLT", " | Equipe", " / Time").
    for separator in (" - ", " | ", " / "):
        if separator in cleaned:
            cleaned = cleaned.split(separator, 1)[0].strip()

    # Remove sufixo entre parenteses quando vier no final.
    if cleaned.endswith(")") and "(" in cleaned:
        cleaned = cleaned[: cleaned.rfind("(")].strip()

    partes = [parte for parte in cleaned.split(" ") if parte]
    if not partes:
        return ""
    if len(partes) == 1:
        return partes[0].lower()
    if len(partes) == 2:
        return f"{partes[0]} {partes[1]}".lower()
    return f"{partes[0]} {partes[-1]}".lower()


def _build_app_users() -> dict[str, dict[str, str]]:
    users: dict[str, dict[str, str]] = {}
    configs = [
        (APP_CORRETOR_USER, APP_CORRETOR_PASSWORD, ROLE_CORRETOR),
        (APP_CCA_USER, APP_CCA_PASSWORD, ROLE_CCA),
        (APP_ANALISTA_USER, APP_ANALISTA_PASSWORD, ROLE_ANALISTA),
        (APP_ADMIN_USER, APP_ADMIN_PASSWORD, ROLE_ADMIN),
        (APP_GESTOR_USER, APP_GESTOR_PASSWORD, ROLE_GESTOR),
        (APP_GESTOR_CREDITO_USER, APP_GESTOR_CREDITO_PASSWORD, ROLE_GESTOR_CREDITO),
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
            # Supabase pooler (PgBouncer) em transaction mode nao funciona bem com prepared statements.
            # Com psycopg3, prepare_threshold=None desativa preparo automatico e evita DuplicatePreparedStatement.
            connect_args={
                "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
                "prepare_threshold": None,
            },
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
    defaults = [
        (_normalize_username(APP_CORRETOR_USER), "corretor", "Troque#Corretor123"),
        (_normalize_username(APP_CCA_USER), "cca", "Troque#Cca123"),
        (_normalize_username(APP_ANALISTA_USER), "analista", "Troque#Analista123"),
        (_normalize_username(APP_ADMIN_USER), "admin", "Troque#Admin123"),
        (_normalize_username(APP_GESTOR_USER), "gestor", "Troque#Gestor123"),
    ]
    for username, role, expected_password in defaults:
        if not username:
            continue
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
    if role_key == ROLE_GESTOR_CREDITO:
        return "/app/gestor-credito"
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
    "APROVADO",
    "REPROVADO",
    "CONDICIONADO",
    "BLOQUEADO",
    "DAR_QV",
    "AGUARDANDO_CONFORMIDADE",
    "CONFORME",
    "TRATANDO_PRODUTO",
    "AGENDADO",
    "ASSINATURA_CAIXA",
    "FINALIZADO",
}
PROCESS_AGEHAB_STATUSES = {"ANALISE_CREDITO", "PENDENTE_CREDITO", "ENVIO_AGEHAB", "PENDENTE_AGEHAB", "VALIDADO_AGEHAB"}
PROCESS_SINAL_STATUSES = {"NAO_TEM", "PENDENTE", "PAGO"}
PROCESS_FIADOR_STATUSES = {"NAO_TEM", "PENDENTE", "FINALIZADO"}
PROCESS_RECOLHA_FGTS_STATUSES = {"OK", "NAO_RECOLHIDO", "VALIDADO_PELO_BANCO", "RECOLHENDO"}
PROCESS_GERAL_FINAL_STATUSES = {"APROVADO", "REPROVADO", "DISTRATO", "CANCELADO"}
PROCESS_CCA_FINAL_STATUSES = {"ASSINATURA_CAIXA", "FINALIZADO"}
CAIXA_ASSINATURA_APTA_STATUSES = {
    "APROVADO",
    "DAR_QV",
    "CONFORME",
    "TRATANDO_PRODUTO",
    "AGENDADO",
    "ASSINATURA_CAIXA",
    "FINALIZADO",
}

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
LEAD_STAGE_VALUES = [
    "LEAD",
    "AGENDAMENTO",
    "VISITA",
    "PRECADASTRO",
    "RESERVA",
    "PERDIDO",
]
LEAD_STAGE_SET = set(LEAD_STAGE_VALUES)
LEAD_CCA_DECISION_VALUES = [
    "EM_ANALISE",
    "APROVADO",
    "CONDICIONADO",
    "REPROVADO",
    "BLOQUEADO",
    "DAR_QV",
]
LEAD_CCA_DECISION_SET = set(LEAD_CCA_DECISION_VALUES)
UNIDADE_STATUS_VALUES = ["DISPONIVEL", "RESERVADA", "VENDIDA", "BLOQUEADA"]
UNIDADE_STATUS_SET = set(UNIDADE_STATUS_VALUES)
IMPORT_REQUIRED_COLUMNS = {
    "reserva",
    "nome_cliente",
    "data_cadastro",
    "estagio",
    "empreendimento",
    "corretor",
    "imobiliaria",
}
IMPORT_COLUMN_ALIASES = {
    "reserva": "reserva",
    "data_reserva": "reserva",
    "data_da_reserva": "reserva",
    "data_criacao_reserva": "reserva",
    "nome": "nome_cliente",
    "cliente": "nome_cliente",
    "nome_cliente": "nome_cliente",
    "nome_do_cliente": "nome_cliente",
    "data": "data_cadastro",
    "data_cad": "data_cadastro",
    "data_cadastro": "data_cadastro",
    "data_de_cadastro": "data_cadastro",
    "status": "estagio",
    "situacao": "estagio",
    "estagio": "estagio",
    "empreendimento": "empreendimento",
    "obra": "empreendimento",
    "corretor": "corretor",
    "imobiliaria": "imobiliaria",
}
CSV_IMPORT_ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")
CSV_IMPORT_DELIMITERS = (",", ";", "\t", "|")

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


def _lead_stage(value: Optional[str], fallback: str = "LEAD") -> str:
    token = _normalize_text_key(value)
    aliases = {
        "lead": "LEAD",
        "novo": "LEAD",
        "contato_inicial": "LEAD",
        "primeiro_contato": "LEAD",
        "qualificacao": "LEAD",
        "qualificado": "LEAD",
        "agendamento": "AGENDAMENTO",
        "agendado": "AGENDAMENTO",
        "visita": "VISITA",
        "em_atendimento": "VISITA",
        "atendimento": "VISITA",
        "precadastro": "PRECADASTRO",
        "pre_cadastro": "PRECADASTRO",
        "proposta": "PRECADASTRO",
        "proposta_enviada": "PRECADASTRO",
        "negociacao": "PRECADASTRO",
        "negociando": "PRECADASTRO",
        "reserva": "RESERVA",
        "ganho": "RESERVA",
        "fechado": "RESERVA",
        "perdido": "PERDIDO",
    }
    mapped = aliases.get(token, "")
    return mapped if mapped in LEAD_STAGE_SET else fallback


def _lead_cca_decision(value: Optional[str], fallback: str = "EM_ANALISE") -> str:
    token = _normalize_text_key(value)
    aliases = {
        "em_analise": "EM_ANALISE",
        "analise": "EM_ANALISE",
        "pendente": "EM_ANALISE",
        "aprovado": "APROVADO",
        "condicionado": "CONDICIONADO",
        "reprovado": "REPROVADO",
        "bloqueado": "BLOQUEADO",
        "dar_qv": "DAR_QV",
        "dar qv": "DAR_QV",
        "dar-qv": "DAR_QV",
        "darqv": "DAR_QV",
    }
    mapped = aliases.get(token, "")
    return mapped if mapped in LEAD_CCA_DECISION_SET else fallback


def _unidade_status(value: Optional[str], fallback: str = "DISPONIVEL") -> str:
    token = _normalize_text_key(value)
    aliases = {
        "disponivel": "DISPONIVEL",
        "livre": "DISPONIVEL",
        "reservada": "RESERVADA",
        "reservado": "RESERVADA",
        "vendida": "VENDIDA",
        "vendido": "VENDIDA",
        "bloqueada": "BLOQUEADA",
        "bloqueado": "BLOQUEADA",
    }
    mapped = aliases.get(token, "")
    return mapped if mapped in UNIDADE_STATUS_SET else fallback


def _should_be_in_repasse(processo: "Processo") -> bool:
    stage = _process_estagio_comercial(getattr(processo, "estagio_comercial", None))
    return stage in ESTAGIOS_REPASSE_COMERCIAL


def _fila_atual_from_processo(processo: "Processo") -> str:
    if _should_be_in_repasse(processo) or _process_etapa_repasse(getattr(processo, "etapa_repasse", None)):
        return "REPASSE"
    return "COMERCIAL"


def _is_caixa_apta_para_assinatura(status_cca: Optional[str]) -> bool:
    return _status_token(status_cca) in CAIXA_ASSINATURA_APTA_STATUSES


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
        and _is_caixa_apta_para_assinatura(caixa)
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
        if etapa_repasse and _status_token(getattr(processo, "status_cca", None)) not in PROCESS_CCA_FINAL_STATUSES:
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

    # Se o processo voltar para status nao final da Caixa, sai do arquivo mensal.
    if _status_token(getattr(processo, "status_cca", None)) not in PROCESS_CCA_FINAL_STATUSES:
        processo.arquivado = False
        processo.arquivado_em = None
        processo.arquivado_ref_ano = None
        processo.arquivado_ref_mes = None


def _normalize_sla_owner(value: Optional[str], fallback: str = SLA_OWNER_NONE) -> str:
    raw = _status_token(value)
    return raw if raw in SLA_OWNER_VALUES else fallback


def _as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _utc_start_of_day(value: Optional[date]) -> Optional[datetime]:
    if not isinstance(value, date):
        return None
    return datetime.combine(value, time.min, tzinfo=timezone.utc)


def _resolve_sla_clock_end(processo: "Processo", now: Optional[datetime] = None) -> datetime:
    now_utc = _as_utc(now) or _utcnow()
    if _is_processo_finalizado(processo):
        finished_at = _as_utc(getattr(processo, "updated_at", None))
        if finished_at is not None:
            return finished_at if finished_at <= now_utc else now_utc
    return now_utc


def _resolve_sla_comercial_start(processo: "Processo") -> Optional[datetime]:
    start_at = _as_utc(getattr(processo, "sla_comercial_inicio_at", None))
    if start_at is not None:
        return start_at

    cliente = getattr(processo, "cliente", None)
    if cliente is not None:
        start_at = _utc_start_of_day(getattr(cliente, "data_cadastro_origem", None))
        if start_at is not None:
            return start_at
        created_cliente = _as_utc(getattr(cliente, "created_at", None))
        if created_cliente is not None:
            return created_cliente

    return _as_utc(getattr(processo, "created_at", None))


def _resolve_sla_credito_start(processo: "Processo") -> Optional[datetime]:
    return _as_utc(getattr(processo, "sla_credito_inicio_at", None))


def _is_sla_comercial_closed(processo: "Processo") -> bool:
    return _process_estagio_comercial(getattr(processo, "estagio_comercial", None)) == "VENDA_FINALIZADA"


def _is_sla_credito_closed(processo: "Processo") -> bool:
    return _status_token(getattr(processo, "status_cca", None)) in PROCESS_CCA_FINAL_STATUSES


def _refresh_sla_fixed_markers(processo: "Processo", now: Optional[datetime] = None) -> None:
    now_utc = _as_utc(now) or _utcnow()

    comercial_closed = _is_sla_comercial_closed(processo)
    comercial_fim = _as_utc(getattr(processo, "sla_comercial_fim_at", None))
    if comercial_closed and comercial_fim is None:
        processo.sla_comercial_fim_at = now_utc
    elif (not comercial_closed) and comercial_fim is not None:
        processo.sla_comercial_fim_at = None

    credito_closed = _is_sla_credito_closed(processo)
    credito_fim = _as_utc(getattr(processo, "sla_credito_fim_at", None))
    if credito_closed and credito_fim is None:
        processo.sla_credito_fim_at = now_utc
    elif (not credito_closed) and credito_fim is not None:
        processo.sla_credito_fim_at = None


def _resolve_sla_fixed_end(processo: "Processo", owner: str, now: Optional[datetime] = None) -> datetime:
    now_utc = _as_utc(now) or _utcnow()
    owner_norm = _normalize_sla_owner(owner)
    if owner_norm == SLA_OWNER_CORRETOR:
        fim = _as_utc(getattr(processo, "sla_comercial_fim_at", None))
        if fim is not None:
            return fim if fim <= now_utc else now_utc
        if _is_sla_comercial_closed(processo):
            closed_at = _as_utc(getattr(processo, "updated_at", None)) or now_utc
            return closed_at if closed_at <= now_utc else now_utc
        return _resolve_sla_clock_end(processo, now_utc)
    elif owner_norm == SLA_OWNER_ANALISTA:
        fim = _as_utc(getattr(processo, "sla_credito_fim_at", None))
        if fim is not None:
            return fim if fim <= now_utc else now_utc
        if _is_sla_credito_closed(processo):
            closed_at = _as_utc(getattr(processo, "updated_at", None)) or now_utc
            return closed_at if closed_at <= now_utc else now_utc
        return _resolve_sla_clock_end(processo, now_utc)
    return _resolve_sla_clock_end(processo, now_utc)


def _elapsed_seconds_between(start_at: Optional[datetime], end_at: Optional[datetime]) -> int:
    if start_at is None or end_at is None or end_at <= start_at:
        return 0
    return int((end_at - start_at).total_seconds())


def _ensure_credito_sla_start(processo: "Processo", actor_role: Optional[str], now: Optional[datetime] = None) -> None:
    if _normalize_role(actor_role) != ROLE_ANALISTA:
        return
    if _as_utc(getattr(processo, "sla_credito_inicio_at", None)) is not None:
        return
    processo.sla_credito_inicio_at = _as_utc(now) or _utcnow()


def _seconds_from_value(value: Any) -> int:
    try:
        parsed = int(value or 0)
    except (TypeError, ValueError):
        return 0
    return max(0, parsed)


def _is_cca_sla_start_condition(processo: "Processo") -> bool:
    return _status_token(processo.status_cca) in {"ANALISE_CCA", "ANALISE_CREDITO"}


def _is_cca_sla_pendencia_condition(processo: "Processo") -> bool:
    return _status_token(processo.status_cca) in {"PENDENTE_CCA", "CONDICIONADO"} or _status_token(processo.status_agehab) == "PENDENTE_AGEHAB"


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
    if owner_norm == SLA_OWNER_CORRETOR:
        start_at = _resolve_sla_comercial_start(processo)
        end_at = _resolve_sla_fixed_end(processo, owner_norm, now)
        return max(0, _elapsed_seconds_between(start_at, end_at))
    if owner_norm == SLA_OWNER_ANALISTA:
        start_at = _resolve_sla_credito_start(processo)
        end_at = _resolve_sla_fixed_end(processo, owner_norm, now)
        return max(0, _elapsed_seconds_between(start_at, end_at))

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
        "CONFORME": "APROVADO",
        "TRATANDO_PRODUTO": "CONDICIONADO",
        "AGUARDANDO_CONFORMIDADE": "CONDICIONADO",
        "AGENDADO": "DAR_QV",
        "DAR QV": "DAR_QV",
        "DAR-QV": "DAR_QV",
        "DARQV": "DAR_QV",
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


def _process_recolha_fgts_status(value: Optional[str], fallback: str = "NAO_RECOLHIDO") -> str:
    raw = _status_token(value)
    aliases = {
        "NAO RECOLHIDO": "NAO_RECOLHIDO",
        "VALIDADO BANCO": "VALIDADO_PELO_BANCO",
        "VALIDADO PELO BANCO": "VALIDADO_PELO_BANCO",
    }
    raw = aliases.get(raw, raw)
    return raw if raw in PROCESS_RECOLHA_FGTS_STATUSES else fallback


def _is_pendencia_status(field: str, status_value: Optional[str]) -> bool:
    token = _status_token(status_value)
    if field in {"status_credito", "status_geral"}:
        return token == "PENDENCIADO"
    if field in {"status_cca", "status_agehab"}:
        return token.startswith("PENDENTE_") or token == "CONDICIONADO"
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


def _validate_estagio_comercial_transition(current_value: Optional[str], next_value: Optional[str]) -> None:
    current = _process_estagio_comercial(current_value, fallback="")
    nxt = _process_estagio_comercial(next_value, fallback="")
    if not current or not nxt or current == nxt:
        return
    if current == "VENDA_FINALIZADA" and nxt != "VENDA_FINALIZADA":
        raise HTTPException(
            status_code=422,
            detail=(
                "Apos VENDA_FINALIZADA o cliente nao pode voltar de estagio comercial. "
                "Se houver desistencia, altere o status geral para DISTRATO."
            ),
        )


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
    data_reserva_origem: Mapped[Optional[date]] = mapped_column(Date)
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
    valor_sinal: Mapped[Optional[float]] = mapped_column(Float)
    renda_bruta: Mapped[Optional[float]] = mapped_column(Float)
    renda_liquida: Mapped[Optional[float]] = mapped_column(Float)
    valor_parcela: Mapped[Optional[float]] = mapped_column(Float)
    valor_imovel: Mapped[Optional[float]] = mapped_column(Float)
    valor_avaliacao: Mapped[Optional[float]] = mapped_column(Float)
    valor_financiamento: Mapped[Optional[float]] = mapped_column(Float)
    valor_subsidio: Mapped[Optional[float]] = mapped_column(Float)
    valor_cheque_moradia: Mapped[Optional[float]] = mapped_column(Float)
    recolha_fgts: Mapped[str] = mapped_column(String(30), nullable=False, default="NAO_RECOLHIDO")
    status_fiador: Mapped[str] = mapped_column(String, nullable=False, default="NAO_TEM")
    estagio_comercial: Mapped[str] = mapped_column(String(40), nullable=False, default="RESERVA")
    etapa_repasse: Mapped[Optional[str]] = mapped_column(String(40))
    cca_responsavel: Mapped[Optional[str]] = mapped_column(String(120))
    pendente_fiador: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pendente_sinal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    nao_contar_mes: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    nao_contar_mes_ref_ano: Mapped[Optional[int]] = mapped_column(Integer)
    nao_contar_mes_ref_mes: Mapped[Optional[int]] = mapped_column(Integer)
    arquivado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    arquivado_em: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    arquivado_ref_ano: Mapped[Optional[int]] = mapped_column(Integer)
    arquivado_ref_mes: Mapped[Optional[int]] = mapped_column(Integer)
    sla_comercial_inicio_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sla_credito_inicio_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sla_comercial_fim_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sla_credito_fim_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
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


class EmpreendimentoRegraFinanceira(Base):
    __tablename__ = "empreendimento_regras_financeiras"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empreendimento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("empreendimentos.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    valor_cheque_moradia: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class LeadPreCadastro(Base):
    __tablename__ = "lead_precadastros"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    corretor_username: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    nome_cliente: Mapped[str] = mapped_column(Text, nullable=False)
    telefone: Mapped[Optional[str]] = mapped_column(String(40))
    whatsapp: Mapped[Optional[str]] = mapped_column(String(40))
    email: Mapped[Optional[str]] = mapped_column(String(180))
    cpf: Mapped[Optional[str]] = mapped_column(String(20), index=True)
    documento_identificacao: Mapped[Optional[str]] = mapped_column(String(40))
    estado_civil: Mapped[Optional[str]] = mapped_column(String(30))
    certidao_numero: Mapped[Optional[str]] = mapped_column(String(60))
    cidade_nascimento: Mapped[Optional[str]] = mapped_column(String(120))
    data_nascimento: Mapped[Optional[date]] = mapped_column(Date)
    endereco: Mapped[Optional[str]] = mapped_column(Text)
    empreendimento_interesse: Mapped[Optional[str]] = mapped_column(Text)
    localidade_interesse: Mapped[Optional[str]] = mapped_column(Text)
    local_agendamento: Mapped[Optional[str]] = mapped_column(Text)
    tipo_visita: Mapped[Optional[str]] = mapped_column(String(20))
    data_agendamento: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    estagio_lead: Mapped[str] = mapped_column(String(40), nullable=False, default="LEAD")
    decisao_cca: Mapped[str] = mapped_column(String(30), nullable=False, default="EM_ANALISE")
    contrato_assinado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    contrato_assinado_em: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    assinatura_email_confirmada: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    assinatura_email_confirmada_em: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    assinatura_email_token: Mapped[Optional[str]] = mapped_column(String(120), index=True)
    assinatura_email_token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    assinatura_email_enviado_em: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    processo_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("processos.id", ondelete="SET NULL"))
    reservado_em: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    ultimo_contato_em: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        index=True,
    )


class UnidadeDisponivel(Base):
    __tablename__ = "unidades_disponiveis"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by_username: Mapped[Optional[str]] = mapped_column(String(120), index=True)
    empreendimento: Mapped[str] = mapped_column(String(220), nullable=False, index=True)
    unidade: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    bloco: Mapped[Optional[str]] = mapped_column(String(80))
    tipologia: Mapped[Optional[str]] = mapped_column(String(120), index=True)
    quartos: Mapped[Optional[int]] = mapped_column(Integer)
    banheiros: Mapped[Optional[int]] = mapped_column(Integer)
    vagas: Mapped[Optional[int]] = mapped_column(Integer)
    area_m2: Mapped[Optional[float]] = mapped_column(Float)
    valor: Mapped[Optional[float]] = mapped_column(Float)
    localizacao: Mapped[Optional[str]] = mapped_column(Text)
    diferenciais: Mapped[Optional[str]] = mapped_column(Text)
    url_imagem: Mapped[Optional[str]] = mapped_column(Text)
    visita_disponivel: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    status_unidade: Mapped[str] = mapped_column(String(20), nullable=False, default="DISPONIVEL", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        index=True,
    )


class ClienteCreate(BaseModel):
    nome: str
    corretor: Optional[str] = None
    obra: Optional[str] = None
    imobiliaria: Optional[str] = None
    data_reserva_origem: Optional[date] = None
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
    valor_sinal: Optional[float] = None
    renda_bruta: Optional[float] = None
    renda_liquida: Optional[float] = None
    valor_parcela: Optional[float] = None
    valor_imovel: Optional[float] = None
    valor_avaliacao: Optional[float] = None
    valor_financiamento: Optional[float] = None
    valor_subsidio: Optional[float] = None
    valor_cheque_moradia: Optional[float] = None
    recolha_fgts: Optional[str] = None
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
    valor_sinal: Optional[float] = None
    renda_bruta: Optional[float] = None
    renda_liquida: Optional[float] = None
    valor_parcela: Optional[float] = None
    valor_imovel: Optional[float] = None
    valor_avaliacao: Optional[float] = None
    valor_financiamento: Optional[float] = None
    valor_subsidio: Optional[float] = None
    valor_cheque_moradia: Optional[float] = None
    recolha_fgts: str
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


class AdminDeleteRegistroPayload(BaseModel):
    entidade: str
    registro_id: uuid.UUID
    motivo: Optional[str] = None


class AdminRegistroLookupItem(BaseModel):
    id: uuid.UUID
    titulo: str
    detalhe: Optional[str] = None


class AdminRegistroLookupOut(BaseModel):
    entidade: str
    total: int
    itens: list[AdminRegistroLookupItem]


class LayoutPreferencePayload(BaseModel):
    blackhole_enabled: bool = False


class LayoutPreferenceOut(BaseModel):
    blackhole_enabled: bool
    fonte: str


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


class EmpreendimentoRegraFinanceiraPayload(BaseModel):
    valor_cheque_moradia: float


class EmpreendimentoRegraFinanceiraOut(BaseModel):
    empreendimento_id: uuid.UUID
    empreendimento_nome: str
    valor_cheque_moradia: float
    updated_at: datetime


class LeadPreCadastroCreate(BaseModel):
    nome_cliente: str
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    cpf: Optional[str] = None
    documento_identificacao: Optional[str] = None
    estado_civil: Optional[str] = None
    certidao_numero: Optional[str] = None
    cidade_nascimento: Optional[str] = None
    data_nascimento: Optional[date] = None
    endereco: Optional[str] = None
    empreendimento_interesse: Optional[str] = None
    localidade_interesse: Optional[str] = None
    local_agendamento: Optional[str] = None
    tipo_visita: Optional[str] = None
    data_agendamento: Optional[datetime] = None
    estagio_lead: Optional[str] = None
    decisao_cca: Optional[str] = None
    contrato_assinado: Optional[bool] = None
    observacoes: Optional[str] = None
    ultimo_contato_em: Optional[datetime] = None


class LeadPreCadastroUpdate(BaseModel):
    nome_cliente: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    cpf: Optional[str] = None
    documento_identificacao: Optional[str] = None
    estado_civil: Optional[str] = None
    certidao_numero: Optional[str] = None
    cidade_nascimento: Optional[str] = None
    data_nascimento: Optional[date] = None
    endereco: Optional[str] = None
    empreendimento_interesse: Optional[str] = None
    localidade_interesse: Optional[str] = None
    local_agendamento: Optional[str] = None
    tipo_visita: Optional[str] = None
    data_agendamento: Optional[datetime] = None
    estagio_lead: Optional[str] = None
    decisao_cca: Optional[str] = None
    contrato_assinado: Optional[bool] = None
    observacoes: Optional[str] = None
    ultimo_contato_em: Optional[datetime] = None


class LeadPreCadastroOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    corretor_username: str
    nome_cliente: str
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    cpf: Optional[str] = None
    documento_identificacao: Optional[str] = None
    estado_civil: Optional[str] = None
    certidao_numero: Optional[str] = None
    cidade_nascimento: Optional[str] = None
    data_nascimento: Optional[date] = None
    endereco: Optional[str] = None
    empreendimento_interesse: Optional[str] = None
    localidade_interesse: Optional[str] = None
    local_agendamento: Optional[str] = None
    tipo_visita: Optional[str] = None
    data_agendamento: Optional[datetime] = None
    estagio_lead: str
    decisao_cca: str
    contrato_assinado: bool
    contrato_assinado_em: Optional[datetime] = None
    assinatura_email_confirmada: bool
    assinatura_email_confirmada_em: Optional[datetime] = None
    assinatura_email_enviado_em: Optional[datetime] = None
    assinatura_email_token_expires_at: Optional[datetime] = None
    processo_id: Optional[uuid.UUID] = None
    reservado_em: Optional[datetime] = None
    observacoes: Optional[str] = None
    ultimo_contato_em: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class LeadReservaOut(BaseModel):
    lead_id: uuid.UUID
    cliente_id: uuid.UUID
    processo_id: uuid.UUID
    estagio_lead: str
    reservado_em: datetime


class LeadAssinaturaEmailOut(BaseModel):
    lead_id: uuid.UUID
    email: str
    token_expires_at: datetime
    enviado_em: datetime


class UnidadeDisponivelCreate(BaseModel):
    empreendimento: str
    unidade: str
    bloco: Optional[str] = None
    tipologia: Optional[str] = None
    quartos: Optional[int] = None
    banheiros: Optional[int] = None
    vagas: Optional[int] = None
    area_m2: Optional[float] = None
    valor: Optional[float] = None
    localizacao: Optional[str] = None
    diferenciais: Optional[str] = None
    url_imagem: Optional[str] = None
    visita_disponivel: Optional[bool] = True
    status_unidade: Optional[str] = None


class UnidadeDisponivelUpdate(BaseModel):
    empreendimento: Optional[str] = None
    unidade: Optional[str] = None
    bloco: Optional[str] = None
    tipologia: Optional[str] = None
    quartos: Optional[int] = None
    banheiros: Optional[int] = None
    vagas: Optional[int] = None
    area_m2: Optional[float] = None
    valor: Optional[float] = None
    localizacao: Optional[str] = None
    diferenciais: Optional[str] = None
    url_imagem: Optional[str] = None
    visita_disponivel: Optional[bool] = None
    status_unidade: Optional[str] = None


class UnidadeDisponivelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_by_username: Optional[str] = None
    empreendimento: str
    unidade: str
    bloco: Optional[str] = None
    tipologia: Optional[str] = None
    quartos: Optional[int] = None
    banheiros: Optional[int] = None
    vagas: Optional[int] = None
    area_m2: Optional[float] = None
    valor: Optional[float] = None
    localizacao: Optional[str] = None
    diferenciais: Optional[str] = None
    url_imagem: Optional[str] = None
    visita_disponivel: bool
    status_unidade: str
    created_at: datetime
    updated_at: datetime


class UnidadeDisponivelMetricasOut(BaseModel):
    total: int
    disponiveis: int
    ticket_medio: float
    area_media: float
    empreendimentos: int


class ProcessoIntakeCreate(BaseModel):
    nome: str
    corretor: Optional[str] = None
    obra: Optional[str] = None
    imobiliaria: Optional[str] = None
    data_reserva_origem: Optional[date] = None
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
    valor_sinal: Optional[float] = None
    recolha_fgts: str
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
    data_reserva_origem: Optional[date] = None
    data_cadastro_origem: Optional[date] = None
    created_at: Optional[datetime] = None
    docs_total: int = 0
    docs_recebidos: int = 0
    sem_documento_enviado: bool = True
    aviso_gerar_contrato_agehab: bool = False


class CcaAnaliseItemOut(BaseModel):
    processo_id: uuid.UUID
    cliente_id: uuid.UUID
    cliente_nome: str
    corretor: Optional[str] = None
    obra: Optional[str] = None
    estagio_comercial: str
    status_cca: str
    status_agehab: str
    renda_bruta: Optional[float] = None
    renda_liquida: Optional[float] = None
    valor_parcela: Optional[float] = None
    valor_imovel: Optional[float] = None
    valor_avaliacao: Optional[float] = None
    valor_financiamento: Optional[float] = None
    valor_subsidio: Optional[float] = None
    valor_cheque_moradia: Optional[float] = None
    recolha_fgts: str
    cpf: Optional[str] = None
    documento_identificacao: Optional[str] = None
    estado_civil: Optional[str] = None
    certidao_numero: Optional[str] = None
    cidade_nascimento: Optional[str] = None
    data_nascimento: Optional[date] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    docs_total: int = 0
    docs_recebidos: int = 0
    docs_pendentes: int = 0
    updated_at: Optional[datetime] = None


class CcaAnaliseUpdate(BaseModel):
    status_cca: Optional[str] = None
    renda_bruta: Optional[float] = None
    renda_liquida: Optional[float] = None
    valor_parcela: Optional[float] = None
    valor_imovel: Optional[float] = None
    valor_avaliacao: Optional[float] = None
    valor_financiamento: Optional[float] = None
    valor_subsidio: Optional[float] = None
    recolha_fgts: Optional[str] = None


class ProcessoArquivadoOut(BaseModel):
    processo_id: uuid.UUID
    cliente_id: uuid.UUID
    cliente_nome: str
    corretor: Optional[str] = None
    obra: Optional[str] = None
    imobiliaria: Optional[str] = None
    estagio_comercial: str
    etapa_repasse: Optional[str] = None
    status_cca: str
    status_agehab: str
    status_sinal: str
    status_fiador: str
    arquivado_em: Optional[datetime] = None
    arquivado_ref_ano: Optional[int] = None
    arquivado_ref_mes: Optional[int] = None
    data_reserva_origem: Optional[date] = None
    data_cadastro_origem: Optional[date] = None
    created_at: Optional[datetime] = None
    sla_analista_horas: Optional[int] = None
    sla_corretor_horas: Optional[int] = None


class ProcessoArquivadoListOut(BaseModel):
    total_clientes_cadastrados: int
    total_processos_ativos: int
    total_processos_arquivados: int
    itens: list[ProcessoArquivadoOut]


class AdminStorageSummaryOut(BaseModel):
    total_clientes: int
    total_processos: int
    total_processos_ativos: int
    total_processos_arquivados: int
    total_pre_cadastros: int
    total_unidades_disponiveis: int
    total_documentos: int
    total_eventos_processo: int
    total_logs_sistema: int
    total_usuarios: int
    total_empreendimentos: int
    total_registros_monitorados: int


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


class GestorMetaPeriodoPayload(BaseModel):
    ano: int
    mes: int
    meta_mensal: int
    meta_semanal: int


class GestorMetaPeriodoOut(BaseModel):
    ano: int
    mes: int
    meta_mensal: int
    meta_semanal: int
    fonte_mensal: str
    fonte_semanal: str


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


def _query_processos_by_scope(db: Session, role: str, username: str, include_archived: bool = False):
    query = db.query(Processo)
    if not include_archived:
        query = query.filter(_processos_ativos_clause())
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

    seed_mode_raw = (_get_runtime_meta(db, USERS_SEED_MODE_RUNTIME_KEY) or USERS_SEED_MODE_FULL).strip().lower()
    seed_mode = seed_mode_raw if seed_mode_raw in {USERS_SEED_MODE_FULL, USERS_SEED_MODE_ADMIN_ONLY} else USERS_SEED_MODE_FULL

    seeds = []
    if seed_mode == USERS_SEED_MODE_ADMIN_ONLY:
        admin_username = _normalize_username(RESET_ADMIN_USERNAME) or _normalize_username(APP_ADMIN_USER)
        admin_password = (APP_ADMIN_PASSWORD or "").strip() or "Troque#Admin123"
        seeds.append((admin_username, admin_password, ROLE_ADMIN))
        admin_seed_username = admin_username
    else:
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
            if is_admin_seed and FORCE_RECOVER_ADMIN_ON_STARTUP:
                admin_changed = False
                if existing.role != ROLE_ADMIN:
                    existing.role = ROLE_ADMIN
                    admin_changed = True
                if not bool(existing.is_active):
                    existing.is_active = True
                    admin_changed = True
                if existing.must_change_password:
                    existing.must_change_password = False
                    admin_changed = True
                existing.last_login_at = None
                if not _verify_password(password, existing.password_hash, existing.password_salt):
                    _set_user_password(existing, password, must_change_password=False)
                    admin_changed = True
                if admin_changed:
                    changed += 1
                continue
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


def _normalize_lead_text(value: Optional[str], *, max_len: int = 400) -> Optional[str]:
    text = " ".join(str(value or "").strip().split())
    if not text:
        return None
    return text[:max_len]


def _normalize_lead_email(value: Optional[str]) -> Optional[str]:
    email = _normalize_lead_text(value, max_len=180)
    if not email:
        return None
    return email.lower()


def _normalize_lead_phone(value: Optional[str]) -> Optional[str]:
    phone = _normalize_lead_text(value, max_len=40)
    if not phone:
        return None
    return phone


def _normalize_lead_cpf(value: Optional[str]) -> Optional[str]:
    raw = "".join(ch for ch in str(value or "") if ch.isdigit())
    if not raw:
        return None
    if len(raw) > 11:
        raw = raw[:11]
    return raw


def _normalize_lead_documento(value: Optional[str]) -> Optional[str]:
    doc = _normalize_lead_text(value, max_len=40)
    if not doc:
        return None
    return doc.upper()


def _normalize_estado_civil(value: Optional[str]) -> Optional[str]:
    token = _normalize_text_key(value)
    aliases = {
        "solteiro": "SOLTEIRO",
        "solteira": "SOLTEIRO",
        "casado": "CASADO",
        "casada": "CASADO",
        "divorciado": "DIVORCIADO",
        "divorciada": "DIVORCIADO",
        "viuvo": "VIUVO",
        "viuva": "VIUVO",
        "uniao_estavel": "UNIAO_ESTAVEL",
    }
    mapped = aliases.get(token, "")
    return mapped or None


def _normalize_tipo_visita(value: Optional[str]) -> Optional[str]:
    token = _normalize_text_key(value)
    aliases = {
        "online": "ONLINE",
        "presencial": "PRESENCIAL",
        "hibrida": "HIBRIDA",
        "hibrido": "HIBRIDA",
    }
    mapped = aliases.get(token, "")
    return mapped or None


def _is_email_delivery_configured() -> bool:
    return bool(EMAIL_SMTP_HOST and EMAIL_SMTP_FROM)


def _send_email_message(*, to_email: str, subject: str, text_body: str) -> None:
    if not _is_email_delivery_configured():
        raise RuntimeError("Envio de e-mail nao configurado no ambiente.")

    msg = EmailMessage()
    msg["From"] = EMAIL_SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(text_body)

    with smtplib.SMTP(EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, timeout=20) as smtp:
        if EMAIL_SMTP_STARTTLS:
            smtp.starttls()
        if EMAIL_SMTP_USER:
            smtp.login(EMAIL_SMTP_USER, EMAIL_SMTP_PASSWORD)
        smtp.send_message(msg)


def _build_email_confirmation_link(request: Request, token: str) -> str:
    base = EMAIL_CONFIRM_LINK_BASE_URL.rstrip("/")
    if not base:
        base = str(request.base_url).rstrip("/")
    return f"{base}/app/assinatura/confirmar?token={token}"


def _lead_reserva_block_reason(lead: "LeadPreCadastro") -> Optional[str]:
    decisao = _lead_cca_decision(getattr(lead, "decisao_cca", None))
    if decisao not in {"APROVADO", "CONDICIONADO"}:
        return "Reserva bloqueada: CCA precisa aprovar ou condicionar o cliente."
    if not bool(getattr(lead, "contrato_assinado", False)):
        return "Reserva bloqueada: contrato ainda nao foi marcado como assinado."
    if not bool(getattr(lead, "assinatura_email_confirmada", False)):
        return "Reserva bloqueada: assinatura do contrato ainda nao foi confirmada por e-mail."
    return None


def _normalize_currency_value(value: Any) -> Optional[float]:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    raw = raw.replace("R$", "").replace(" ", "")
    # Aceita formatos "1.234,56" e "1234.56"
    if "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".")
    elif "," in raw:
        raw = raw.replace(",", ".")
    try:
        parsed = float(raw)
    except ValueError:
        return None
    if parsed < 0:
        return None
    return round(parsed, 2)


def _resolve_cheque_moradia_valor(db: Session, obra_nome: Optional[str]) -> float:
    obra = _normalize_empreendimento_nome(obra_nome)
    if not obra:
        return 0.0
    empreendimento = (
        db.query(Empreendimento)
        .filter(func.lower(Empreendimento.nome) == obra.lower())
        .first()
    )
    if not empreendimento:
        return 0.0
    regra = (
        db.query(EmpreendimentoRegraFinanceira)
        .filter(EmpreendimentoRegraFinanceira.empreendimento_id == empreendimento.id)
        .first()
    )
    if not regra:
        return 0.0
    valor = float(regra.valor_cheque_moradia or 0.0)
    return round(valor if valor > 0 else 0.0, 2)


def _coerce_optional_currency(value: Any, field_label: str) -> Optional[float]:
    if value is None:
        return None
    parsed = _normalize_currency_value(value)
    if parsed is None:
        raise HTTPException(status_code=422, detail=f"{field_label} invalido.")
    return parsed


def _build_cca_analise_item(
    db: Session,
    processo: "Processo",
    cliente: "Cliente",
    *,
    lead: Optional["LeadPreCadastro"] = None,
    docs_total: int = 0,
    docs_recebidos: int = 0,
) -> CcaAnaliseItemOut:
    valor_cheque_moradia = getattr(processo, "valor_cheque_moradia", None)
    if valor_cheque_moradia is None:
        valor_cheque_moradia = _resolve_cheque_moradia_valor(db, getattr(cliente, "obra", None))

    return CcaAnaliseItemOut(
        processo_id=processo.id,
        cliente_id=cliente.id,
        cliente_nome=cliente.nome,
        corretor=cliente.corretor,
        obra=cliente.obra,
        estagio_comercial=_process_estagio_comercial(processo.estagio_comercial),
        status_cca=_process_caixa_status(processo.status_cca),
        status_agehab=_process_agehab_status(processo.status_agehab),
        renda_bruta=float(processo.renda_bruta) if getattr(processo, "renda_bruta", None) is not None else None,
        renda_liquida=float(processo.renda_liquida) if getattr(processo, "renda_liquida", None) is not None else None,
        valor_parcela=float(processo.valor_parcela) if getattr(processo, "valor_parcela", None) is not None else None,
        valor_imovel=float(processo.valor_imovel) if getattr(processo, "valor_imovel", None) is not None else None,
        valor_avaliacao=float(processo.valor_avaliacao) if getattr(processo, "valor_avaliacao", None) is not None else None,
        valor_financiamento=float(processo.valor_financiamento) if getattr(processo, "valor_financiamento", None) is not None else None,
        valor_subsidio=float(processo.valor_subsidio) if getattr(processo, "valor_subsidio", None) is not None else None,
        valor_cheque_moradia=float(valor_cheque_moradia) if valor_cheque_moradia is not None else None,
        recolha_fgts=_process_recolha_fgts_status(getattr(processo, "recolha_fgts", None)),
        cpf=getattr(lead, "cpf", None),
        documento_identificacao=getattr(lead, "documento_identificacao", None),
        estado_civil=getattr(lead, "estado_civil", None),
        certidao_numero=getattr(lead, "certidao_numero", None),
        cidade_nascimento=getattr(lead, "cidade_nascimento", None),
        data_nascimento=getattr(lead, "data_nascimento", None),
        telefone=getattr(lead, "telefone", None),
        whatsapp=getattr(lead, "whatsapp", None),
        email=getattr(lead, "email", None),
        docs_total=max(0, int(docs_total or 0)),
        docs_recebidos=max(0, int(docs_recebidos or 0)),
        docs_pendentes=max(0, int(docs_total or 0) - int(docs_recebidos or 0)),
        updated_at=getattr(processo, "updated_at", None),
    )


def _normalize_unidade_text(value: Optional[str], *, max_len: int = 220) -> Optional[str]:
    text = " ".join(str(value or "").strip().split())
    if not text:
        return None
    return text[:max_len]


def _normalize_unidade_positive_int(value: Optional[int], *, min_value: int = 0, max_value: int = 999) -> Optional[int]:
    if value is None:
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    if parsed < min_value:
        return None
    return min(parsed, max_value)


def _normalize_unidade_positive_float(value: Optional[float], *, min_value: float = 0.0, max_value: float = 1_000_000_000.0) -> Optional[float]:
    if value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if parsed < min_value:
        return None
    return min(parsed, max_value)


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


def _decode_csv_import_content(content: bytes) -> str:
    for encoding in CSV_IMPORT_ENCODINGS:
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def _detect_csv_delimiter(text_value: str) -> str:
    lines = [line for line in text_value.splitlines() if line.strip()]
    if not lines:
        return ","
    sample = "\n".join(lines[: min(10, len(lines))])
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters="".join(CSV_IMPORT_DELIMITERS))
        if dialect and dialect.delimiter in CSV_IMPORT_DELIMITERS:
            return dialect.delimiter
    except csv.Error:
        pass
    header = lines[0]
    counts = {delimiter: header.count(delimiter) for delimiter in CSV_IMPORT_DELIMITERS}
    selected = max(counts, key=counts.get)
    return selected if counts[selected] > 0 else ","


def _parse_csv_import(content: bytes) -> list[dict[str, Any]]:
    text_value = _decode_csv_import_content(content)
    delimiter = _detect_csv_delimiter(text_value)
    reader = csv.DictReader(io.StringIO(text_value), delimiter=delimiter)
    rows: list[dict[str, Any]] = []
    for row in reader:
        if row is None:
            continue
        if all(not str(value or "").strip() for value in row.values()):
            continue
        rows.append(dict(row))
    return rows


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
    if name.endswith(".csv") or name.endswith(".cvs"):
        return _canonicalize_import_rows(_parse_csv_import(content))
    if name.endswith(".xlsx"):
        return _canonicalize_import_rows(_parse_xlsx_import(content))
    raise HTTPException(status_code=422, detail="Formato nao suportado. Envie arquivo .csv/.cvs ou .xlsx.")


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


def _runtime_meta_non_negative_int(raw_value: Optional[str]) -> Optional[int]:
    if raw_value is None:
        return None
    try:
        return max(0, int(str(raw_value).strip() or "0"))
    except ValueError:
        return None


def _runtime_meta_bool(raw_value: Optional[str], default: bool = False) -> bool:
    if raw_value is None:
        return default
    token = str(raw_value).strip().lower()
    if token in {"1", "true", "yes", "on", "blackhole"}:
        return True
    if token in {"0", "false", "no", "off", "corporativo", "corporate"}:
        return False
    return default


def _is_blackhole_layout_enabled(db: Session) -> bool:
    return _runtime_meta_bool(_get_runtime_meta(db, LAYOUT_BLACKHOLE_RUNTIME_KEY), default=False)


def _current_meta_period() -> tuple[int, int]:
    hoje = _utcnow().date()
    return hoje.year, hoje.month


def _set_nao_contar_mes_period(processo: "Processo", marcado: bool, now: Optional[datetime] = None) -> None:
    if not marcado:
        processo.nao_contar_mes = False
        processo.nao_contar_mes_ref_ano = None
        processo.nao_contar_mes_ref_mes = None
        return
    ref_now = _as_utc(now) or _utcnow()
    processo.nao_contar_mes = True
    processo.nao_contar_mes_ref_ano = ref_now.year
    processo.nao_contar_mes_ref_mes = ref_now.month


def _is_nao_contar_mes_active(processo: "Processo", now: Optional[datetime] = None) -> bool:
    if not bool(getattr(processo, "nao_contar_mes", False)):
        return False
    ref_ano = getattr(processo, "nao_contar_mes_ref_ano", None)
    ref_mes = getattr(processo, "nao_contar_mes_ref_mes", None)
    if ref_ano is None or ref_mes is None:
        return True
    try:
        ref_ano_int = int(ref_ano)
        ref_mes_int = int(ref_mes)
    except (TypeError, ValueError):
        return True
    if ref_mes_int < 1 or ref_mes_int > 12:
        return True
    ref_now = _as_utc(now) or _utcnow()
    return ref_ano_int == ref_now.year and ref_mes_int == ref_now.month


def _processos_ativos_clause():
    return or_(Processo.arquivado.is_(False), Processo.arquivado.is_(None))


def _ensure_monthly_repasse_archiving(db: Session, now: Optional[datetime] = None) -> int:
    ref_now = _as_utc(now) or _utcnow()
    periodo_atual = f"{ref_now.year:04d}-{ref_now.month:02d}"
    periodo_registrado = str(_get_runtime_meta(db, REPASSE_ARQUIVO_PERIODO_RUNTIME_KEY) or "").strip()
    if periodo_registrado == periodo_atual:
        return 0

    processos_ativos = db.query(Processo).filter(_processos_ativos_clause()).all()
    candidatos = [p for p in processos_ativos if _status_token(getattr(p, "status_cca", None)) in PROCESS_CCA_FINAL_STATUSES]
    candidatos_ids = [p.id for p in candidatos]
    assinatura_evento_por_processo: dict[uuid.UUID, datetime] = {}
    if candidatos_ids:
        assinatura_rows = (
            db.query(ProcessoEvento.processo_id, func.max(ProcessoEvento.created_at))
            .filter(
                ProcessoEvento.processo_id.in_(candidatos_ids),
                func.lower(func.coalesce(ProcessoEvento.field_name, "")) == "status_cca",
                func.upper(func.coalesce(ProcessoEvento.new_value, "")).in_(tuple(PROCESS_CCA_FINAL_STATUSES)),
            )
            .group_by(ProcessoEvento.processo_id)
            .all()
        )
        for processo_id, created_at in assinatura_rows:
            assinatura_evento_por_processo[processo_id] = created_at

    arquivados = 0
    for processo in candidatos:
        assinatura_evento = _as_utc(assinatura_evento_por_processo.get(processo.id))
        credito_fim = _as_utc(getattr(processo, "sla_credito_fim_at", None))
        atualizado_em = _as_utc(getattr(processo, "updated_at", None))
        criado_em = _as_utc(getattr(processo, "created_at", None))
        referencia = assinatura_evento or credito_fim or atualizado_em or criado_em
        if referencia is None:
            continue
        if (referencia.year, referencia.month) < (ref_now.year, ref_now.month):
            processo.arquivado = True
            processo.arquivado_em = ref_now
            processo.arquivado_ref_ano = referencia.year
            processo.arquivado_ref_mes = referencia.month
            arquivados += 1

    _set_runtime_meta(db, REPASSE_ARQUIVO_PERIODO_RUNTIME_KEY, periodo_atual)
    if arquivados > 0:
        _invalidate_process_list_cache()
    db.commit()
    return arquivados


def _resolve_dashboard_reference_date(
    cliente: "Cliente",
    processo_created_date: Optional[date],
    now_date: date,
) -> Optional[date]:
    floor_by_created: Optional[date] = None
    if processo_created_date is not None:
        floor_by_created = processo_created_date - timedelta(days=DASHBOARD_IMPORT_DATE_BACKFILL_TOLERANCE_DAYS)

    raw_candidates: list[Optional[date]] = [
        getattr(cliente, "data_reserva_origem", None),
        getattr(cliente, "data_cadastro_origem", None),
        processo_created_date,
    ]

    for raw in raw_candidates:
        if raw is None:
            continue
        if raw > now_date:
            continue
        if floor_by_created is not None and raw < floor_by_created:
            continue

        dias = (now_date - raw).days
        if dias > DASHBOARD_MAX_DIAS_EM_ABERTO and processo_created_date is not None and processo_created_date <= now_date:
            return processo_created_date
        return raw

    if processo_created_date is not None and processo_created_date <= now_date:
        return processo_created_date
    return None


def _normalize_meta_period(ano: Optional[int], mes: Optional[int]) -> tuple[int, int]:
    current_ano, current_mes = _current_meta_period()
    ano_val = int(ano if ano is not None else current_ano)
    mes_val = int(mes if mes is not None else current_mes)
    if mes_val < 1 or mes_val > 12:
        raise HTTPException(status_code=422, detail="Mes invalido. Use valores de 1 a 12.")
    if ano_val < 2000 or ano_val > 2100:
        raise HTTPException(status_code=422, detail="Ano invalido. Use valores entre 2000 e 2100.")
    return ano_val, mes_val


def _build_meta_period_runtime_key(base_key: str, ano: int, mes: int) -> str:
    return f"{base_key}:{ano:04d}-{mes:02d}"


def _resolve_gestor_meta_periodo(db: Session, ano: Optional[int], mes: Optional[int]) -> tuple[int, int, str, str]:
    ano_val, mes_val = _normalize_meta_period(ano, mes)
    mensal_period_key = _build_meta_period_runtime_key(META_MENSAL_RUNTIME_KEY, ano_val, mes_val)
    semanal_period_key = _build_meta_period_runtime_key(META_SEMANAL_RUNTIME_KEY, ano_val, mes_val)

    meta_mensal = _runtime_meta_non_negative_int(_get_runtime_meta(db, mensal_period_key))
    if meta_mensal is not None:
        fonte_mensal = "runtime_periodo"
    else:
        meta_mensal = _runtime_meta_non_negative_int(_get_runtime_meta(db, META_MENSAL_RUNTIME_KEY))
        if meta_mensal is not None:
            fonte_mensal = "runtime_global"
        else:
            meta_mensal = GESTOR_META_MENSAL
            fonte_mensal = "env"

    meta_semanal = _runtime_meta_non_negative_int(_get_runtime_meta(db, semanal_period_key))
    if meta_semanal is not None:
        fonte_semanal = "runtime_periodo"
    else:
        meta_semanal = _runtime_meta_non_negative_int(_get_runtime_meta(db, META_SEMANAL_RUNTIME_KEY))
        if meta_semanal is not None:
            fonte_semanal = "runtime_global"
        else:
            meta_semanal = GESTOR_META_SEMANAL
            fonte_semanal = "env"

    return meta_mensal, meta_semanal, fonte_mensal, fonte_semanal


def _resolve_gestor_meta_mensal(db: Session) -> tuple[int, str]:
    ano, mes = _current_meta_period()
    meta_mensal, _, fonte_mensal, _ = _resolve_gestor_meta_periodo(db, ano, mes)
    return meta_mensal, fonte_mensal


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
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS lead_precadastros (
                id UUID PRIMARY KEY,
                corretor_username TEXT NOT NULL,
                nome_cliente TEXT NOT NULL,
                telefone VARCHAR(40),
                whatsapp VARCHAR(40),
                email VARCHAR(180),
                cpf VARCHAR(20),
                documento_identificacao VARCHAR(40),
                estado_civil VARCHAR(30),
                certidao_numero VARCHAR(60),
                cidade_nascimento VARCHAR(120),
                data_nascimento DATE,
                endereco TEXT,
                empreendimento_interesse TEXT,
                localidade_interesse TEXT,
                local_agendamento TEXT,
                tipo_visita VARCHAR(20),
                data_agendamento TIMESTAMPTZ,
                estagio_lead VARCHAR(40) NOT NULL DEFAULT 'LEAD',
                decisao_cca VARCHAR(30) NOT NULL DEFAULT 'EM_ANALISE',
                contrato_assinado BOOLEAN NOT NULL DEFAULT FALSE,
                contrato_assinado_em TIMESTAMPTZ,
                assinatura_email_confirmada BOOLEAN NOT NULL DEFAULT FALSE,
                assinatura_email_confirmada_em TIMESTAMPTZ,
                assinatura_email_token VARCHAR(120),
                assinatura_email_token_expires_at TIMESTAMPTZ,
                assinatura_email_enviado_em TIMESTAMPTZ,
                processo_id UUID REFERENCES processos(id) ON DELETE SET NULL,
                reservado_em TIMESTAMPTZ,
                observacoes TEXT,
                ultimo_contato_em TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS empreendimento_regras_financeiras (
                id UUID PRIMARY KEY,
                empreendimento_id UUID NOT NULL UNIQUE REFERENCES empreendimentos(id) ON DELETE CASCADE,
                valor_cheque_moradia DOUBLE PRECISION NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS unidades_disponiveis (
                id UUID PRIMARY KEY,
                created_by_username TEXT,
                empreendimento VARCHAR(220) NOT NULL,
                unidade VARCHAR(80) NOT NULL,
                bloco VARCHAR(80),
                tipologia VARCHAR(120),
                quartos INTEGER,
                banheiros INTEGER,
                vagas INTEGER,
                area_m2 DOUBLE PRECISION,
                valor DOUBLE PRECISION,
                localizacao TEXT,
                diferenciais TEXT,
                url_imagem TEXT,
                visita_disponivel BOOLEAN NOT NULL DEFAULT TRUE,
                status_unidade VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )

    statements = [
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS status_credito VARCHAR(30) DEFAULT 'EM_ANALISE'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS status_sinal VARCHAR(30) DEFAULT 'NAO_TEM'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS valor_sinal DOUBLE PRECISION",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS renda_bruta DOUBLE PRECISION",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS renda_liquida DOUBLE PRECISION",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS valor_parcela DOUBLE PRECISION",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS valor_imovel DOUBLE PRECISION",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS valor_avaliacao DOUBLE PRECISION",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS valor_financiamento DOUBLE PRECISION",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS valor_subsidio DOUBLE PRECISION",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS valor_cheque_moradia DOUBLE PRECISION",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS recolha_fgts VARCHAR(30) DEFAULT 'NAO_RECOLHIDO'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS status_fiador VARCHAR(30) DEFAULT 'NAO_TEM'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS estagio_comercial VARCHAR(40) DEFAULT 'RESERVA'",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS etapa_repasse VARCHAR(40)",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS cca_responsavel VARCHAR(120)",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS nao_contar_mes BOOLEAN DEFAULT FALSE",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS nao_contar_mes_ref_ano INTEGER",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS nao_contar_mes_ref_mes INTEGER",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS arquivado BOOLEAN DEFAULT FALSE",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS arquivado_em TIMESTAMPTZ",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS arquivado_ref_ano INTEGER",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS arquivado_ref_mes INTEGER",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_comercial_inicio_at TIMESTAMPTZ",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_credito_inicio_at TIMESTAMPTZ",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_comercial_fim_at TIMESTAMPTZ",
        "ALTER TABLE processos ADD COLUMN IF NOT EXISTS sla_credito_fim_at TIMESTAMPTZ",
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
    db.execute(text("UPDATE processos SET arquivado = FALSE WHERE arquivado IS NULL"))
    db.execute(text("UPDATE processos SET recolha_fgts = 'NAO_RECOLHIDO' WHERE COALESCE(TRIM(recolha_fgts), '') = ''"))
    ano_atual, mes_atual = _current_meta_period()
    db.execute(
        text(
            """
            UPDATE processos
               SET nao_contar_mes_ref_ano = :ano_atual,
                   nao_contar_mes_ref_mes = :mes_atual
             WHERE nao_contar_mes = TRUE
               AND (nao_contar_mes_ref_ano IS NULL OR nao_contar_mes_ref_mes IS NULL)
            """
        ),
        {"ano_atual": ano_atual, "mes_atual": mes_atual},
    )

    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_created_at ON processos (created_at DESC)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_cliente_id ON processos (cliente_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_status_geral ON processos (status_geral)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_status_credito ON processos (status_credito)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_status_cca ON processos (status_cca)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_status_agehab ON processos (status_agehab)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_estagio_comercial ON processos (estagio_comercial)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_etapa_repasse ON processos (etapa_repasse)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_processos_arquivado ON processos (arquivado)"))
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
        db.execute(text("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS data_reserva_origem DATE"))
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
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS corretor_username TEXT"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS nome_cliente TEXT"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS telefone VARCHAR(40)"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(40)"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS email VARCHAR(180)"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS cpf VARCHAR(20)"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS documento_identificacao VARCHAR(40)"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(30)"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS certidao_numero VARCHAR(60)"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS cidade_nascimento VARCHAR(120)"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS data_nascimento DATE"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS endereco TEXT"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS empreendimento_interesse TEXT"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS localidade_interesse TEXT"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS local_agendamento TEXT"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS tipo_visita VARCHAR(20)"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS data_agendamento TIMESTAMPTZ"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS estagio_lead VARCHAR(40) DEFAULT 'LEAD'"))
    db.execute(text("ALTER TABLE lead_precadastros ALTER COLUMN estagio_lead SET DEFAULT 'LEAD'"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS decisao_cca VARCHAR(30) DEFAULT 'EM_ANALISE'"))
    db.execute(text("ALTER TABLE lead_precadastros ALTER COLUMN decisao_cca SET DEFAULT 'EM_ANALISE'"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS contrato_assinado BOOLEAN DEFAULT FALSE"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS contrato_assinado_em TIMESTAMPTZ"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS assinatura_email_confirmada BOOLEAN DEFAULT FALSE"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS assinatura_email_confirmada_em TIMESTAMPTZ"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS assinatura_email_token VARCHAR(120)"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS assinatura_email_token_expires_at TIMESTAMPTZ"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS assinatura_email_enviado_em TIMESTAMPTZ"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS processo_id UUID REFERENCES processos(id) ON DELETE SET NULL"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS reservado_em TIMESTAMPTZ"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS observacoes TEXT"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS ultimo_contato_em TIMESTAMPTZ"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"))
    db.execute(text("ALTER TABLE lead_precadastros ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()"))
    db.execute(text("UPDATE lead_precadastros SET estagio_lead = 'LEAD' WHERE COALESCE(TRIM(estagio_lead), '') = ''"))
    db.execute(text("UPDATE lead_precadastros SET decisao_cca = 'EM_ANALISE' WHERE COALESCE(TRIM(decisao_cca), '') = ''"))
    db.execute(text("UPDATE lead_precadastros SET contrato_assinado = FALSE WHERE contrato_assinado IS NULL"))
    db.execute(text("UPDATE lead_precadastros SET assinatura_email_confirmada = FALSE WHERE assinatura_email_confirmada IS NULL"))
    db.execute(
        text(
            """
            UPDATE lead_precadastros
               SET estagio_lead = CASE
                 WHEN UPPER(COALESCE(estagio_lead, '')) IN ('NOVO', 'CONTATO_INICIAL', 'QUALIFICACAO') THEN 'LEAD'
                 WHEN UPPER(COALESCE(estagio_lead, '')) IN ('AGENDADO') THEN 'AGENDAMENTO'
                 WHEN UPPER(COALESCE(estagio_lead, '')) IN ('EM_ATENDIMENTO') THEN 'VISITA'
                 WHEN UPPER(COALESCE(estagio_lead, '')) IN ('PROPOSTA', 'NEGOCIACAO') THEN 'PRECADASTRO'
                 WHEN UPPER(COALESCE(estagio_lead, '')) IN ('GANHO') THEN 'RESERVA'
                 WHEN UPPER(COALESCE(estagio_lead, '')) IN ('PERDIDO') THEN 'PERDIDO'
                 ELSE estagio_lead
               END
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE lead_precadastros
               SET decisao_cca = CASE
                 WHEN UPPER(COALESCE(decisao_cca, '')) IN ('EM_ANALISE', 'APROVADO', 'CONDICIONADO', 'REPROVADO', 'BLOQUEADO', 'DAR_QV') THEN UPPER(decisao_cca)
                 WHEN UPPER(COALESCE(decisao_cca, '')) IN ('DAR QV', 'DAR-QV', 'DARQV') THEN 'DAR_QV'
                 WHEN UPPER(COALESCE(decisao_cca, '')) IN ('PENDENTE', 'ANALISE') THEN 'EM_ANALISE'
                 ELSE 'EM_ANALISE'
               END
            """
        )
    )
    db.execute(text("UPDATE lead_precadastros SET assinatura_email_confirmada = FALSE WHERE assinatura_email_confirmada IS TRUE AND contrato_assinado IS FALSE"))
    db.execute(text("UPDATE lead_precadastros SET contrato_assinado_em = NULL WHERE contrato_assinado IS FALSE"))
    db.execute(text("UPDATE lead_precadastros SET assinatura_email_confirmada_em = NULL WHERE assinatura_email_confirmada IS FALSE"))
    db.execute(text("UPDATE lead_precadastros SET assinatura_email_token = NULL, assinatura_email_token_expires_at = NULL WHERE assinatura_email_confirmada IS TRUE"))
    db.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_lead_precadastros_corretor_norm
            ON lead_precadastros ((LOWER(TRIM(COALESCE(corretor_username, '')))))
            """
        )
    )
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_lead_precadastros_cpf ON lead_precadastros (cpf)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_lead_precadastros_processo_id ON lead_precadastros (processo_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_lead_precadastros_estagio ON lead_precadastros (estagio_lead)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_lead_precadastros_decisao_cca ON lead_precadastros (decisao_cca)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_lead_precadastros_assinatura_email_token ON lead_precadastros (assinatura_email_token)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_lead_precadastros_updated_at ON lead_precadastros (updated_at DESC)"))
    db.execute(text("ALTER TABLE empreendimento_regras_financeiras ADD COLUMN IF NOT EXISTS empreendimento_id UUID REFERENCES empreendimentos(id) ON DELETE CASCADE"))
    db.execute(text("ALTER TABLE empreendimento_regras_financeiras ADD COLUMN IF NOT EXISTS valor_cheque_moradia DOUBLE PRECISION DEFAULT 0"))
    db.execute(text("ALTER TABLE empreendimento_regras_financeiras ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"))
    db.execute(text("ALTER TABLE empreendimento_regras_financeiras ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()"))
    db.execute(text("UPDATE empreendimento_regras_financeiras SET valor_cheque_moradia = 0 WHERE valor_cheque_moradia IS NULL"))
    db.execute(
        text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ux_empreendimento_regras_financeiras_empreendimento_id
            ON empreendimento_regras_financeiras (empreendimento_id)
            """
        )
    )
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS created_by_username TEXT"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS empreendimento VARCHAR(220)"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS unidade VARCHAR(80)"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS bloco VARCHAR(80)"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS tipologia VARCHAR(120)"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS quartos INTEGER"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS banheiros INTEGER"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS vagas INTEGER"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS area_m2 DOUBLE PRECISION"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS valor DOUBLE PRECISION"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS localizacao TEXT"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS diferenciais TEXT"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS url_imagem TEXT"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS visita_disponivel BOOLEAN DEFAULT TRUE"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS status_unidade VARCHAR(20) DEFAULT 'DISPONIVEL'"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"))
    db.execute(text("ALTER TABLE unidades_disponiveis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()"))
    db.execute(text("UPDATE unidades_disponiveis SET status_unidade = 'DISPONIVEL' WHERE COALESCE(TRIM(status_unidade), '') = ''"))
    db.execute(text("UPDATE unidades_disponiveis SET visita_disponivel = TRUE WHERE visita_disponivel IS NULL"))
    db.execute(
        text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ux_unidades_disponiveis_empreendimento_unidade
            ON unidades_disponiveis ((LOWER(TRIM(COALESCE(empreendimento, '')))), (LOWER(TRIM(COALESCE(unidade, '')))))
            """
        )
    )
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_unidades_disponiveis_status ON unidades_disponiveis (status_unidade)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_unidades_disponiveis_empreendimento ON unidades_disponiveis (empreendimento)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_unidades_disponiveis_tipologia ON unidades_disponiveis (tipologia)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_unidades_disponiveis_updated_at ON unidades_disponiveis (updated_at DESC)"))

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
                    'APROVADO', 'REPROVADO', 'CONDICIONADO', 'BLOQUEADO', 'DAR_QV',
                    'ASSINATURA_CAIXA', 'FINALIZADO'
                ) THEN UPPER(status_cca)
                WHEN UPPER(COALESCE(status_cca, '')) IN ('DAR QV', 'DAR-QV', 'DARQV') THEN 'DAR_QV'
                WHEN UPPER(COALESCE(status_cca, '')) IN ('CONFORME') THEN 'APROVADO'
                WHEN UPPER(COALESCE(status_cca, '')) IN ('TRATANDO_PRODUTO', 'AGUARDANDO_CONFORMIDADE') THEN 'CONDICIONADO'
                WHEN UPPER(COALESCE(status_cca, '')) IN ('AGENDADO') THEN 'DAR_QV'
                WHEN UPPER(COALESCE(status_cca, '')) IN ('EM_ANALISE', 'EM ANALISE', 'EMANALISE', 'ANALISE') THEN 'ANALISE_CREDITO'
                WHEN UPPER(COALESCE(status_cca, '')) IN ('PENDENTE', 'PENDENCIADO') THEN 'PENDENTE_CREDITO'
                ELSE 'ANALISE_CREDITO'
            END
            """
        )
    )

    db.execute(
        text(
            """
            UPDATE processos
            SET recolha_fgts = CASE
                WHEN UPPER(COALESCE(recolha_fgts, '')) IN ('OK', 'NAO_RECOLHIDO', 'VALIDADO_PELO_BANCO', 'RECOLHENDO') THEN UPPER(recolha_fgts)
                WHEN UPPER(COALESCE(recolha_fgts, '')) IN ('NAO RECOLHIDO') THEN 'NAO_RECOLHIDO'
                WHEN UPPER(COALESCE(recolha_fgts, '')) IN ('VALIDADO BANCO', 'VALIDADO PELO BANCO') THEN 'VALIDADO_PELO_BANCO'
                ELSE 'NAO_RECOLHIDO'
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
                WHEN UPPER(COALESCE(status_cca, '')) IN ('ASSINATURA_CAIXA', 'FINALIZADO') THEN 'VENDA_FINALIZADA'
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
    if clientes_table:
        db.execute(
            text(
                """
                UPDATE processos p
                SET sla_comercial_inicio_at = COALESCE(
                    p.sla_comercial_inicio_at,
                    (c.data_cadastro_origem::timestamp AT TIME ZONE 'UTC'),
                    c.created_at,
                    p.created_at
                )
                FROM clientes c
                WHERE c.id = p.cliente_id
                """
            )
        )
    else:
        db.execute(
            text(
                """
                UPDATE processos
                SET sla_comercial_inicio_at = COALESCE(sla_comercial_inicio_at, created_at)
                """
            )
        )
    db.execute(
        text(
            """
            UPDATE processos p
            SET sla_credito_inicio_at = ev.first_analise_at
            FROM (
                SELECT processo_id, MIN(created_at) AS first_analise_at
                FROM processo_eventos
                WHERE UPPER(COALESCE(actor_role, '')) = 'ANALISTA'
                  AND UPPER(COALESCE(event_type, '')) NOT IN ('PROCESSO_CRIADO', 'PROCESSO_IMPORTADO_PLANILHA', 'SLA_OWNER_CHANGE')
                GROUP BY processo_id
            ) ev
            WHERE p.id = ev.processo_id
              AND p.sla_credito_inicio_at IS NULL
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE processos p
            SET sla_comercial_fim_at = ev.first_venda_finalizada_at
            FROM (
                SELECT processo_id, MIN(created_at) AS first_venda_finalizada_at
                FROM processo_eventos
                WHERE UPPER(COALESCE(field_name, '')) = 'ESTAGIO_COMERCIAL'
                  AND UPPER(COALESCE(new_value, '')) = 'VENDA_FINALIZADA'
                GROUP BY processo_id
            ) ev
            WHERE p.id = ev.processo_id
              AND p.sla_comercial_fim_at IS NULL
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE processos
            SET sla_comercial_fim_at = COALESCE(sla_comercial_fim_at, updated_at)
            WHERE UPPER(COALESCE(estagio_comercial, '')) = 'VENDA_FINALIZADA'
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE processos
            SET sla_comercial_fim_at = NULL
            WHERE UPPER(COALESCE(estagio_comercial, '')) <> 'VENDA_FINALIZADA'
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE processos p
            SET sla_credito_fim_at = ev.first_assinatura_at
            FROM (
                SELECT processo_id, MIN(created_at) AS first_assinatura_at
                FROM processo_eventos
                WHERE UPPER(COALESCE(field_name, '')) = 'STATUS_CCA'
                  AND UPPER(COALESCE(new_value, '')) IN ('ASSINATURA_CAIXA', 'FINALIZADO')
                GROUP BY processo_id
            ) ev
            WHERE p.id = ev.processo_id
              AND p.sla_credito_fim_at IS NULL
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE processos
            SET sla_credito_fim_at = COALESCE(sla_credito_fim_at, updated_at)
            WHERE UPPER(COALESCE(status_cca, '')) IN ('ASSINATURA_CAIXA', 'FINALIZADO')
            """
        )
    )
    db.execute(
        text(
            """
            UPDATE processos
            SET sla_credito_fim_at = NULL
            WHERE UPPER(COALESCE(status_cca, '')) NOT IN ('ASSINATURA_CAIXA', 'FINALIZADO')
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
                    _ensure_monthly_repasse_archiving(db, _utcnow())
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


@app.get("/app/cca/analise")
def app_cca_analise_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role not in {ROLE_CCA, ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN}:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return _html_page("cca_analise.html")


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


@app.get("/app/corretor/precadastro")
def app_corretor_precadastro_page(request: Request):
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
    return _html_page("corretor_precadastro.html")


@app.get("/app/corretor/apresentacao")
def app_corretor_apresentacao_page(request: Request):
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
    return _html_page("corretor_apresentacao.html")


@app.get("/app/analista")
def app_analista_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role not in {ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO}:
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
    if role not in {ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO}:
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
    if role not in {ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO}:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return _html_page("analista_repasse.html")


@app.get("/app/analista/arquivados")
def app_analista_arquivados_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role not in {ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN}:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return _html_page("analista_arquivados.html")


@app.get("/app/analise")
def app_analise_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role not in {ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO}:
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
    if role not in {ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO}:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return _html_page("analista_importacao.html")


@app.get("/app/gestor-credito")
def app_gestor_credito_page(request: Request):
    session = _read_session(request)
    if not session:
        return RedirectResponse(url="/login", status_code=302)
    if bool(session.get("must_change_password")):
        return RedirectResponse(url="/app/trocar-senha", status_code=302)
    role = _normalize_role(str(session.get("role", "")))
    if role not in {ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN}:
        return RedirectResponse(url=_home_for_role(role), status_code=302)
    return _html_page("gestor_credito.html")


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
    if role not in {ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN}:
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
        # Auto-recupera seed full caso o runtime tenha ficado em admin_only apos manutencao.
        seed_mode_raw = (_get_runtime_meta(db, USERS_SEED_MODE_RUNTIME_KEY) or USERS_SEED_MODE_FULL).strip().lower()
        if seed_mode_raw == USERS_SEED_MODE_ADMIN_ONLY:
            try:
                _set_runtime_meta(db, USERS_SEED_MODE_RUNTIME_KEY, USERS_SEED_MODE_FULL)
                db.commit()
                global SEED_USERS_READY
                SEED_USERS_READY = False
                _ensure_seed_users(db, force=True)
                user = _get_user_by_username(db, username)
            except Exception:
                db.rollback()

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
    _: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
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
    _: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_CCA, ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Empreendimento)
        .filter(Empreendimento.is_active.is_(True))
        .order_by(func.lower(Empreendimento.nome).asc())
        .all()
    )
    return rows


@app.get("/app/api/corretor/pre-cadastros/stages")
def corretor_precadastro_stages(
    _: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_ADMIN)),
):
    return {"stages": LEAD_STAGE_VALUES}


@app.get("/app/api/corretor/pre-cadastros", response_model=list[LeadPreCadastroOut])
def corretor_list_pre_cadastros(
    session: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_ADMIN)),
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None),
    estagio: Optional[str] = Query(default=None),
    empreendimento: Optional[str] = Query(default=None),
    localidade: Optional[str] = Query(default=None),
    corretor: Optional[str] = Query(default=None),
    limit: int = Query(default=300, ge=1, le=1000),
):
    role = _normalize_role(str(session.get("role", "")))
    username = _normalize_username(str(session.get("username", "")))

    query = db.query(LeadPreCadastro)
    if role == ROLE_CORRETOR:
        query = query.filter(func.lower(func.trim(LeadPreCadastro.corretor_username)) == username)
    elif corretor:
        query = query.filter(func.lower(func.trim(LeadPreCadastro.corretor_username)) == _normalize_username(corretor))

    term = (q or "").strip().lower()
    estagio_norm = _lead_stage(estagio, fallback="") if estagio else ""
    empreendimento_term = (empreendimento or "").strip().lower()
    localidade_term = (localidade or "").strip().lower()

    if term:
        like = f"%{term}%"
        query = query.filter(
            or_(
                func.lower(func.coalesce(LeadPreCadastro.nome_cliente, "")).like(like),
                func.lower(func.coalesce(LeadPreCadastro.telefone, "")).like(like),
                func.lower(func.coalesce(LeadPreCadastro.whatsapp, "")).like(like),
                func.lower(func.coalesce(LeadPreCadastro.email, "")).like(like),
                func.lower(func.coalesce(LeadPreCadastro.cpf, "")).like(like),
                func.lower(func.coalesce(LeadPreCadastro.documento_identificacao, "")).like(like),
                func.lower(func.coalesce(LeadPreCadastro.decisao_cca, "")).like(like),
                func.lower(func.coalesce(LeadPreCadastro.empreendimento_interesse, "")).like(like),
                func.lower(func.coalesce(LeadPreCadastro.localidade_interesse, "")).like(like),
                func.lower(func.coalesce(LeadPreCadastro.local_agendamento, "")).like(like),
            )
        )
    if estagio_norm:
        query = query.filter(func.upper(func.coalesce(LeadPreCadastro.estagio_lead, "")) == estagio_norm)
    if empreendimento_term:
        query = query.filter(
            func.lower(func.coalesce(LeadPreCadastro.empreendimento_interesse, "")).like(f"%{empreendimento_term}%")
        )
    if localidade_term:
        query = query.filter(func.lower(func.coalesce(LeadPreCadastro.localidade_interesse, "")).like(f"%{localidade_term}%"))

    return query.order_by(LeadPreCadastro.updated_at.desc(), LeadPreCadastro.created_at.desc()).limit(limit).all()


@app.post("/app/api/corretor/pre-cadastros", response_model=LeadPreCadastroOut)
def corretor_create_pre_cadastro(
    payload: LeadPreCadastroCreate,
    session: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    role = _normalize_role(str(session.get("role", "")))
    actor_username = _normalize_username(str(session.get("username", "")))

    nome_cliente = _normalize_lead_text(payload.nome_cliente, max_len=220)
    if not nome_cliente:
        raise HTTPException(status_code=422, detail="Nome do cliente obrigatorio")

    empreendimento = _resolve_empreendimento_nome(db, payload.empreendimento_interesse) or _normalize_lead_text(
        payload.empreendimento_interesse,
        max_len=220,
    )
    estado_civil = _normalize_estado_civil(payload.estado_civil)
    certidao_numero = _normalize_lead_text(payload.certidao_numero, max_len=60)
    if estado_civil != "CASADO":
        certidao_numero = None

    lead = LeadPreCadastro(
        corretor_username=actor_username,
        nome_cliente=nome_cliente,
        telefone=_normalize_lead_phone(payload.telefone),
        whatsapp=_normalize_lead_phone(payload.whatsapp),
        email=_normalize_lead_email(payload.email),
        cpf=_normalize_lead_cpf(payload.cpf),
        documento_identificacao=_normalize_lead_documento(payload.documento_identificacao),
        estado_civil=estado_civil,
        certidao_numero=certidao_numero,
        cidade_nascimento=_normalize_lead_text(payload.cidade_nascimento, max_len=120),
        data_nascimento=payload.data_nascimento,
        endereco=_normalize_lead_text(payload.endereco, max_len=400),
        empreendimento_interesse=empreendimento,
        localidade_interesse=_normalize_lead_text(payload.localidade_interesse, max_len=220),
        local_agendamento=_normalize_lead_text(payload.local_agendamento, max_len=220),
        tipo_visita=_normalize_tipo_visita(payload.tipo_visita),
        data_agendamento=_as_utc(payload.data_agendamento),
        estagio_lead=_lead_stage(payload.estagio_lead, fallback="LEAD"),
        decisao_cca=_lead_cca_decision(payload.decisao_cca, fallback="EM_ANALISE"),
        contrato_assinado=bool(payload.contrato_assinado) if payload.contrato_assinado is not None else False,
        contrato_assinado_em=_utcnow() if bool(payload.contrato_assinado) else None,
        assinatura_email_confirmada=False,
        assinatura_email_confirmada_em=None,
        assinatura_email_token=None,
        assinatura_email_token_expires_at=None,
        assinatura_email_enviado_em=None,
        observacoes=_normalize_lead_text(payload.observacoes, max_len=2000),
        ultimo_contato_em=_as_utc(payload.ultimo_contato_em),
    )

    db.add(lead)
    db.flush()
    _record_system_log(
        db,
        actor_username=actor_username,
        actor_role=role,
        tela="corretor_precadastro",
        acao="LEAD_PRECADASTRO_CRIADO",
        entidade_tipo="lead_precadastro",
        entidade_id=str(lead.id),
        details=(
            f"cliente={lead.nome_cliente}; estagio={lead.estagio_lead}; "
            f"empreendimento={lead.empreendimento_interesse or '-'}"
        ),
    )
    db.commit()
    db.refresh(lead)
    return lead


@app.patch("/app/api/corretor/pre-cadastros/{lead_id}", response_model=LeadPreCadastroOut)
def corretor_update_pre_cadastro(
    lead_id: uuid.UUID,
    payload: LeadPreCadastroUpdate,
    session: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    role = _normalize_role(str(session.get("role", "")))
    actor_username = _normalize_username(str(session.get("username", "")))
    lead = db.get(LeadPreCadastro, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nao encontrado")
    if role == ROLE_CORRETOR and _normalize_username(lead.corretor_username) != actor_username:
        raise HTTPException(status_code=403, detail="Sem permissao para alterar este lead")

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return lead

    if "nome_cliente" in changes:
        nome_cliente = _normalize_lead_text(changes.get("nome_cliente"), max_len=220)
        if not nome_cliente:
            raise HTTPException(status_code=422, detail="Nome do cliente obrigatorio")
        lead.nome_cliente = nome_cliente
    if "telefone" in changes:
        lead.telefone = _normalize_lead_phone(changes.get("telefone"))
    if "whatsapp" in changes:
        lead.whatsapp = _normalize_lead_phone(changes.get("whatsapp"))
    if "email" in changes:
        next_email = _normalize_lead_email(changes.get("email"))
        if next_email != lead.email:
            lead.assinatura_email_confirmada = False
            lead.assinatura_email_confirmada_em = None
            lead.assinatura_email_token = None
            lead.assinatura_email_token_expires_at = None
            lead.assinatura_email_enviado_em = None
        lead.email = next_email
    if "cpf" in changes:
        lead.cpf = _normalize_lead_cpf(changes.get("cpf"))
    if "documento_identificacao" in changes:
        lead.documento_identificacao = _normalize_lead_documento(changes.get("documento_identificacao"))
    if "estado_civil" in changes:
        lead.estado_civil = _normalize_estado_civil(changes.get("estado_civil"))
        if lead.estado_civil != "CASADO":
            lead.certidao_numero = None
    if "certidao_numero" in changes:
        lead.certidao_numero = _normalize_lead_text(changes.get("certidao_numero"), max_len=60) if lead.estado_civil == "CASADO" else None
    if "cidade_nascimento" in changes:
        lead.cidade_nascimento = _normalize_lead_text(changes.get("cidade_nascimento"), max_len=120)
    if "data_nascimento" in changes:
        lead.data_nascimento = changes.get("data_nascimento")
    if "endereco" in changes:
        lead.endereco = _normalize_lead_text(changes.get("endereco"), max_len=400)
    if "empreendimento_interesse" in changes:
        lead.empreendimento_interesse = _resolve_empreendimento_nome(db, changes.get("empreendimento_interesse")) or _normalize_lead_text(
            changes.get("empreendimento_interesse"),
            max_len=220,
        )
    if "localidade_interesse" in changes:
        lead.localidade_interesse = _normalize_lead_text(changes.get("localidade_interesse"), max_len=220)
    if "local_agendamento" in changes:
        lead.local_agendamento = _normalize_lead_text(changes.get("local_agendamento"), max_len=220)
    if "tipo_visita" in changes:
        lead.tipo_visita = _normalize_tipo_visita(changes.get("tipo_visita"))
    if "data_agendamento" in changes:
        lead.data_agendamento = _as_utc(changes.get("data_agendamento"))
    if "estagio_lead" in changes:
        lead.estagio_lead = _lead_stage(changes.get("estagio_lead"), fallback=lead.estagio_lead or "LEAD")
    if "decisao_cca" in changes:
        lead.decisao_cca = _lead_cca_decision(changes.get("decisao_cca"), fallback=lead.decisao_cca or "EM_ANALISE")
    if "contrato_assinado" in changes:
        contrato_assinado = bool(changes.get("contrato_assinado"))
        if contrato_assinado and not bool(lead.contrato_assinado):
            lead.contrato_assinado = True
            lead.contrato_assinado_em = _utcnow()
        elif not contrato_assinado and bool(lead.contrato_assinado):
            lead.contrato_assinado = False
            lead.contrato_assinado_em = None
            lead.assinatura_email_confirmada = False
            lead.assinatura_email_confirmada_em = None
            lead.assinatura_email_token = None
            lead.assinatura_email_token_expires_at = None
            lead.assinatura_email_enviado_em = None
    if "observacoes" in changes:
        lead.observacoes = _normalize_lead_text(changes.get("observacoes"), max_len=2000)
    if "ultimo_contato_em" in changes:
        lead.ultimo_contato_em = _as_utc(changes.get("ultimo_contato_em"))

    _record_system_log(
        db,
        actor_username=actor_username,
        actor_role=role,
        tela="corretor_precadastro",
        acao="LEAD_PRECADASTRO_ATUALIZADO",
        entidade_tipo="lead_precadastro",
        entidade_id=str(lead.id),
        details=f"cliente={lead.nome_cliente}; estagio={lead.estagio_lead}",
    )
    db.commit()
    db.refresh(lead)
    return lead


@app.post("/app/api/corretor/pre-cadastros/{lead_id}/assinatura/enviar-confirmacao", response_model=LeadAssinaturaEmailOut)
def corretor_enviar_confirmacao_assinatura_email(
    lead_id: uuid.UUID,
    request: Request,
    session: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    role = _normalize_role(str(session.get("role", "")))
    actor_username = _normalize_username(str(session.get("username", "")))
    lead = db.get(LeadPreCadastro, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nao encontrado")
    if role == ROLE_CORRETOR and _normalize_username(lead.corretor_username) != actor_username:
        raise HTTPException(status_code=403, detail="Sem permissao para este lead")
    if not _is_email_delivery_configured():
        raise HTTPException(
            status_code=503,
            detail="Envio de e-mail nao configurado. Defina EMAIL_SMTP_HOST e EMAIL_SMTP_FROM no ambiente.",
        )
    if not lead.email:
        raise HTTPException(status_code=422, detail="Lead sem e-mail cadastrado para confirmacao de assinatura.")
    if not bool(lead.contrato_assinado):
        raise HTTPException(status_code=422, detail="Marque contrato assinado antes de enviar confirmacao por e-mail.")

    now = _utcnow()
    token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(hours=EMAIL_CONFIRM_TOKEN_TTL_HOURS)
    lead.assinatura_email_confirmada = False
    lead.assinatura_email_confirmada_em = None
    lead.assinatura_email_token = token
    lead.assinatura_email_token_expires_at = expires_at
    lead.assinatura_email_enviado_em = now

    link = _build_email_confirmation_link(request, token)
    subject = "Confirmacao de assinatura de contrato - SioCred"
    text_body = (
        f"Ola, {lead.nome_cliente}.\n\n"
        "Recebemos a assinatura do contrato e precisamos da sua confirmacao por e-mail.\n"
        "Clique no link abaixo para confirmar:\n\n"
        f"{link}\n\n"
        f"Este link expira em {EMAIL_CONFIRM_TOKEN_TTL_HOURS} hora(s).\n"
        "Se voce nao reconhece este envio, desconsidere."
    )
    try:
        _send_email_message(to_email=lead.email, subject=subject, text_body=text_body)
    except Exception as exc:
        db.rollback()
        logger.exception("Falha ao enviar e-mail de confirmacao de assinatura.")
        raise HTTPException(status_code=502, detail=f"Falha ao enviar e-mail de confirmacao: {exc}") from exc

    _record_system_log(
        db,
        actor_username=actor_username,
        actor_role=role,
        tela="corretor_precadastro",
        acao="LEAD_ASSINATURA_EMAIL_ENVIADO",
        entidade_tipo="lead_precadastro",
        entidade_id=str(lead.id),
        details=f"cliente={lead.nome_cliente}; email={lead.email}; expira={expires_at.isoformat()}",
    )
    db.commit()
    db.refresh(lead)
    return LeadAssinaturaEmailOut(
        lead_id=lead.id,
        email=lead.email,
        token_expires_at=lead.assinatura_email_token_expires_at or expires_at,
        enviado_em=lead.assinatura_email_enviado_em or now,
    )


@app.get("/app/assinatura/confirmar", response_class=HTMLResponse)
def app_confirmar_assinatura_email(token: str = Query(default=""), db: Session = Depends(get_db)):
    token_value = (token or "").strip()
    if not token_value:
        return HTMLResponse(
            "<h2>Link invalido</h2><p>Token de confirmacao nao informado.</p>",
            status_code=400,
        )
    now = _utcnow()
    lead = (
        db.query(LeadPreCadastro)
        .filter(LeadPreCadastro.assinatura_email_token == token_value)
        .first()
    )
    if not lead:
        return HTMLResponse(
            "<h2>Link invalido</h2><p>O link de confirmacao nao foi encontrado ou ja foi utilizado.</p>",
            status_code=404,
        )
    expires_at = _as_utc(getattr(lead, "assinatura_email_token_expires_at", None))
    if expires_at is None or expires_at < now:
        lead.assinatura_email_token = None
        lead.assinatura_email_token_expires_at = None
        db.commit()
        return HTMLResponse(
            "<h2>Link expirado</h2><p>Solicite um novo e-mail de confirmacao com o corretor.</p>",
            status_code=410,
        )
    lead.assinatura_email_confirmada = True
    lead.assinatura_email_confirmada_em = now
    lead.assinatura_email_token = None
    lead.assinatura_email_token_expires_at = None
    db.commit()
    return HTMLResponse(
        "<h2>Assinatura confirmada</h2><p>Obrigada. Sua confirmacao foi registrada com sucesso.</p>",
        status_code=200,
    )


@app.post("/app/api/corretor/pre-cadastros/{lead_id}/reservar", response_model=LeadReservaOut)
def corretor_reservar_pre_cadastro(
    lead_id: uuid.UUID,
    session: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    role = _normalize_role(str(session.get("role", "")))
    actor_username = _normalize_username(str(session.get("username", "")))
    lead = db.get(LeadPreCadastro, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nao encontrado")
    if role == ROLE_CORRETOR and _normalize_username(lead.corretor_username) != actor_username:
        raise HTTPException(status_code=403, detail="Sem permissao para reservar este lead")

    processo_existente = db.get(Processo, lead.processo_id) if getattr(lead, "processo_id", None) else None
    if processo_existente:
        now_existing = _utcnow()
        processo_existente.estagio_comercial = "EM_PROCESSO"
        lead.estagio_lead = "RESERVA"
        lead.reservado_em = lead.reservado_em or now_existing
        db.commit()
        _invalidate_process_list_cache()
        return LeadReservaOut(
            lead_id=lead.id,
            cliente_id=processo_existente.cliente_id,
            processo_id=processo_existente.id,
            estagio_lead=lead.estagio_lead,
            reservado_em=_as_utc(lead.reservado_em) or now_existing,
        )

    block_reason = _lead_reserva_block_reason(lead)
    if block_reason:
        raise HTTPException(status_code=422, detail=block_reason)

    now = _utcnow()
    decisao_cca = _lead_cca_decision(getattr(lead, "decisao_cca", None), fallback="EM_ANALISE")
    empreendimento_nome = _resolve_empreendimento_nome(db, lead.empreendimento_interesse) or _normalize_lead_text(
        lead.empreendimento_interesse,
        max_len=220,
    )
    corretor_nome = _normalize_corretor_nome_curto(lead.corretor_username) or (lead.corretor_username or "").strip() or None

    cliente = Cliente(
        nome=lead.nome_cliente,
        corretor=corretor_nome,
        obra=empreendimento_nome,
        imobiliaria=None,
        data_reserva_origem=now.date(),
        data_cadastro_origem=(lead.created_at.date() if getattr(lead, "created_at", None) else now.date()),
    )
    db.add(cliente)
    db.flush()

    processo = Processo(
        cliente_id=cliente.id,
        estagio_comercial="EM_PROCESSO",
        status_cca=decisao_cca,
        status_credito=("APROVADO" if decisao_cca == "APROVADO" else ("PENDENCIADO" if decisao_cca == "CONDICIONADO" else "EM_ANALISE")),
        status_geral=("EM_ANDAMENTO" if decisao_cca == "APROVADO" else ("PENDENCIADO" if decisao_cca == "CONDICIONADO" else "NOVO")),
        valor_cheque_moradia=_resolve_cheque_moradia_valor(db, empreendimento_nome),
        sla_comercial_inicio_at=_utc_start_of_day(cliente.data_cadastro_origem) or now,
    )
    _sync_estagio_repasse_rules(processo, now)
    _refresh_sla_fixed_markers(processo, now)
    _switch_sla_owner(processo, SLA_OWNER_ANALISTA, now)
    db.add(processo)
    db.flush()
    _ensure_default_documentos(db, processo.id, autocommit=False)
    _record_processo_event(
        db,
        processo_id=processo.id,
        actor_username=actor_username,
        actor_role=role,
        event_type="PROCESSO_CRIADO_LEAD_RESERVA",
        details=f"lead_id={lead.id}; cliente={cliente.nome}",
    )

    lead.estagio_lead = "RESERVA"
    lead.processo_id = processo.id
    lead.reservado_em = now

    _record_system_log(
        db,
        actor_username=actor_username,
        actor_role=role,
        tela="corretor_precadastro",
        acao="LEAD_CONVERTIDO_RESERVA",
        entidade_tipo="lead_precadastro",
        entidade_id=str(lead.id),
        details=(
            f"cliente={cliente.nome}; processo_id={processo.id}; "
            f"empreendimento={cliente.obra or '-'}; cheque_moradia={processo.valor_cheque_moradia or 0}"
        ),
    )

    db.commit()
    _invalidate_process_list_cache()
    return LeadReservaOut(
        lead_id=lead.id,
        cliente_id=cliente.id,
        processo_id=processo.id,
        estagio_lead=lead.estagio_lead,
        reservado_em=lead.reservado_em or now,
    )


@app.get("/app/api/corretor/unidades/status")
def corretor_unidades_status(
    _: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_ADMIN)),
):
    return {"status": UNIDADE_STATUS_VALUES}


@app.get("/app/api/corretor/unidades", response_model=list[UnidadeDisponivelOut])
def corretor_list_unidades(
    _: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_ADMIN)),
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None),
    empreendimento: Optional[str] = Query(default=None),
    tipologia: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    quartos_min: Optional[int] = Query(default=None, ge=0, le=20),
    preco_max: Optional[float] = Query(default=None, ge=0),
    somente_disponiveis: bool = Query(default=True),
    limit: int = Query(default=300, ge=1, le=1000),
):
    query = db.query(UnidadeDisponivel)

    term = (q or "").strip().lower()
    empreendimento_term = (empreendimento or "").strip().lower()
    tipologia_term = (tipologia or "").strip().lower()
    status_norm = _unidade_status(status, fallback="") if status else ""

    if term:
        like = f"%{term}%"
        query = query.filter(
            or_(
                func.lower(func.coalesce(UnidadeDisponivel.empreendimento, "")).like(like),
                func.lower(func.coalesce(UnidadeDisponivel.unidade, "")).like(like),
                func.lower(func.coalesce(UnidadeDisponivel.bloco, "")).like(like),
                func.lower(func.coalesce(UnidadeDisponivel.tipologia, "")).like(like),
                func.lower(func.coalesce(UnidadeDisponivel.localizacao, "")).like(like),
                func.lower(func.coalesce(UnidadeDisponivel.diferenciais, "")).like(like),
            )
        )
    if empreendimento_term:
        query = query.filter(func.lower(func.coalesce(UnidadeDisponivel.empreendimento, "")).like(f"%{empreendimento_term}%"))
    if tipologia_term:
        query = query.filter(func.lower(func.coalesce(UnidadeDisponivel.tipologia, "")).like(f"%{tipologia_term}%"))
    if status_norm:
        query = query.filter(func.upper(func.coalesce(UnidadeDisponivel.status_unidade, "")) == status_norm)
    elif somente_disponiveis:
        query = query.filter(func.upper(func.coalesce(UnidadeDisponivel.status_unidade, "")) == "DISPONIVEL")

    if quartos_min is not None:
        query = query.filter(func.coalesce(UnidadeDisponivel.quartos, 0) >= int(quartos_min))
    if preco_max is not None:
        query = query.filter(func.coalesce(UnidadeDisponivel.valor, 0) <= float(preco_max))

    status_order = (
        "CASE UPPER(COALESCE(status_unidade, '')) "
        "WHEN 'DISPONIVEL' THEN 0 "
        "WHEN 'RESERVADA' THEN 1 "
        "WHEN 'BLOQUEADA' THEN 2 "
        "WHEN 'VENDIDA' THEN 3 "
        "ELSE 9 END"
    )
    return (
        query.order_by(
            text(status_order),
            UnidadeDisponivel.valor.asc().nullslast(),
            UnidadeDisponivel.updated_at.desc(),
        )
        .limit(limit)
        .all()
    )


@app.get("/app/api/corretor/unidades/metricas", response_model=UnidadeDisponivelMetricasOut)
def corretor_unidades_metricas(
    _: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    total = int(db.query(func.count(UnidadeDisponivel.id)).scalar() or 0)
    disponiveis = int(
        db.query(func.count(UnidadeDisponivel.id))
        .filter(func.upper(func.coalesce(UnidadeDisponivel.status_unidade, "")) == "DISPONIVEL")
        .scalar()
        or 0
    )
    ticket_medio = float(
        db.query(func.avg(UnidadeDisponivel.valor))
        .filter(
            UnidadeDisponivel.valor.isnot(None),
            func.upper(func.coalesce(UnidadeDisponivel.status_unidade, "")) == "DISPONIVEL",
        )
        .scalar()
        or 0.0
    )
    area_media = float(
        db.query(func.avg(UnidadeDisponivel.area_m2))
        .filter(
            UnidadeDisponivel.area_m2.isnot(None),
            func.upper(func.coalesce(UnidadeDisponivel.status_unidade, "")) == "DISPONIVEL",
        )
        .scalar()
        or 0.0
    )
    empreendimentos = int(
        db.query(func.count(func.distinct(func.lower(func.coalesce(UnidadeDisponivel.empreendimento, "")))))
        .filter(UnidadeDisponivel.empreendimento.isnot(None))
        .scalar()
        or 0
    )
    return UnidadeDisponivelMetricasOut(
        total=total,
        disponiveis=disponiveis,
        ticket_medio=ticket_medio,
        area_media=area_media,
        empreendimentos=empreendimentos,
    )


@app.post("/app/api/corretor/unidades", response_model=UnidadeDisponivelOut)
def corretor_create_unidade(
    payload: UnidadeDisponivelCreate,
    session: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    actor_username = _normalize_username(str(session.get("username", "")))
    actor_role = _normalize_role(str(session.get("role", "")))

    empreendimento = _resolve_empreendimento_nome(db, payload.empreendimento) or _normalize_unidade_text(
        payload.empreendimento,
        max_len=220,
    )
    unidade = _normalize_unidade_text(payload.unidade, max_len=80)
    if not empreendimento:
        raise HTTPException(status_code=422, detail="Empreendimento obrigatorio")
    if not unidade:
        raise HTTPException(status_code=422, detail="Identificacao da unidade obrigatoria")

    exists = (
        db.query(UnidadeDisponivel.id)
        .filter(
            func.lower(func.trim(func.coalesce(UnidadeDisponivel.empreendimento, ""))) == empreendimento.strip().lower(),
            func.lower(func.trim(func.coalesce(UnidadeDisponivel.unidade, ""))) == unidade.strip().lower(),
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Unidade ja cadastrada para esse empreendimento")

    unidade_db = UnidadeDisponivel(
        created_by_username=actor_username,
        empreendimento=empreendimento,
        unidade=unidade,
        bloco=_normalize_unidade_text(payload.bloco, max_len=80),
        tipologia=_normalize_unidade_text(payload.tipologia, max_len=120),
        quartos=_normalize_unidade_positive_int(payload.quartos, min_value=0, max_value=20),
        banheiros=_normalize_unidade_positive_int(payload.banheiros, min_value=0, max_value=20),
        vagas=_normalize_unidade_positive_int(payload.vagas, min_value=0, max_value=20),
        area_m2=_normalize_unidade_positive_float(payload.area_m2, min_value=0.0, max_value=5000.0),
        valor=_normalize_unidade_positive_float(payload.valor, min_value=0.0),
        localizacao=_normalize_unidade_text(payload.localizacao, max_len=220),
        diferenciais=_normalize_unidade_text(payload.diferenciais, max_len=1500),
        url_imagem=_normalize_unidade_text(payload.url_imagem, max_len=700),
        visita_disponivel=bool(payload.visita_disponivel if payload.visita_disponivel is not None else True),
        status_unidade=_unidade_status(payload.status_unidade, fallback="DISPONIVEL"),
    )
    db.add(unidade_db)
    db.flush()
    _record_system_log(
        db,
        actor_username=actor_username,
        actor_role=actor_role,
        tela="corretor_apresentacao",
        acao="UNIDADE_CADASTRADA",
        entidade_tipo="unidade",
        entidade_id=str(unidade_db.id),
        details=f"empreendimento={unidade_db.empreendimento}; unidade={unidade_db.unidade}; status={unidade_db.status_unidade}",
    )
    db.commit()
    db.refresh(unidade_db)
    return unidade_db


@app.patch("/app/api/corretor/unidades/{unidade_id}", response_model=UnidadeDisponivelOut)
def corretor_update_unidade(
    unidade_id: uuid.UUID,
    payload: UnidadeDisponivelUpdate,
    session: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    actor_username = _normalize_username(str(session.get("username", "")))
    actor_role = _normalize_role(str(session.get("role", "")))
    unidade = db.get(UnidadeDisponivel, unidade_id)
    if not unidade:
        raise HTTPException(status_code=404, detail="Unidade nao encontrada")

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return unidade

    empreendimento_normalizado = unidade.empreendimento
    unidade_normalizada = unidade.unidade
    if "empreendimento" in changes:
        empreendimento_normalizado = _resolve_empreendimento_nome(db, changes.get("empreendimento")) or _normalize_unidade_text(
            changes.get("empreendimento"),
            max_len=220,
        )
        if not empreendimento_normalizado:
            raise HTTPException(status_code=422, detail="Empreendimento obrigatorio")
    if "unidade" in changes:
        unidade_normalizada = _normalize_unidade_text(changes.get("unidade"), max_len=80)
        if not unidade_normalizada:
            raise HTTPException(status_code=422, detail="Identificacao da unidade obrigatoria")

    if empreendimento_normalizado != unidade.empreendimento or unidade_normalizada != unidade.unidade:
        exists = (
            db.query(UnidadeDisponivel.id)
            .filter(
                UnidadeDisponivel.id != unidade.id,
                func.lower(func.trim(func.coalesce(UnidadeDisponivel.empreendimento, ""))) == empreendimento_normalizado.strip().lower(),
                func.lower(func.trim(func.coalesce(UnidadeDisponivel.unidade, ""))) == unidade_normalizada.strip().lower(),
            )
            .first()
        )
        if exists:
            raise HTTPException(status_code=409, detail="Ja existe outra unidade com esse identificador")

    unidade.empreendimento = empreendimento_normalizado
    unidade.unidade = unidade_normalizada
    if "bloco" in changes:
        unidade.bloco = _normalize_unidade_text(changes.get("bloco"), max_len=80)
    if "tipologia" in changes:
        unidade.tipologia = _normalize_unidade_text(changes.get("tipologia"), max_len=120)
    if "quartos" in changes:
        unidade.quartos = _normalize_unidade_positive_int(changes.get("quartos"), min_value=0, max_value=20)
    if "banheiros" in changes:
        unidade.banheiros = _normalize_unidade_positive_int(changes.get("banheiros"), min_value=0, max_value=20)
    if "vagas" in changes:
        unidade.vagas = _normalize_unidade_positive_int(changes.get("vagas"), min_value=0, max_value=20)
    if "area_m2" in changes:
        unidade.area_m2 = _normalize_unidade_positive_float(changes.get("area_m2"), min_value=0.0, max_value=5000.0)
    if "valor" in changes:
        unidade.valor = _normalize_unidade_positive_float(changes.get("valor"), min_value=0.0)
    if "localizacao" in changes:
        unidade.localizacao = _normalize_unidade_text(changes.get("localizacao"), max_len=220)
    if "diferenciais" in changes:
        unidade.diferenciais = _normalize_unidade_text(changes.get("diferenciais"), max_len=1500)
    if "url_imagem" in changes:
        unidade.url_imagem = _normalize_unidade_text(changes.get("url_imagem"), max_len=700)
    if "visita_disponivel" in changes:
        unidade.visita_disponivel = bool(changes.get("visita_disponivel"))
    if "status_unidade" in changes:
        unidade.status_unidade = _unidade_status(changes.get("status_unidade"), fallback=unidade.status_unidade or "DISPONIVEL")

    _record_system_log(
        db,
        actor_username=actor_username,
        actor_role=actor_role,
        tela="corretor_apresentacao",
        acao="UNIDADE_ATUALIZADA",
        entidade_tipo="unidade",
        entidade_id=str(unidade.id),
        details=f"empreendimento={unidade.empreendimento}; unidade={unidade.unidade}; status={unidade.status_unidade}",
    )
    db.commit()
    db.refresh(unidade)
    return unidade


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


@app.get("/app/api/admin/empreendimentos/regras-financeiras", response_model=list[EmpreendimentoRegraFinanceiraOut])
def admin_list_empreendimento_regras_financeiras(
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    empreendimentos = db.query(Empreendimento).order_by(func.lower(Empreendimento.nome).asc()).all()
    regras = db.query(EmpreendimentoRegraFinanceira).all()
    regras_map: dict[uuid.UUID, EmpreendimentoRegraFinanceira] = {
        regra.empreendimento_id: regra for regra in regras if getattr(regra, "empreendimento_id", None)
    }
    now = _utcnow()
    output: list[EmpreendimentoRegraFinanceiraOut] = []
    for emp in empreendimentos:
        regra = regras_map.get(emp.id)
        output.append(
            EmpreendimentoRegraFinanceiraOut(
                empreendimento_id=emp.id,
                empreendimento_nome=emp.nome,
                valor_cheque_moradia=float(getattr(regra, "valor_cheque_moradia", 0.0) or 0.0),
                updated_at=getattr(regra, "updated_at", None) or getattr(emp, "updated_at", None) or now,
            )
        )
    return output


@app.put("/app/api/admin/empreendimentos/{empreendimento_id}/regra-financeira", response_model=EmpreendimentoRegraFinanceiraOut)
def admin_upsert_empreendimento_regra_financeira(
    empreendimento_id: uuid.UUID,
    payload: EmpreendimentoRegraFinanceiraPayload,
    session: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    empreendimento = db.get(Empreendimento, empreendimento_id)
    if not empreendimento:
        raise HTTPException(status_code=404, detail="Empreendimento nao encontrado")

    valor = _coerce_optional_currency(payload.valor_cheque_moradia, "Valor do cheque moradia")
    if valor is None:
        valor = 0.0

    regra = (
        db.query(EmpreendimentoRegraFinanceira)
        .filter(EmpreendimentoRegraFinanceira.empreendimento_id == empreendimento_id)
        .first()
    )
    if not regra:
        regra = EmpreendimentoRegraFinanceira(
            empreendimento_id=empreendimento_id,
            valor_cheque_moradia=valor,
        )
        db.add(regra)
    else:
        regra.valor_cheque_moradia = valor

    _record_system_log(
        db,
        actor_username=_normalize_username(str(session.get("username", ""))),
        actor_role=_normalize_role(str(session.get("role", ""))),
        tela="admin",
        acao="EMPREENDIMENTO_REGRA_FINANCEIRA_ATUALIZADA",
        entidade_tipo="empreendimento",
        entidade_id=str(empreendimento.id),
        details=f"nome={empreendimento.nome}; valor_cheque_moradia={valor}",
    )
    db.commit()
    db.refresh(regra)
    return EmpreendimentoRegraFinanceiraOut(
        empreendimento_id=empreendimento.id,
        empreendimento_nome=empreendimento.nome,
        valor_cheque_moradia=float(regra.valor_cheque_moradia or 0.0),
        updated_at=regra.updated_at or _utcnow(),
    )


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


@app.get("/app/api/admin/storage-summary", response_model=AdminStorageSummaryOut)
def admin_storage_summary(
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    _ensure_monthly_repasse_archiving(db, _utcnow())

    total_clientes = int(db.query(func.count(Cliente.id)).scalar() or 0)
    total_processos = int(db.query(func.count(Processo.id)).scalar() or 0)
    total_processos_arquivados = int(
        db.query(func.count(Processo.id)).filter(Processo.arquivado.is_(True)).scalar() or 0
    )
    total_pre_cadastros = int(db.query(func.count(LeadPreCadastro.id)).scalar() or 0)
    total_unidades_disponiveis = int(db.query(func.count(UnidadeDisponivel.id)).scalar() or 0)
    total_processos_ativos = int(
        db.query(func.count(Processo.id)).filter(_processos_ativos_clause()).scalar() or 0
    )
    total_documentos = int(db.query(func.count(Documento.id)).scalar() or 0)
    total_eventos_processo = int(db.query(func.count(ProcessoEvento.id)).scalar() or 0)
    total_logs_sistema = int(db.query(func.count(SistemaLog.id)).scalar() or 0)
    total_usuarios = int(db.query(func.count(AppUser.id)).scalar() or 0)
    total_empreendimentos = int(db.query(func.count(Empreendimento.id)).scalar() or 0)
    total_registros_monitorados = (
        total_clientes
        + total_processos
        + total_pre_cadastros
        + total_unidades_disponiveis
        + total_documentos
        + total_eventos_processo
        + total_logs_sistema
        + total_usuarios
        + total_empreendimentos
    )

    return AdminStorageSummaryOut(
        total_clientes=total_clientes,
        total_processos=total_processos,
        total_processos_ativos=total_processos_ativos,
        total_processos_arquivados=total_processos_arquivados,
        total_pre_cadastros=total_pre_cadastros,
        total_unidades_disponiveis=total_unidades_disponiveis,
        total_documentos=total_documentos,
        total_eventos_processo=total_eventos_processo,
        total_logs_sistema=total_logs_sistema,
        total_usuarios=total_usuarios,
        total_empreendimentos=total_empreendimentos,
        total_registros_monitorados=total_registros_monitorados,
    )


@app.get("/app/api/layout-preference", response_model=LayoutPreferenceOut)
def app_get_layout_preference(
    _: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_CCA, ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    return LayoutPreferenceOut(
        blackhole_enabled=_is_blackhole_layout_enabled(db),
        fonte="runtime",
    )


@app.get("/app/api/admin/layout-preference", response_model=LayoutPreferenceOut)
def admin_get_layout_preference(
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    return LayoutPreferenceOut(
        blackhole_enabled=_is_blackhole_layout_enabled(db),
        fonte="runtime",
    )


@app.put("/app/api/admin/layout-preference", response_model=LayoutPreferenceOut)
def admin_set_layout_preference(
    payload: LayoutPreferencePayload,
    session: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    enabled = bool(payload.blackhole_enabled)
    _set_runtime_meta(db, LAYOUT_BLACKHOLE_RUNTIME_KEY, "1" if enabled else "0")
    _record_system_log(
        db,
        actor_username=_normalize_username(str(session.get("username", ""))),
        actor_role=_normalize_role(str(session.get("role", ""))),
        tela="admin",
        acao="LAYOUT_PREFERENCIA_ATUALIZADA",
        entidade_tipo="configuracao",
        entidade_id=LAYOUT_BLACKHOLE_RUNTIME_KEY,
        details=f"blackhole_enabled={enabled}",
    )
    db.commit()
    return LayoutPreferenceOut(blackhole_enabled=enabled, fonte="runtime")


def _normalize_maintenance_entity(value: Optional[str]) -> str:
    raw = (value or "").strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "cliente": "cliente",
        "clientes": "cliente",
        "processo": "processo",
        "processos": "processo",
        "documento": "documento",
        "documentos": "documento",
        "usuario": "usuario",
        "usuarios": "usuario",
        "app_user": "usuario",
        "app_users": "usuario",
        "empreendimento": "empreendimento",
        "empreendimentos": "empreendimento",
        "unidade": "unidade",
        "unidades": "unidade",
        "unidade_disponivel": "unidade",
        "unidades_disponiveis": "unidade",
        "processo_evento": "processo_evento",
        "processo_eventos": "processo_evento",
        "evento": "processo_evento",
        "eventos": "processo_evento",
        "sistema_log": "sistema_log",
        "sistema_logs": "sistema_log",
        "log": "sistema_log",
        "logs": "sistema_log",
    }
    return aliases.get(raw, "")


@app.get("/app/api/admin/maintenance/search-registros", response_model=AdminRegistroLookupOut)
def admin_search_registros(
    entidade: str = Query(...),
    q: str = Query(..., min_length=1),
    limit: int = Query(default=20, ge=1, le=100),
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    entidade_norm = _normalize_maintenance_entity(entidade)
    if not entidade_norm:
        raise HTTPException(
            status_code=422,
            detail=(
                "Entidade invalida. Use: cliente, processo, documento, usuario, "
                "empreendimento, unidade, processo_evento ou sistema_log."
            ),
        )

    termo = (q or "").strip()
    if len(termo) < 2:
        raise HTTPException(status_code=422, detail="Digite ao menos 2 caracteres para buscar.")

    termo_like = f"%{termo.lower()}%"
    uuid_term: Optional[uuid.UUID] = None
    try:
        uuid_term = uuid.UUID(termo)
    except ValueError:
        uuid_term = None

    itens: list[AdminRegistroLookupItem] = []

    if entidade_norm == "cliente":
        query = db.query(Cliente)
        filtros = or_(
            func.lower(func.coalesce(Cliente.nome, "")).like(termo_like),
            func.lower(func.coalesce(Cliente.corretor, "")).like(termo_like),
            func.lower(func.coalesce(Cliente.obra, "")).like(termo_like),
            func.lower(func.coalesce(Cliente.imobiliaria, "")).like(termo_like),
        )
        if uuid_term:
            filtros = or_(filtros, Cliente.id == uuid_term)
        rows = query.filter(filtros).order_by(Cliente.created_at.desc()).limit(limit).all()
        for item in rows:
            detalhe = f"Corretor: {item.corretor or '-'} | Obra: {item.obra or '-'} | Imobiliaria: {item.imobiliaria or '-'}"
            itens.append(AdminRegistroLookupItem(id=item.id, titulo=item.nome or "-", detalhe=detalhe))

    elif entidade_norm == "processo":
        query = db.query(Processo, Cliente).join(Cliente, Processo.cliente_id == Cliente.id)
        filtros = or_(
            func.lower(func.coalesce(Cliente.nome, "")).like(termo_like),
            func.lower(func.coalesce(Cliente.corretor, "")).like(termo_like),
            func.lower(func.coalesce(Cliente.obra, "")).like(termo_like),
            func.lower(func.coalesce(Processo.estagio_comercial, "")).like(termo_like),
            func.lower(func.coalesce(Processo.status_cca, "")).like(termo_like),
            func.lower(func.coalesce(Processo.status_agehab, "")).like(termo_like),
        )
        if uuid_term:
            filtros = or_(filtros, Processo.id == uuid_term, Processo.cliente_id == uuid_term)
        rows = query.filter(filtros).order_by(Processo.updated_at.desc()).limit(limit).all()
        for processo, cliente in rows:
            detalhe = (
                f"Cliente: {cliente.nome or '-'} | Obra: {cliente.obra or '-'} | "
                f"Comercial: {_process_estagio_comercial(processo.estagio_comercial)} | Caixa: {processo.status_cca}"
            )
            itens.append(AdminRegistroLookupItem(id=processo.id, titulo=f"Processo de {cliente.nome or '-'}", detalhe=detalhe))

    elif entidade_norm == "documento":
        query = (
            db.query(Documento, Processo, Cliente)
            .join(Processo, Documento.processo_id == Processo.id)
            .join(Cliente, Processo.cliente_id == Cliente.id)
        )
        filtros = or_(
            func.lower(func.coalesce(Documento.nome, "")).like(termo_like),
            func.lower(func.coalesce(Documento.categoria, "")).like(termo_like),
            func.lower(func.coalesce(Documento.status_credito, "")).like(termo_like),
            func.lower(func.coalesce(Cliente.nome, "")).like(termo_like),
            func.lower(func.coalesce(Cliente.obra, "")).like(termo_like),
        )
        if uuid_term:
            filtros = or_(filtros, Documento.id == uuid_term, Documento.processo_id == uuid_term, Processo.cliente_id == uuid_term)
        rows = query.filter(filtros).order_by(Documento.updated_at.desc()).limit(limit).all()
        for doc, processo, cliente in rows:
            detalhe = (
                f"Cliente: {cliente.nome or '-'} | Categoria: {doc.categoria or '-'} | "
                f"Status: {doc.status_credito or '-'} | Processo: {str(processo.id)[:8]}"
            )
            itens.append(AdminRegistroLookupItem(id=doc.id, titulo=doc.nome or "-", detalhe=detalhe))

    elif entidade_norm == "usuario":
        query = db.query(AppUser)
        filtros = or_(
            func.lower(func.coalesce(AppUser.username, "")).like(termo_like),
            func.lower(func.coalesce(AppUser.role, "")).like(termo_like),
        )
        if uuid_term:
            filtros = or_(filtros, AppUser.id == uuid_term)
        rows = query.filter(filtros).order_by(func.lower(AppUser.username).asc()).limit(limit).all()
        for user in rows:
            detalhe = f"Perfil: {user.role} | Ativo: {'Sim' if user.is_active else 'Nao'} | Troca senha: {'Sim' if user.must_change_password else 'Nao'}"
            itens.append(AdminRegistroLookupItem(id=user.id, titulo=user.username or "-", detalhe=detalhe))

    elif entidade_norm == "empreendimento":
        query = db.query(Empreendimento)
        filtros = func.lower(func.coalesce(Empreendimento.nome, "")).like(termo_like)
        if uuid_term:
            filtros = or_(filtros, Empreendimento.id == uuid_term)
        rows = query.filter(filtros).order_by(func.lower(Empreendimento.nome).asc()).limit(limit).all()
        for emp in rows:
            detalhe = f"Ativo: {'Sim' if emp.is_active else 'Nao'}"
            itens.append(AdminRegistroLookupItem(id=emp.id, titulo=emp.nome or "-", detalhe=detalhe))

    elif entidade_norm == "unidade":
        query = db.query(UnidadeDisponivel)
        filtros = or_(
            func.lower(func.coalesce(UnidadeDisponivel.empreendimento, "")).like(termo_like),
            func.lower(func.coalesce(UnidadeDisponivel.unidade, "")).like(termo_like),
            func.lower(func.coalesce(UnidadeDisponivel.tipologia, "")).like(termo_like),
            func.lower(func.coalesce(UnidadeDisponivel.status_unidade, "")).like(termo_like),
        )
        if uuid_term:
            filtros = or_(filtros, UnidadeDisponivel.id == uuid_term)
        rows = query.filter(filtros).order_by(UnidadeDisponivel.updated_at.desc()).limit(limit).all()
        for unit in rows:
            detalhe = (
                f"Empreendimento: {unit.empreendimento or '-'} | "
                f"Status: {unit.status_unidade or '-'} | Valor: {unit.valor or '-'}"
            )
            itens.append(AdminRegistroLookupItem(id=unit.id, titulo=unit.unidade or "-", detalhe=detalhe))

    elif entidade_norm == "processo_evento":
        query = db.query(ProcessoEvento)
        filtros = or_(
            func.lower(func.coalesce(ProcessoEvento.actor_username, "")).like(termo_like),
            func.lower(func.coalesce(ProcessoEvento.event_type, "")).like(termo_like),
            func.lower(func.coalesce(ProcessoEvento.field_name, "")).like(termo_like),
            func.lower(func.coalesce(ProcessoEvento.details, "")).like(termo_like),
        )
        if uuid_term:
            filtros = or_(filtros, ProcessoEvento.id == uuid_term, ProcessoEvento.processo_id == uuid_term)
        rows = query.filter(filtros).order_by(ProcessoEvento.created_at.desc()).limit(limit).all()
        for ev in rows:
            detalhe = (
                f"Actor: {ev.actor_username or '-'} | Campo: {ev.field_name or '-'} | "
                f"Novo: {ev.new_value or '-'} | Processo: {str(ev.processo_id)[:8]}"
            )
            itens.append(AdminRegistroLookupItem(id=ev.id, titulo=ev.event_type or "EVENT", detalhe=detalhe))

    elif entidade_norm == "sistema_log":
        query = db.query(SistemaLog)
        filtros = or_(
            func.lower(func.coalesce(SistemaLog.actor_username, "")).like(termo_like),
            func.lower(func.coalesce(SistemaLog.tela, "")).like(termo_like),
            func.lower(func.coalesce(SistemaLog.acao, "")).like(termo_like),
            func.lower(func.coalesce(SistemaLog.details, "")).like(termo_like),
        )
        if uuid_term:
            filtros = or_(filtros, SistemaLog.id == uuid_term)
        rows = query.filter(filtros).order_by(SistemaLog.created_at.desc()).limit(limit).all()
        for log in rows:
            detalhe = f"Tela: {log.tela or '-'} | Usuario: {log.actor_username or '-'} | Acao: {log.acao or '-'}"
            itens.append(AdminRegistroLookupItem(id=log.id, titulo=log.details or "Log do sistema", detalhe=detalhe))

    return AdminRegistroLookupOut(
        entidade=entidade_norm,
        total=len(itens),
        itens=itens,
    )


@app.post("/app/api/admin/maintenance/delete-registro")
def admin_delete_registro(
    payload: AdminDeleteRegistroPayload,
    session: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    entidade = _normalize_maintenance_entity(payload.entidade)
    if not entidade:
        raise HTTPException(
            status_code=422,
            detail=(
                "Entidade invalida. Use: cliente, processo, documento, usuario, "
                "empreendimento, unidade, processo_evento ou sistema_log."
            ),
        )

    actor_username = _normalize_username(str(session.get("username", "")))
    actor_role = _normalize_role(str(session.get("role", "")))
    entity_map: dict[str, Any] = {
        "cliente": Cliente,
        "processo": Processo,
        "documento": Documento,
        "usuario": AppUser,
        "empreendimento": Empreendimento,
        "unidade": UnidadeDisponivel,
        "processo_evento": ProcessoEvento,
        "sistema_log": SistemaLog,
    }
    model = entity_map[entidade]
    registro = db.get(model, payload.registro_id)
    if not registro:
        raise HTTPException(status_code=404, detail="Registro nao encontrado")

    if entidade == "usuario":
        actor_user_id = str(session.get("user_id", ""))
        if actor_user_id and actor_user_id == str(registro.id):
            raise HTTPException(status_code=422, detail="Admin nao pode excluir a propria conta")
        registro_username = _normalize_username(getattr(registro, "username", ""))
        if registro_username in {_normalize_username(RESET_ADMIN_USERNAME), _normalize_username(APP_ADMIN_USER)}:
            raise HTTPException(status_code=422, detail="Usuario administrador principal nao pode ser excluido")

    identificador = str(payload.registro_id)
    resumo = None
    if hasattr(registro, "username"):
        resumo = f"username={getattr(registro, 'username', '')}"
    elif hasattr(registro, "nome"):
        resumo = f"nome={getattr(registro, 'nome', '')}"
    elif hasattr(registro, "event_type"):
        resumo = f"event_type={getattr(registro, 'event_type', '')}"
    elif hasattr(registro, "acao"):
        resumo = f"acao={getattr(registro, 'acao', '')}"

    if entidade != "sistema_log":
        details = f"entidade={entidade}; registro_id={identificador}"
        if resumo:
            details += f"; {resumo}"
        if payload.motivo:
            details += f"; motivo={payload.motivo.strip()[:400]}"
        _record_system_log(
            db,
            actor_username=actor_username,
            actor_role=actor_role,
            tela="admin",
            acao="REGISTRO_EXCLUIDO_DEFINITIVO",
            entidade_tipo=entidade,
            entidade_id=identificador,
            details=details,
        )

    if entidade == "usuario":
        _drop_sessions_for_user(registro.id)
    db.delete(registro)
    db.commit()
    _invalidate_process_list_cache()

    return {
        "ok": True,
        "entidade": entidade,
        "registro_id": identificador,
    }


@app.post("/app/api/admin/maintenance/purge-historicos")
def admin_purge_historicos(
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    eventos_total = int(db.query(func.count(ProcessoEvento.id)).scalar() or 0)
    logs_total = int(db.query(func.count(SistemaLog.id)).scalar() or 0)

    db.query(ProcessoEvento).delete(synchronize_session=False)
    db.query(SistemaLog).delete(synchronize_session=False)
    db.commit()
    _invalidate_process_list_cache()

    return {
        "ok": True,
        "processo_eventos_removidos": eventos_total,
        "sistema_logs_removidos": logs_total,
    }


@app.post("/app/api/admin/maintenance/reset-sistema")
def admin_reset_sistema(
    _: dict[str, Any] = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    global SEED_USERS_READY

    clientes_total = int(db.query(func.count(Cliente.id)).scalar() or 0)
    processos_total = int(db.query(func.count(Processo.id)).scalar() or 0)
    documentos_total = int(db.query(func.count(Documento.id)).scalar() or 0)
    empreendimentos_total = int(db.query(func.count(Empreendimento.id)).scalar() or 0)
    unidades_total = int(db.query(func.count(UnidadeDisponivel.id)).scalar() or 0)
    eventos_total = int(db.query(func.count(ProcessoEvento.id)).scalar() or 0)
    logs_total = int(db.query(func.count(SistemaLog.id)).scalar() or 0)
    usuarios_total = int(db.query(func.count(AppUser.id)).scalar() or 0)
    runtime_meta_total = 0
    runtime_meta_exists = bool(db.execute(text("SELECT to_regclass('public.app_runtime_meta')")).scalar())
    if runtime_meta_exists:
        runtime_meta_total = int(db.execute(text("SELECT COUNT(*) FROM app_runtime_meta")).scalar() or 0)

    db.query(Documento).delete(synchronize_session=False)
    db.query(ProcessoEvento).delete(synchronize_session=False)
    db.query(Processo).delete(synchronize_session=False)
    db.query(Cliente).delete(synchronize_session=False)
    db.query(Empreendimento).delete(synchronize_session=False)
    db.query(UnidadeDisponivel).delete(synchronize_session=False)
    db.query(SistemaLog).delete(synchronize_session=False)
    if runtime_meta_exists:
        db.execute(text("DELETE FROM app_runtime_meta"))

    admin_username = _normalize_username(RESET_ADMIN_USERNAME) or _normalize_username(APP_ADMIN_USER)
    admin_password = (APP_ADMIN_PASSWORD or "").strip() or "Troque#Admin123"
    admin_user = db.query(AppUser).filter(func.lower(AppUser.username) == admin_username).first()
    admin_criado = False

    if not admin_user:
        admin_user = AppUser(
            username=admin_username,
            role=ROLE_ADMIN,
            is_active=True,
            must_change_password=False,
        )
        _set_user_password(admin_user, admin_password, must_change_password=False)
        db.add(admin_user)
        db.flush()
        admin_criado = True
    else:
        admin_user.username = admin_username
        admin_user.role = ROLE_ADMIN
        admin_user.is_active = True
        # Mantem a senha atual do admin para evitar bloqueio apos reset.
    admin_user.must_change_password = False
    admin_user.last_login_at = None

    # Nao remove usuarios cadastrados no reset geral.
    usuarios_removidos = 0

    _set_runtime_meta(db, META_MENSAL_RUNTIME_KEY, "0")
    _set_runtime_meta(db, LAYOUT_BLACKHOLE_RUNTIME_KEY, "0")
    # Volta o seed para full para manter comportamento padrao sem restringir acesso.
    _set_runtime_meta(db, USERS_SEED_MODE_RUNTIME_KEY, USERS_SEED_MODE_FULL)

    db.commit()
    _invalidate_process_list_cache()
    ACTIVE_SESSIONS.clear()
    SEED_USERS_READY = False

    return {
        "ok": True,
        "cliente_registros_removidos": clientes_total,
        "processos_removidos": processos_total,
        "documentos_removidos": documentos_total,
        "empreendimentos_removidos": empreendimentos_total,
        "unidades_disponiveis_removidas": unidades_total,
        "processo_eventos_removidos": eventos_total,
        "sistema_logs_removidos": logs_total,
        "runtime_meta_removidos": runtime_meta_total,
        "usuarios_removidos": usuarios_removidos,
        "usuarios_anteriores": usuarios_total,
        "usuario_preservado": admin_username,
        "usuario_preservado_criado": admin_criado,
        "relogin_obrigatorio": True,
    }


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

    processo = Processo(
        cliente_id=payload.cliente_id,
        sla_comercial_inicio_at=_utc_start_of_day(cliente.data_cadastro_origem) or _utcnow(),
    )
    _refresh_sla_fixed_markers(processo, _utcnow())
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

    changes = payload.model_dump(exclude_unset=True)
    estagio_changed = False
    for field, value in changes.items():
        if field == "status_credito":
            status_credito = _process_credit_status(value)
            _validate_status_transition(field, processo.status_credito, status_credito)
            processo.status_credito = status_credito
        elif field == "status_geral":
            status_geral = _process_geral_status(value)
            _validate_status_transition(field, processo.status_geral, status_geral)
            processo.status_geral = status_geral
        elif field == "status_cca":
            status_cca = _process_caixa_status(value)
            _validate_status_transition(field, processo.status_cca, status_cca)
            processo.status_cca = status_cca
            if status_cca in {"APROVADO", "DAR_QV"}:
                processo.status_credito = "APROVADO"
                if processo.status_geral in {"NOVO", "PENDENCIADO"}:
                    processo.status_geral = "EM_ANDAMENTO"
            elif status_cca == "CONDICIONADO":
                processo.status_credito = "PENDENCIADO"
                processo.status_geral = "PENDENCIADO"
            elif status_cca in {"REPROVADO", "BLOQUEADO"}:
                processo.status_credito = "REPROVADO"
                processo.status_geral = "REPROVADO"
        elif field == "status_agehab":
            status_agehab = _process_agehab_status(value)
            _validate_status_transition(field, processo.status_agehab, status_agehab)
            processo.status_agehab = status_agehab
        elif field == "status_sinal":
            processo.status_sinal = _process_sinal_status(value)
        elif field == "status_fiador":
            processo.status_fiador = _process_fiador_status(value)
        elif field == "recolha_fgts":
            processo.recolha_fgts = _process_recolha_fgts_status(value, fallback=processo.recolha_fgts or "NAO_RECOLHIDO")
        elif field == "estagio_comercial":
            next_stage = _process_estagio_comercial(value, fallback="")
            if not next_stage:
                raise HTTPException(status_code=422, detail="Estagio comercial invalido.")
            old_stage = _process_estagio_comercial(processo.estagio_comercial)
            _validate_estagio_comercial_transition(old_stage, next_stage)
            processo.estagio_comercial = next_stage
            estagio_changed = old_stage != next_stage
        elif field == "etapa_repasse":
            next_step = _process_etapa_repasse(value, fallback=None)
            if value is not None and str(value).strip() and not next_step:
                raise HTTPException(status_code=422, detail="Etapa de repasse invalida.")
            processo.etapa_repasse = next_step
        elif field == "nao_contar_mes":
            _set_nao_contar_mes_period(processo, bool(value), _utcnow())
        elif field in {"sla_credito_dias", "sla_corretor_dias", "sla_cca_dias"}:
            continue
        else:
            setattr(processo, field, value)

    if estagio_changed:
        _sync_estagio_repasse_rules(processo, _utcnow())
    if changes:
        _refresh_sla_fixed_markers(processo, _utcnow())
        _apply_sla_rules(
            processo,
            has_enviado_docs=_process_has_enviado_docs(db, processo.id),
        )

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
    session: dict[str, Any] = Depends(require_roles(ROLE_CORRETOR, ROLE_CCA, ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
    db: Session = Depends(get_db),
    limit: Optional[int] = Query(default=120, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    _ensure_monthly_repasse_archiving(db, _utcnow())
    role = _normalize_role(str(session.get("role", "")))
    username = _normalize_username(str(session.get("username", "")))
    cache_key = _process_list_cache_key(role, username, limit, offset)

    cached = _get_cached_process_list(cache_key)
    if cached is not None:
        return cached

    query = db.query(Processo, Cliente).join(Cliente, Processo.cliente_id == Cliente.id).filter(_processos_ativos_clause())
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
    docs_stats: dict[uuid.UUID, dict[str, int]] = {}
    processo_ids = [processo.id for processo, _ in rows]
    if processo_ids:
        docs_rows = (
            db.query(Documento.processo_id, Documento.status_doc)
            .filter(Documento.processo_id.in_(processo_ids))
            .all()
        )
        for processo_id, status_doc in docs_rows:
            stats = docs_stats.setdefault(processo_id, {"docs_total": 0, "docs_recebidos": 0})
            stats["docs_total"] += 1
            if _doc_is_done(status_doc):
                stats["docs_recebidos"] += 1

    output: list[ProcessoOverviewOut] = []
    for processo, cliente in rows:
        stats = docs_stats.get(processo.id, {"docs_total": 0, "docs_recebidos": 0})
        docs_total = int(stats.get("docs_total", 0))
        docs_recebidos = int(stats.get("docs_recebidos", 0))
        sem_documento_enviado = docs_recebidos <= 0
        status_cca_norm = _process_caixa_status(processo.status_cca)
        status_agehab_norm = _process_agehab_status(processo.status_agehab)
        etapa_repasse_norm = _process_etapa_repasse(getattr(processo, "etapa_repasse", None))
        espelho_validado = status_cca_norm in {"APROVADO", "DAR_QV"}
        agehab_validado = status_agehab_norm == "VALIDADO_AGEHAB"
        contrato_ja_acionado = etapa_repasse_norm == "ASSINATURA_AUTORIZADA" or status_cca_norm in {"ASSINATURA_CAIXA", "FINALIZADO"}
        aviso_gerar_contrato_agehab = (
            not sem_documento_enviado
            and espelho_validado
            and agehab_validado
            and _process_estagio_comercial(getattr(processo, "estagio_comercial", None)) == "VENDA_FINALIZADA"
            and not contrato_ja_acionado
        )

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
                status_cca=status_cca_norm,
                status_agehab=status_agehab_norm,
                status_sinal=processo.status_sinal,
                valor_sinal=float(processo.valor_sinal) if getattr(processo, "valor_sinal", None) is not None else None,
                recolha_fgts=_process_recolha_fgts_status(getattr(processo, "recolha_fgts", None)),
                status_fiador=processo.status_fiador,
                estagio_comercial=_process_estagio_comercial(processo.estagio_comercial),
                etapa_repasse=_process_etapa_repasse(processo.etapa_repasse),
                fila_atual=_fila_atual_from_processo(processo),
                cca_responsavel=processo.cca_responsavel,
                pendente_fiador=processo.pendente_fiador,
                pendente_sinal=processo.pendente_sinal,
                nao_contar_mes=_is_nao_contar_mes_active(processo, now),
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
                data_reserva_origem=getattr(cliente, "data_reserva_origem", None),
                data_cadastro_origem=getattr(cliente, "data_cadastro_origem", None),
                created_at=processo.created_at,
                docs_total=docs_total,
                docs_recebidos=docs_recebidos,
                sem_documento_enviado=sem_documento_enviado,
                aviso_gerar_contrato_agehab=aviso_gerar_contrato_agehab,
            )
        )

    _set_cached_process_list(cache_key, output)
    return output


@app.get("/app/api/cca/analise", response_model=list[CcaAnaliseItemOut])
def app_list_cca_analise(
    session: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None),
    obra: Optional[str] = Query(default=None),
    status_cca: Optional[str] = Query(default=None),
    limit: int = Query(default=250, ge=1, le=1000),
):
    _ensure_monthly_repasse_archiving(db, _utcnow())
    role = _normalize_role(str(session.get("role", "")))
    username = _normalize_username(str(session.get("username", "")))

    query = (
        db.query(Processo, Cliente)
        .join(Cliente, Processo.cliente_id == Cliente.id)
        .filter(_processos_ativos_clause())
    )

    if role == ROLE_CCA:
        if not username:
            return []
        # CCA ve somente processos atribuidos ao proprio usuario.
        query = query.filter(func.lower(func.trim(func.coalesce(Processo.cca_responsavel, ""))) == username)

    termo = (q or "").strip().lower()
    obra_term = (obra or "").strip().lower()
    status_cca_norm = _process_caixa_status(status_cca, fallback="") if status_cca else ""

    if termo:
        like = f"%{termo}%"
        query = query.filter(
            or_(
                func.lower(func.coalesce(Cliente.nome, "")).like(like),
                func.lower(func.coalesce(Cliente.corretor, "")).like(like),
                func.lower(func.coalesce(Cliente.obra, "")).like(like),
                func.lower(func.coalesce(Processo.status_cca, "")).like(like),
            )
        )
    if obra_term:
        query = query.filter(func.lower(func.coalesce(Cliente.obra, "")).like(f"%{obra_term}%"))
    if status_cca_norm:
        query = query.filter(func.upper(func.coalesce(Processo.status_cca, "")) == status_cca_norm)

    rows = query.order_by(Processo.updated_at.desc(), Processo.created_at.desc()).limit(limit).all()
    processo_ids = [processo.id for processo, _ in rows]

    leads_by_processo: dict[uuid.UUID, LeadPreCadastro] = {}
    docs_stats: dict[uuid.UUID, dict[str, int]] = {}
    if processo_ids:
        lead_rows = (
            db.query(LeadPreCadastro)
            .filter(LeadPreCadastro.processo_id.in_(processo_ids))
            .order_by(LeadPreCadastro.updated_at.desc(), LeadPreCadastro.created_at.desc())
            .all()
        )
        for lead in lead_rows:
            pid = getattr(lead, "processo_id", None)
            if pid and pid not in leads_by_processo:
                leads_by_processo[pid] = lead

        docs_rows = (
            db.query(Documento.processo_id, Documento.status_doc)
            .filter(Documento.processo_id.in_(processo_ids))
            .all()
        )
        for processo_id, status_doc in docs_rows:
            stats = docs_stats.setdefault(processo_id, {"docs_total": 0, "docs_recebidos": 0})
            stats["docs_total"] += 1
            if _doc_is_done(status_doc):
                stats["docs_recebidos"] += 1

    output: list[CcaAnaliseItemOut] = []
    for processo, cliente in rows:
        lead_item = leads_by_processo.get(processo.id)
        if role == ROLE_CCA:
            # Para CCA, exibir apenas funil de entrada operacional do proprio CCA.
            estagio_lead = _lead_stage(getattr(lead_item, "estagio_lead", None), fallback="")
            if estagio_lead not in {"PRECADASTRO", "RESERVA"}:
                continue
        stats = docs_stats.get(processo.id, {"docs_total": 0, "docs_recebidos": 0})
        output.append(
            _build_cca_analise_item(
                db,
                processo,
                cliente,
                lead=lead_item,
                docs_total=int(stats.get("docs_total", 0)),
                docs_recebidos=int(stats.get("docs_recebidos", 0)),
            )
        )
    return output


@app.patch("/app/api/cca/analise/{processo_id}", response_model=CcaAnaliseItemOut)
def app_patch_cca_analise(
    processo_id: uuid.UUID,
    payload: CcaAnaliseUpdate,
    session: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    processo = db.get(Processo, processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo nao encontrado")

    cliente = db.get(Cliente, processo.cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")

    actor_role = _normalize_role(str(session.get("role", "")))
    actor_username = _normalize_username(str(session.get("username", "")))
    if actor_role == ROLE_CCA:
        responsavel_norm = _normalize_username(processo.cca_responsavel)
        if responsavel_norm != actor_username:
            raise HTTPException(status_code=403, detail="Sem permissao para este processo")

    changes = payload.model_dump(exclude_unset=True)
    if "status_cca" in changes:
        next_status_cca = _process_caixa_status(changes.get("status_cca"), fallback=processo.status_cca or "ANALISE_CREDITO")
        old_status_cca = processo.status_cca
        _validate_status_transition("status_cca", old_status_cca, next_status_cca)
        if old_status_cca != next_status_cca:
            processo.status_cca = next_status_cca
            _record_processo_event(
                db,
                processo_id=processo.id,
                actor_username=actor_username,
                actor_role=actor_role,
                event_type="STATUS_CHANGE",
                field_name="status_cca",
                old_value=old_status_cca,
                new_value=next_status_cca,
                details="decisao_cca",
            )

            # Regra de fluxo profissional: resposta da CCA sincroniza credito/geral.
            if next_status_cca in {"APROVADO", "DAR_QV"}:
                if processo.status_credito != "APROVADO":
                    _record_processo_event(
                        db,
                        processo_id=processo.id,
                        actor_username=actor_username,
                        actor_role=actor_role,
                        event_type="STATUS_CHANGE",
                        field_name="status_credito",
                        old_value=processo.status_credito,
                        new_value="APROVADO",
                        details="sincronizado_status_cca",
                    )
                    processo.status_credito = "APROVADO"
                if processo.status_geral in {"NOVO", "PENDENCIADO"}:
                    _record_processo_event(
                        db,
                        processo_id=processo.id,
                        actor_username=actor_username,
                        actor_role=actor_role,
                        event_type="STATUS_CHANGE",
                        field_name="status_geral",
                        old_value=processo.status_geral,
                        new_value="EM_ANDAMENTO",
                        details="sincronizado_status_cca",
                    )
                    processo.status_geral = "EM_ANDAMENTO"
            elif next_status_cca == "CONDICIONADO":
                if processo.status_credito != "PENDENCIADO":
                    _record_processo_event(
                        db,
                        processo_id=processo.id,
                        actor_username=actor_username,
                        actor_role=actor_role,
                        event_type="STATUS_CHANGE",
                        field_name="status_credito",
                        old_value=processo.status_credito,
                        new_value="PENDENCIADO",
                        details="sincronizado_status_cca",
                    )
                    processo.status_credito = "PENDENCIADO"
                if processo.status_geral != "PENDENCIADO":
                    _record_processo_event(
                        db,
                        processo_id=processo.id,
                        actor_username=actor_username,
                        actor_role=actor_role,
                        event_type="STATUS_CHANGE",
                        field_name="status_geral",
                        old_value=processo.status_geral,
                        new_value="PENDENCIADO",
                        details="sincronizado_status_cca",
                    )
                    processo.status_geral = "PENDENCIADO"
            elif next_status_cca in {"REPROVADO", "BLOQUEADO"}:
                if processo.status_credito != "REPROVADO":
                    _record_processo_event(
                        db,
                        processo_id=processo.id,
                        actor_username=actor_username,
                        actor_role=actor_role,
                        event_type="STATUS_CHANGE",
                        field_name="status_credito",
                        old_value=processo.status_credito,
                        new_value="REPROVADO",
                        details="sincronizado_status_cca",
                    )
                    processo.status_credito = "REPROVADO"
                if processo.status_geral != "REPROVADO":
                    _record_processo_event(
                        db,
                        processo_id=processo.id,
                        actor_username=actor_username,
                        actor_role=actor_role,
                        event_type="STATUS_CHANGE",
                        field_name="status_geral",
                        old_value=processo.status_geral,
                        new_value="REPROVADO",
                        details="sincronizado_status_cca",
                    )
                    processo.status_geral = "REPROVADO"

    if "recolha_fgts" in changes:
        old_fgts = getattr(processo, "recolha_fgts", None)
        processo.recolha_fgts = _process_recolha_fgts_status(changes.get("recolha_fgts"), fallback=old_fgts or "NAO_RECOLHIDO")
        if old_fgts != processo.recolha_fgts:
            _record_processo_event(
                db,
                processo_id=processo.id,
                actor_username=actor_username,
                actor_role=actor_role,
                event_type="PROCESSO_UPDATE",
                field_name="recolha_fgts",
                old_value=old_fgts,
                new_value=processo.recolha_fgts,
            )

    labels = {
        "renda_bruta": "Renda bruta",
        "renda_liquida": "Renda liquida",
        "valor_parcela": "Valor da parcela",
        "valor_imovel": "Valor do imovel",
        "valor_avaliacao": "Valor de avaliacao",
        "valor_financiamento": "Valor do financiamento",
        "valor_subsidio": "Valor do subsidio",
    }

    for field_name, label in labels.items():
        if field_name not in changes:
            continue
        old_value = getattr(processo, field_name, None)
        new_value = _coerce_optional_currency(changes.get(field_name), label)
        setattr(processo, field_name, new_value)
        if old_value != new_value:
            _record_processo_event(
                db,
                processo_id=processo.id,
                actor_username=actor_username,
                actor_role=actor_role,
                event_type="PROCESSO_UPDATE",
                field_name=field_name,
                old_value=old_value,
                new_value=new_value,
            )

    old_cheque = getattr(processo, "valor_cheque_moradia", None)
    auto_cheque = _resolve_cheque_moradia_valor(db, cliente.obra)
    processo.valor_cheque_moradia = auto_cheque
    if old_cheque != auto_cheque:
        _record_processo_event(
            db,
            processo_id=processo.id,
            actor_username=actor_username,
            actor_role=actor_role,
            event_type="PROCESSO_UPDATE",
            field_name="valor_cheque_moradia",
            old_value=old_cheque,
            new_value=auto_cheque,
            details=f"regra_automatica_empreendimento={cliente.obra or '-'}",
        )

    _refresh_sla_fixed_markers(processo, _utcnow())
    _apply_sla_rules(
        processo,
        has_enviado_docs=_process_has_enviado_docs(db, processo.id),
    )

    _record_system_log(
        db,
        actor_username=actor_username,
        actor_role=actor_role,
        tela="cca_analise",
        acao="CCA_ANALISE_FINANCEIRA_ATUALIZADA",
        entidade_tipo="processo",
        entidade_id=str(processo.id),
        details=(
            f"cliente={cliente.nome}; obra={cliente.obra or '-'}; "
            f"cheque_moradia={processo.valor_cheque_moradia or 0}; campos={','.join(sorted(changes.keys())) or 'auto'}"
        ),
    )
    db.commit()
    _invalidate_process_list_cache()

    lead = (
        db.query(LeadPreCadastro)
        .filter(LeadPreCadastro.processo_id == processo.id)
        .order_by(LeadPreCadastro.updated_at.desc(), LeadPreCadastro.created_at.desc())
        .first()
    )
    docs_rows = (
        db.query(Documento.status_doc)
        .filter(Documento.processo_id == processo.id)
        .all()
    )
    docs_total = len(docs_rows)
    docs_recebidos = sum(1 for (status_doc,) in docs_rows if _doc_is_done(status_doc))
    db.refresh(processo)
    return _build_cca_analise_item(
        db,
        processo,
        cliente,
        lead=lead,
        docs_total=docs_total,
        docs_recebidos=docs_recebidos,
    )


@app.get("/app/api/processos/arquivados", response_model=ProcessoArquivadoListOut)
def app_list_processos_arquivados(
    _: dict[str, Any] = Depends(require_roles(ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None),
    obra: Optional[str] = Query(default=None),
    corretor: Optional[str] = Query(default=None),
    imobiliaria: Optional[str] = Query(default=None),
    ano: Optional[int] = Query(default=None),
    mes: Optional[int] = Query(default=None),
    limit: Optional[int] = Query(default=120, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    _ensure_monthly_repasse_archiving(db, _utcnow())

    query = (
        db.query(Processo, Cliente)
        .join(Cliente, Processo.cliente_id == Cliente.id)
        .filter(Processo.arquivado.is_(True))
    )

    ano_periodo: Optional[int] = None
    mes_periodo: Optional[int] = None
    if ano is not None or mes is not None:
        ano_periodo, mes_periodo = _normalize_meta_period(ano, mes)
        periodo_inicio = date(ano_periodo, mes_periodo, 1)
        if mes_periodo == 12:
            proximo_mes = date(ano_periodo + 1, 1, 1)
        else:
            proximo_mes = date(ano_periodo, mes_periodo + 1, 1)
        periodo_inicio_dt = datetime.combine(periodo_inicio, time.min, tzinfo=timezone.utc)
        periodo_fim_exclusivo_dt = datetime.combine(proximo_mes, time.min, tzinfo=timezone.utc)

        query = query.filter(
            or_(
                and_(
                    Processo.arquivado_ref_ano == ano_periodo,
                    Processo.arquivado_ref_mes == mes_periodo,
                ),
                and_(
                    Processo.arquivado_ref_ano.is_(None),
                    Processo.arquivado_ref_mes.is_(None),
                    Processo.arquivado_em.is_not(None),
                    Processo.arquivado_em >= periodo_inicio_dt,
                    Processo.arquivado_em < periodo_fim_exclusivo_dt,
                ),
            )
        )

    term = (q or "").strip().lower()
    obra_term = (obra or "").strip().lower()
    corretor_term = (corretor or "").strip().lower()
    imobiliaria_term = (imobiliaria or "").strip().lower()

    if term:
        like = f"%{term}%"
        query = query.filter(
            or_(
                func.lower(func.coalesce(Cliente.nome, "")).like(like),
                func.lower(func.coalesce(Cliente.obra, "")).like(like),
                func.lower(func.coalesce(Cliente.corretor, "")).like(like),
                func.lower(func.coalesce(Cliente.imobiliaria, "")).like(like),
            )
        )
    if obra_term:
        query = query.filter(func.lower(func.coalesce(Cliente.obra, "")).like(f"%{obra_term}%"))
    if corretor_term:
        query = query.filter(func.lower(func.coalesce(Cliente.corretor, "")).like(f"%{corretor_term}%"))
    if imobiliaria_term:
        query = query.filter(func.lower(func.coalesce(Cliente.imobiliaria, "")).like(f"%{imobiliaria_term}%"))

    query = query.order_by(Processo.arquivado_em.desc().nullslast(), Processo.updated_at.desc()).offset(offset)
    if limit is not None:
        query = query.limit(limit)
    rows = query.all()

    itens = [
        ProcessoArquivadoOut(
            processo_id=processo.id,
            cliente_id=cliente.id,
            cliente_nome=cliente.nome,
            corretor=cliente.corretor,
            obra=cliente.obra,
            imobiliaria=getattr(cliente, "imobiliaria", None),
            estagio_comercial=_process_estagio_comercial(getattr(processo, "estagio_comercial", None)),
            etapa_repasse=_process_etapa_repasse(getattr(processo, "etapa_repasse", None)),
            status_cca=processo.status_cca,
            status_agehab=processo.status_agehab,
            status_sinal=processo.status_sinal,
            status_fiador=processo.status_fiador,
            arquivado_em=_as_utc(getattr(processo, "arquivado_em", None)),
            arquivado_ref_ano=getattr(processo, "arquivado_ref_ano", None),
            arquivado_ref_mes=getattr(processo, "arquivado_ref_mes", None),
            data_reserva_origem=getattr(cliente, "data_reserva_origem", None),
            data_cadastro_origem=getattr(cliente, "data_cadastro_origem", None),
            created_at=processo.created_at,
            sla_analista_horas=(
                int(round((int(getattr(processo, "sla_analista_seconds", 0) or 0)) / 3600))
                if getattr(processo, "sla_analista_seconds", None) is not None
                else None
            ),
            sla_corretor_horas=(
                int(round((int(getattr(processo, "sla_corretor_seconds", 0) or 0)) / 3600))
                if getattr(processo, "sla_corretor_seconds", None) is not None
                else None
            ),
        )
        for processo, cliente in rows
    ]

    total_clientes_cadastrados = int(db.query(func.count(Cliente.id)).scalar() or 0)
    total_processos_ativos = int(db.query(func.count(Processo.id)).filter(_processos_ativos_clause()).scalar() or 0)
    total_processos_arquivados = int(
        db.query(func.count(Processo.id)).filter(Processo.arquivado.is_(True)).scalar() or 0
    )

    return ProcessoArquivadoListOut(
        total_clientes_cadastrados=total_clientes_cadastrados,
        total_processos_ativos=total_processos_ativos,
        total_processos_arquivados=total_processos_arquivados,
        itens=itens,
    )


@app.get("/app/api/gestor/dashboard")
def app_gestor_dashboard(
    _: dict[str, Any] = Depends(require_roles(ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    _ensure_monthly_repasse_archiving(db, _utcnow())
    rows = (
        db.query(Processo, Cliente)
        .join(Cliente, Processo.cliente_id == Cliente.id)
        .filter(_processos_ativos_clause())
        .all()
    )
    now = _utcnow()
    total_bruto = len(rows)
    total = 0

    total_comercial = 0
    total_credito = 0
    total_repasse = 0
    total_assinados = 0
    total_assinados_semana = 0
    provaveis_cair = 0
    perdas_mes = 0
    nao_contar_mes_total = 0
    chegadas_ultimos_7_dias = 0

    clientes_comercial: list[dict[str, Any]] = []
    clientes_repasse: list[dict[str, Any]] = []
    clientes_assinados: list[dict[str, Any]] = []
    clientes_assinados_semana: list[dict[str, Any]] = []
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
    semana_inicio = now.date() - timedelta(days=now.date().weekday())
    semana_fim_util = semana_inicio + timedelta(days=4)
    semana_fim_contagem = min(now.date(), semana_fim_util)
    dias_uteis_decorridos_semana = 0
    if semana_fim_contagem >= semana_inicio:
        dias_uteis_decorridos_semana = min(5, (semana_fim_contagem - semana_inicio).days + 1)
    dias_uteis_restantes_semana = max(0, 5 - dias_uteis_decorridos_semana)

    sla_comercial_sum = 0
    sla_comercial_count = 0
    sla_credito_sum = 0
    sla_credito_count = 0
    sla_cca_sum = 0
    sla_cca_count = 0
    processo_ids = [processo.id for processo, _ in rows]
    pendencias_docs_por_processo: dict[uuid.UUID, int] = {}
    docs_por_processo: dict[uuid.UUID, list[dict[str, str]]] = {}
    assinado_event_at_por_processo: dict[uuid.UUID, datetime] = {}
    perda_event_at_por_processo: dict[uuid.UUID, datetime] = {}
    if processo_ids:
        docs_rows = (
            db.query(
                Documento.processo_id,
                Documento.categoria,
                Documento.nome,
                Documento.status_credito,
                Documento.pendencia_info,
            )
            .filter(Documento.processo_id.in_(processo_ids))
            .all()
        )
        for processo_id, categoria, nome, status_credito, pendencia_info in docs_rows:
            status_doc = _status_token(status_credito) or "AGUARDANDO_ENVIO"
            if processo_id not in docs_por_processo:
                docs_por_processo[processo_id] = []
            docs_por_processo[processo_id].append(
                {
                    "categoria": str(categoria or "").strip(),
                    "nome": str(nome or "").strip(),
                    "status": status_doc,
                    "descricao": str(pendencia_info or "").strip(),
                }
            )
            if status_doc in {"PENDENCIADO", "REPROVADO"}:
                pendencias_docs_por_processo[processo_id] = pendencias_docs_por_processo.get(processo_id, 0) + 1

        eventos_status_rows = (
            db.query(
                ProcessoEvento.processo_id,
                ProcessoEvento.field_name,
                ProcessoEvento.new_value,
                ProcessoEvento.created_at,
            )
            .filter(
                ProcessoEvento.processo_id.in_(processo_ids),
                ProcessoEvento.field_name.in_(["status_cca", "status_geral"]),
            )
            .all()
        )
        for processo_id, field_name, new_value, created_at in eventos_status_rows:
            evento_time = _as_utc(created_at)
            if evento_time is None:
                continue
            token = _status_token(new_value)
            if field_name == "status_cca" and token in PROCESS_CCA_FINAL_STATUSES:
                prev = assinado_event_at_por_processo.get(processo_id)
                if prev is None or evento_time > prev:
                    assinado_event_at_por_processo[processo_id] = evento_time
            elif field_name == "status_geral" and token in {"CANCELADO", "DISTRATO"}:
                prev = perda_event_at_por_processo.get(processo_id)
                if prev is None or evento_time > prev:
                    perda_event_at_por_processo[processo_id] = evento_time

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
        assinado_event_at_utc = _as_utc(assinado_event_at_por_processo.get(processo.id))
        perda_event_at_utc = _as_utc(perda_event_at_por_processo.get(processo.id))
        created_date = created_at_utc.date() if created_at_utc else None
        data_referencia = _resolve_dashboard_reference_date(cliente, created_date, now.date())
        dias_em_aberto = (now.date() - data_referencia).days if data_referencia else None
        if dias_em_aberto is not None and (dias_em_aberto < 0 or dias_em_aberto > DASHBOARD_MAX_DIAS_EM_ABERTO):
            dias_em_aberto = None
        nao_contar_mes = _is_nao_contar_mes_active(processo, now)
        pendencias_docs = int(pendencias_docs_por_processo.get(processo.id, 0))
        tem_pendencia_status = _processo_has_pendencia(processo)
        tem_pendencia = tem_pendencia_status or pendencias_docs > 0
        documentos = docs_por_processo.get(processo.id, [])
        docs_total = len(documentos)
        docs_todos_aguardando = docs_total > 0 and all(
            doc.get("status") in {"AGUARDANDO_ENVIO", "ANALISE", "NAO_APLICA"} for doc in documentos
        )
        docs_com_pendencia = [doc for doc in documentos if doc.get("status") in {"PENDENCIADO", "REPROVADO"}]
        docs_tooltip_lines: list[str] = []
        if docs_total == 0 or docs_todos_aguardando:
            docs_tooltip = "Documentos: nao foi enviado doc."
        else:
            docs_para_listar = docs_com_pendencia
            if not docs_para_listar:
                docs_todos_aprovados = all(doc.get("status") in {"APROVADO", "NAO_APLICA"} for doc in documentos)
                docs_tooltip = (
                    "Documentos: todos aprovados."
                    if docs_todos_aprovados
                    else "Documentos: sem pendencias registradas."
                )
            else:
                for doc in docs_para_listar:
                    desc = str(doc.get("descricao") or "").strip()
                    desc_upper = desc.upper()
                    for prefix in (
                        "PENDENTE -",
                        "PENDENTE:",
                        "BLOQUEADO -",
                        "BLOQUEADO:",
                        "REPROVADO -",
                        "REPROVADO:",
                    ):
                        if desc_upper.startswith(prefix):
                            desc = desc[len(prefix):].strip(" -:")
                            break
                    nome_doc = str(doc.get("nome") or "-")
                    status_doc = str(doc.get("status") or "-")
                    if desc:
                        docs_tooltip_lines.append(f"- {nome_doc} [{status_doc}]: {desc}")
                    else:
                        docs_tooltip_lines.append(f"- {nome_doc} [{status_doc}]: sem descricao")
                docs_tooltip = "Documentos com pendencia:\n" + "\n".join(docs_tooltip_lines)
        sinal_ok = status_sinal in {"NAO_TEM", "PAGO"}
        fiador_ok = status_fiador in {"NAO_TEM", "FINALIZADO"}
        caixa_ok = _is_caixa_apta_para_assinatura(status_cca)
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
            "status_geral": _geral_status(getattr(processo, "status_geral", None)),
            "status_credito": _credit_status(getattr(processo, "status_credito", None)),
            "status_cca": _process_caixa_status(getattr(processo, "status_cca", None)),
            "status_agehab": _process_agehab_status(getattr(processo, "status_agehab", None)),
            "status_sinal": _process_sinal_status(getattr(processo, "status_sinal", None)),
            "valor_sinal": float(processo.valor_sinal) if getattr(processo, "valor_sinal", None) is not None else None,
            "status_fiador": _process_fiador_status(getattr(processo, "status_fiador", None)),
            "recolha_fgts": _process_recolha_fgts_status(getattr(processo, "recolha_fgts", None)),
            "dias_em_aberto": dias_em_aberto,
            "data_cadastro_origem": data_referencia.isoformat() if data_referencia else None,
            "pendencias_documentos": pendencias_docs,
            "tem_pendencia_status": tem_pendencia_status,
            "tem_pendencia": tem_pendencia,
            "docs_total": docs_total,
            "docs_todos_aguardando": docs_todos_aguardando,
            "docs_pendentes_tooltip": docs_tooltip,
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
            assinado_data_ref = assinado_event_at_utc or updated_at_utc
            if assinado_data_ref is not None:
                dt_repasse = assinado_data_ref.date()
                if semana_inicio <= dt_repasse <= semana_fim_contagem and dt_repasse.weekday() < 5:
                    total_assinados_semana += 1
                    clientes_assinados_semana.append(cliente_item)

        if pronto_para_repassar:
            clientes_prontos_repasse.append(cliente_item)

        if estagio == "EM_PROCESSO" and dias_em_aberto is not None and dias_em_aberto > FALL_RISK_DAYS:
            provaveis_cair += 1
            clientes_provaveis_cair.append(cliente_item)

        if (
            status_geral in {"CANCELADO", "DISTRATO"}
            and (perda_event_at_utc or updated_at_utc) is not None
            and (perda_event_at_utc or updated_at_utc).year == now.year
            and (perda_event_at_utc or updated_at_utc).month == now.month
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
    meta_periodo_ano, meta_periodo_mes = hoje.year, hoje.month
    meta, meta_semanal, meta_source, meta_semanal_source = _resolve_gestor_meta_periodo(
        db,
        meta_periodo_ano,
        meta_periodo_mes,
    )
    real = total_assinados
    previsao = real + total
    dias_restantes = max(1, dias_no_mes - dias_decorridos)
    media_necessaria_dia = round(max(0, meta - real) / dias_restantes, 2)
    real_semanal = total_assinados_semana
    media_semana_dia_util = round(real_semanal / max(1, dias_uteis_decorridos_semana), 2)
    previsao_semanal = int(round(media_semana_dia_util * 5))
    media_necessaria_semana_dia_util = (
        round(max(0, meta_semanal - real_semanal) / dias_uteis_restantes_semana, 2)
        if dias_uteis_restantes_semana > 0
        else 0.0
    )

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
        "repasses_semana": clientes_assinados_semana,
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
        "meta_semanal": meta_semanal,
        "meta_fonte": meta_source,
        "meta_semanal_fonte": meta_semanal_source,
        "meta_periodo_ano": meta_periodo_ano,
        "meta_periodo_mes": meta_periodo_mes,
        "real": real,
        "previsao": previsao,
        "real_semanal": real_semanal,
        "previsao_semanal": previsao_semanal,
        "media_necessaria_semana_dia_util": media_necessaria_semana_dia_util,
        "dias_uteis_decorridos_semana": dias_uteis_decorridos_semana,
        "dias_uteis_restantes_semana": dias_uteis_restantes_semana,
        "semana_inicio": semana_inicio.isoformat(),
        "semana_fim_util": semana_fim_util.isoformat(),
        "semana_fim_contagem": semana_fim_contagem.isoformat(),
        "perdas_mes": perdas_mes,
        "nao_contar_mes": nao_contar_mes_total,
        "clientes_estagios": clientes_estagios,
    }


@app.get("/app/api/gestor/meta", response_model=GestorMetaOut)
def app_get_gestor_meta(
    _: dict[str, Any] = Depends(require_roles(ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    ano, mes = _current_meta_period()
    meta, _, fonte_mensal, _ = _resolve_gestor_meta_periodo(db, ano, mes)
    return GestorMetaOut(meta=meta, fonte=fonte_mensal)


@app.put("/app/api/gestor/meta", response_model=GestorMetaOut)
def app_set_gestor_meta(
    payload: GestorMetaPayload,
    session: dict[str, Any] = Depends(require_roles(ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    ano, mes = _current_meta_period()
    monthly_period_key = _build_meta_period_runtime_key(META_MENSAL_RUNTIME_KEY, ano, mes)
    meta_value = max(0, int(payload.meta or 0))
    _set_runtime_meta(db, monthly_period_key, str(meta_value))
    _set_runtime_meta(db, META_MENSAL_RUNTIME_KEY, str(meta_value))
    _record_system_log(
        db,
        actor_username=_normalize_username(str(session.get("username", ""))),
        actor_role=_normalize_role(str(session.get("role", ""))),
        tela="analista_painel",
        acao="META_GESTOR_ATUALIZADA",
        entidade_tipo="configuracao",
        entidade_id=monthly_period_key,
        details=f"meta={meta_value};periodo={ano:04d}-{mes:02d}",
    )
    db.commit()
    meta, _, fonte, _ = _resolve_gestor_meta_periodo(db, ano, mes)
    return GestorMetaOut(meta=meta, fonte=fonte)


@app.get("/app/api/gestor/meta-periodo", response_model=GestorMetaPeriodoOut)
def app_get_gestor_meta_periodo(
    ano: Optional[int] = Query(default=None),
    mes: Optional[int] = Query(default=None),
    _: dict[str, Any] = Depends(require_roles(ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ANALISTA, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    ano_val, mes_val = _normalize_meta_period(ano, mes)
    meta_mensal, meta_semanal, fonte_mensal, fonte_semanal = _resolve_gestor_meta_periodo(db, ano_val, mes_val)
    return GestorMetaPeriodoOut(
        ano=ano_val,
        mes=mes_val,
        meta_mensal=meta_mensal,
        meta_semanal=meta_semanal,
        fonte_mensal=fonte_mensal,
        fonte_semanal=fonte_semanal,
    )


@app.put("/app/api/gestor/meta-periodo", response_model=GestorMetaPeriodoOut)
def app_set_gestor_meta_periodo(
    payload: GestorMetaPeriodoPayload,
    session: dict[str, Any] = Depends(require_roles(ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    ano_val, mes_val = _normalize_meta_period(payload.ano, payload.mes)
    meta_mensal = max(0, int(payload.meta_mensal or 0))
    meta_semanal = max(0, int(payload.meta_semanal or 0))

    monthly_period_key = _build_meta_period_runtime_key(META_MENSAL_RUNTIME_KEY, ano_val, mes_val)
    weekly_period_key = _build_meta_period_runtime_key(META_SEMANAL_RUNTIME_KEY, ano_val, mes_val)
    _set_runtime_meta(db, monthly_period_key, str(meta_mensal))
    _set_runtime_meta(db, weekly_period_key, str(meta_semanal))

    ano_atual, mes_atual = _current_meta_period()
    if ano_val == ano_atual and mes_val == mes_atual:
        _set_runtime_meta(db, META_MENSAL_RUNTIME_KEY, str(meta_mensal))
        _set_runtime_meta(db, META_SEMANAL_RUNTIME_KEY, str(meta_semanal))

    _record_system_log(
        db,
        actor_username=_normalize_username(str(session.get("username", ""))),
        actor_role=_normalize_role(str(session.get("role", ""))),
        tela="gestor_credito",
        acao="META_GESTOR_PERIODO_ATUALIZADA",
        entidade_tipo="configuracao",
        entidade_id=f"{ano_val:04d}-{mes_val:02d}",
        details=f"meta_mensal={meta_mensal};meta_semanal={meta_semanal}",
    )

    db.commit()
    meta_mensal_out, meta_semanal_out, fonte_mensal, fonte_semanal = _resolve_gestor_meta_periodo(db, ano_val, mes_val)
    return GestorMetaPeriodoOut(
        ano=ano_val,
        mes=mes_val,
        meta_mensal=meta_mensal_out,
        meta_semanal=meta_semanal_out,
        fonte_mensal=fonte_mensal,
        fonte_semanal=fonte_semanal,
    )


@app.post("/app/api/processos/intake")
def app_create_intake(
    payload: ProcessoIntakeCreate,
    session: dict[str, Any] = Depends(require_roles(ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    username = _normalize_username(str(session.get("username", "")))
    obra_nome = _resolve_empreendimento_nome(db, payload.obra)
    if payload.obra and not obra_nome:
        raise HTTPException(status_code=422, detail="Empreendimento invalido. Selecione um empreendimento cadastrado.")
    estagio = _process_estagio_comercial(payload.estagio_comercial, fallback="RESERVA")

    cliente = Cliente(
        nome=payload.nome.strip(),
        corretor=_normalize_corretor_nome_curto(payload.corretor) if payload.corretor else None,
        obra=obra_nome,
        imobiliaria=(payload.imobiliaria or "").strip() or None,
        data_reserva_origem=payload.data_reserva_origem,
        data_cadastro_origem=payload.data_cadastro_origem,
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)

    processo = Processo(
        cliente_id=cliente.id,
        estagio_comercial=estagio,
        etapa_repasse="EM_REPASSE" if estagio in ESTAGIOS_REPASSE_COMERCIAL else None,
        valor_cheque_moradia=_resolve_cheque_moradia_valor(db, obra_nome),
        sla_comercial_inicio_at=_utc_start_of_day(payload.data_cadastro_origem) or _utcnow(),
    )
    _sync_estagio_repasse_rules(processo, _utcnow())
    _refresh_sla_fixed_markers(processo, _utcnow())
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
    session: dict[str, Any] = Depends(require_roles(ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
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
        reserva_raw = row.get("reserva")
        data_reserva_origem = _parse_import_date(reserva_raw)
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

        if not str(reserva_raw or "").strip():
            invalidados += 1
            resultados.append(
                ImportPlanilhaRowOut(
                    linha=row_number,
                    nome_cliente=nome,
                    status="invalido",
                    motivo="reserva obrigatoria",
                )
            )
            continue

        if data_reserva_origem is None:
            invalidados += 1
            resultados.append(
                ImportPlanilhaRowOut(
                    linha=row_number,
                    nome_cliente=nome,
                    status="invalido",
                    motivo="reserva invalida",
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
                    motivo="cliente ja existe na base; importacao ignorada (sem substituicao)",
                )
            )
            continue

        empreendimento_raw = _normalize_empreendimento_nome(row.get("empreendimento"))
        empreendimento_resolvido = _resolve_empreendimento_nome(db, empreendimento_raw) if empreendimento_raw else None
        empreendimento = empreendimento_resolvido or empreendimento_raw or None

        cliente = Cliente(
            nome=nome,
            corretor=_normalize_corretor_nome_curto(row.get("corretor")) or None,
            obra=empreendimento,
            imobiliaria=" ".join(str(row.get("imobiliaria") or "").strip().split()) or None,
            data_reserva_origem=data_reserva_origem,
            data_cadastro_origem=data_cadastro_origem,
        )
        db.add(cliente)
        db.flush()

        processo = Processo(
            cliente_id=cliente.id,
            estagio_comercial=estagio,
            etapa_repasse="EM_REPASSE" if estagio in ESTAGIOS_REPASSE_COMERCIAL else None,
            valor_cheque_moradia=_resolve_cheque_moradia_valor(db, empreendimento),
            sla_comercial_inicio_at=_utc_start_of_day(data_cadastro_origem) or _utcnow(),
        )
        _sync_estagio_repasse_rules(processo, _utcnow())
        _refresh_sla_fixed_markers(processo, _utcnow())
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
    session: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
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
    processo_out.status_cca = _process_caixa_status(processo.status_cca)
    processo_out.status_agehab = _process_agehab_status(processo.status_agehab)
    processo_out.recolha_fgts = _process_recolha_fgts_status(getattr(processo, "recolha_fgts", None))
    processo_out.estagio_comercial = _process_estagio_comercial(processo.estagio_comercial)
    processo_out.etapa_repasse = _process_etapa_repasse(processo.etapa_repasse)
    processo_out.fila_atual = _fila_atual_from_processo(processo)
    processo_out.nao_contar_mes = _is_nao_contar_mes_active(processo, now)

    return ProcessoFullOut(
        processo=processo_out,
        cliente=ClienteOut.model_validate(cliente),
        documentos=[DocumentoOut.model_validate(doc) for doc in documentos],
    )


@app.get("/app/api/processos/{processo_id}/eventos", response_model=list[ProcessoEventoOut])
def app_list_processo_eventos(
    processo_id: uuid.UUID,
    session: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
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
    session: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    _ensure_monthly_repasse_archiving(db, _utcnow())
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
    session: dict[str, Any] = Depends(require_roles(ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO)),
    db: Session = Depends(get_db),
):
    processo = db.get(Processo, processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo nao encontrado")

    actor_role = _normalize_role(str(session.get("role", "")))
    actor_username = _normalize_username(str(session.get("username", "")))
    changes = payload.model_dump(exclude_unset=True)
    # Campos derivados de status nao devem ser alterados diretamente via API.
    changes.pop("pendente_fiador", None)
    changes.pop("pendente_sinal", None)
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
            if status_cca in {"APROVADO", "DAR_QV"}:
                processo.status_credito = "APROVADO"
                if processo.status_geral in {"NOVO", "PENDENCIADO"}:
                    processo.status_geral = "EM_ANDAMENTO"
            elif status_cca == "CONDICIONADO":
                processo.status_credito = "PENDENCIADO"
                processo.status_geral = "PENDENCIADO"
                if old_sla_owner == SLA_OWNER_CCA:
                    sla_trigger = "cca_pendenciou"
            elif status_cca in {"REPROVADO", "BLOQUEADO"}:
                processo.status_credito = "REPROVADO"
                processo.status_geral = "REPROVADO"
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
            if status_sinal == "NAO_TEM" and getattr(processo, "valor_sinal", None) is not None:
                old_sinal_valor = processo.valor_sinal
                processo.valor_sinal = None
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type="PROCESSO_UPDATE",
                    field_name="valor_sinal",
                    old_value=old_sinal_valor,
                    new_value=None,
                    details="reset_automatico_status_sinal_nao_tem",
                )
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
        elif field == "valor_sinal":
            if value is None or str(value).strip() == "":
                new_valor_sinal = None
            else:
                try:
                    new_valor_sinal = round(float(value), 2)
                except (TypeError, ValueError):
                    raise HTTPException(status_code=422, detail="Valor de sinal invalido.")
                if new_valor_sinal < 0:
                    raise HTTPException(status_code=422, detail="Valor de sinal nao pode ser negativo.")
            old_value = getattr(processo, "valor_sinal", None)
            processo.valor_sinal = new_valor_sinal
            if old_value != new_valor_sinal:
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type="PROCESSO_UPDATE",
                    field_name=field,
                    old_value=old_value,
                    new_value=new_valor_sinal,
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
        elif field == "recolha_fgts":
            old_value = getattr(processo, "recolha_fgts", None)
            processo.recolha_fgts = _process_recolha_fgts_status(value, fallback=old_value or "NAO_RECOLHIDO")
            if old_value != processo.recolha_fgts:
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type="PROCESSO_UPDATE",
                    field_name=field,
                    old_value=old_value,
                    new_value=processo.recolha_fgts,
                )
        elif field == "nao_contar_mes":
            old_value = _is_nao_contar_mes_active(processo, _utcnow())
            _set_nao_contar_mes_period(processo, bool(value), _utcnow())
            new_value = _is_nao_contar_mes_active(processo, _utcnow())
            details = None
            if bool(value):
                details = (
                    f"periodo_referencia="
                    f"{int(processo.nao_contar_mes_ref_ano or 0):04d}-{int(processo.nao_contar_mes_ref_mes or 0):02d}"
                )
            if old_value != new_value:
                _record_processo_event(
                    db,
                    processo_id=processo.id,
                    actor_username=actor_username,
                    actor_role=actor_role,
                    event_type="PROCESSO_UPDATE",
                    field_name=field,
                    old_value=old_value,
                    new_value=new_value,
                    details=details,
                )
        elif field == "estagio_comercial":
            next_stage = _process_estagio_comercial(value, fallback="")
            if not next_stage:
                raise HTTPException(status_code=422, detail="Estagio comercial invalido.")
            old_value = _process_estagio_comercial(processo.estagio_comercial)
            _validate_estagio_comercial_transition(old_value, next_stage)
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
                        "Exige estagio VENDA_FINALIZADA, sinal/fiador regular, Agehab validada e Caixa aprovado."
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
                    "Exige VENDA_FINALIZADA, sinal/fiador regular, Agehab validada e Caixa aprovado."
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

    if changes:
        _ensure_credito_sla_start(processo, actor_role, _utcnow())
        _refresh_sla_fixed_markers(processo, _utcnow())

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
    processo_out.status_cca = _process_caixa_status(processo.status_cca)
    processo_out.status_agehab = _process_agehab_status(processo.status_agehab)
    processo_out.recolha_fgts = _process_recolha_fgts_status(getattr(processo, "recolha_fgts", None))
    processo_out.estagio_comercial = _process_estagio_comercial(processo.estagio_comercial)
    processo_out.etapa_repasse = _process_etapa_repasse(processo.etapa_repasse)
    processo_out.fila_atual = _fila_atual_from_processo(processo)
    processo_out.nao_contar_mes = _is_nao_contar_mes_active(processo, now)
    return processo_out


@app.put("/app/api/processos/{processo_id}/documentos", response_model=list[DocumentoOut])
def app_bulk_upsert_documentos(
    processo_id: uuid.UUID,
    payload: DocumentoBulkUpsert,
    session: dict[str, Any] = Depends(require_roles(ROLE_CCA, ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO, ROLE_ADMIN)),
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

    can_update_credit = role in {ROLE_ANALISTA, ROLE_GESTOR, ROLE_GESTOR_CREDITO}
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
            if next_credit in {"PENDENCIADO", "REPROVADO"}:
                if pendencia_info:
                    documento.pendencia_info = pendencia_info
                elif role == ROLE_ANALISTA and (
                    next_credit == "REPROVADO"
                    or became_pending_doc
                    or not old_pendencia_info
                ):
                    raise HTTPException(
                        status_code=422,
                        detail=(f"Documento '{nome}' foi {next_credit.lower()}. Informe pendencia_info."),
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
            if credito_default_norm in {"PENDENCIADO", "REPROVADO"} and not pendencia_info:
                raise HTTPException(
                    status_code=422,
                    detail=f"Documento '{nome}' foi {credito_default_norm.lower()}. Informe pendencia_info.",
                )
            novo_documento = Documento(
                processo_id=processo_id,
                categoria=categoria,
                nome=nome,
                status_doc=status_doc_norm,
                status_credito=credito_default_norm,
                pendencia_info=pendencia_info if credito_default_norm in {"PENDENCIADO", "REPROVADO"} else None,
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

    if dedup_map:
        _ensure_credito_sla_start(processo, role, _utcnow())
        _refresh_sla_fixed_markers(processo, _utcnow())

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

