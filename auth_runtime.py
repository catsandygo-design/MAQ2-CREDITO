from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

from fastapi import HTTPException, Request


@dataclass(frozen=True)
class PasswordPolicyConfig:
    iterations: int
    min_length: int
    require_upper: bool
    require_lower: bool
    require_digit: bool
    require_symbol: bool


def new_salt() -> str:
    return secrets.token_hex(16)


def hash_password(password: str, salt: str, iterations: int) -> str:
    raw = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        iterations,
    )
    return raw.hex()


def verify_password(password: str, password_hash: str, password_salt: str, iterations: int) -> bool:
    try:
        computed = hash_password(password, password_salt, iterations)
    except Exception:
        return False
    return hmac.compare_digest(computed, password_hash)


def password_policy_error(password: str, config: PasswordPolicyConfig) -> Optional[str]:
    value = password or ""
    if len(value) < config.min_length:
        return f"Senha deve ter ao menos {config.min_length} caracteres."
    if config.require_upper and not any(ch.isupper() for ch in value):
        return "Senha deve conter ao menos 1 letra maiuscula."
    if config.require_lower and not any(ch.islower() for ch in value):
        return "Senha deve conter ao menos 1 letra minuscula."
    if config.require_digit and not any(ch.isdigit() for ch in value):
        return "Senha deve conter ao menos 1 numero."
    if config.require_symbol and not any(not ch.isalnum() for ch in value):
        return "Senha deve conter ao menos 1 simbolo."
    return None


@dataclass(frozen=True)
class SessionConfig:
    session_cookie_name: str
    ttl_seconds: int
    idle_timeout_seconds: int
    db_sync_interval_seconds: int
    idle_passive_paths: set[str]


class SessionManager:
    def __init__(
        self,
        *,
        config: SessionConfig,
        open_db_session: Callable[[], Any],
        app_session_model: type[Any],
        app_user_model: type[Any],
        active_sessions: dict[str, dict[str, Any]],
        active_sessions_lock: Any,
        logger: Any,
        normalize_role: Callable[[Optional[str]], str],
        session_token_hash: Callable[[str], str],
        utcnow: Callable[[], datetime],
    ) -> None:
        self.config = config
        self.open_db_session = open_db_session
        self.app_session_model = app_session_model
        self.app_user_model = app_user_model
        self.active_sessions = active_sessions
        self.active_sessions_lock = active_sessions_lock
        self.logger = logger
        self.normalize_role = normalize_role
        self.session_token_hash = session_token_hash
        self.utcnow = utcnow

    def new_session(self, *, user_id: uuid.UUID, username: str, role: str, must_change_password: bool) -> str:
        token = uuid.uuid4().hex
        now = self.utcnow()
        session = {
            "user_id": str(user_id),
            "username": username,
            "role": role,
            "must_change_password": bool(must_change_password),
            "created_at": now,
            "last_seen_at": now,
            "db_checked_at": now,
            "expires_at": now + timedelta(seconds=self.config.ttl_seconds),
        }
        with self.active_sessions_lock:
            self.active_sessions[token] = session
        self.persist_session_record(token, session)
        return token

    def persist_session_record(self, token: str, session: dict[str, Any]) -> None:
        db = self.open_db_session()
        if db is None:
            return
        try:
            token_hash = self.session_token_hash(token)
            row = db.query(self.app_session_model).filter(self.app_session_model.session_token_hash == token_hash).first()
            if row is None:
                row = self.app_session_model(
                    session_token_hash=token_hash,
                    user_id=uuid.UUID(str(session["user_id"])),
                    username=str(session.get("username", "")),
                    role=self.normalize_role(str(session.get("role", ""))),
                    must_change_password=bool(session.get("must_change_password")),
                    created_at=session.get("created_at") or self.utcnow(),
                    last_seen_at=session.get("last_seen_at") or self.utcnow(),
                    db_checked_at=session.get("db_checked_at") or self.utcnow(),
                    expires_at=session.get("expires_at") or (self.utcnow() + timedelta(seconds=self.config.ttl_seconds)),
                )
                db.add(row)
            else:
                row.username = str(session.get("username", ""))
                row.role = self.normalize_role(str(session.get("role", "")))
                row.must_change_password = bool(session.get("must_change_password"))
                row.last_seen_at = session.get("last_seen_at") or row.last_seen_at
                row.db_checked_at = session.get("db_checked_at") or row.db_checked_at
                row.expires_at = session.get("expires_at") or row.expires_at
            db.commit()
        except Exception:
            db.rollback()
            self.logger.exception("Falha ao persistir sessao autenticada.")
        finally:
            db.close()

    def load_session_from_store(self, token: str) -> Optional[dict[str, Any]]:
        db = self.open_db_session()
        if db is None:
            return None
        now = self.utcnow()
        try:
            row = db.query(self.app_session_model).filter(
                self.app_session_model.session_token_hash == self.session_token_hash(token)
            ).first()
            if not row:
                return None
            if row.expires_at <= now:
                db.delete(row)
                db.commit()
                return None
            return {
                "user_id": str(row.user_id),
                "username": row.username,
                "role": self.normalize_role(row.role),
                "must_change_password": bool(row.must_change_password),
                "created_at": row.created_at,
                "last_seen_at": row.last_seen_at,
                "db_checked_at": row.db_checked_at,
                "expires_at": row.expires_at,
            }
        except Exception:
            self.logger.exception("Falha ao carregar sessao persistida.")
            return None
        finally:
            db.close()

    def delete_session_record(self, token: str) -> None:
        with self.active_sessions_lock:
            self.active_sessions.pop(token, None)
        db = self.open_db_session()
        if db is None:
            return
        try:
            row = db.query(self.app_session_model).filter(
                self.app_session_model.session_token_hash == self.session_token_hash(token)
            ).first()
            if row:
                db.delete(row)
                db.commit()
        except Exception:
            db.rollback()
            self.logger.exception("Falha ao remover sessao persistida.")
        finally:
            db.close()

    def persist_session_activity(self, token: str, session: dict[str, Any]) -> None:
        db = self.open_db_session()
        if db is None:
            return
        try:
            row = db.query(self.app_session_model).filter(
                self.app_session_model.session_token_hash == self.session_token_hash(token)
            ).first()
            if not row:
                return
            row.username = str(session.get("username", row.username))
            row.role = self.normalize_role(str(session.get("role", row.role)))
            row.must_change_password = bool(session.get("must_change_password", row.must_change_password))
            row.last_seen_at = session.get("last_seen_at") or row.last_seen_at
            row.db_checked_at = session.get("db_checked_at") or row.db_checked_at
            row.expires_at = session.get("expires_at") or row.expires_at
            db.commit()
        except Exception:
            db.rollback()
            self.logger.exception("Falha ao atualizar atividade da sessao.")
        finally:
            db.close()

    def sync_session_from_db(self, token: str, session: dict[str, Any]) -> Optional[dict[str, Any]]:
        now = self.utcnow()
        if self.config.db_sync_interval_seconds > 0:
            checked_at = session.get("db_checked_at")
            if isinstance(checked_at, datetime):
                checked_at_utc = checked_at if checked_at.tzinfo else checked_at.replace(tzinfo=timezone.utc)
                if checked_at_utc + timedelta(seconds=self.config.db_sync_interval_seconds) > now:
                    return session

        user_id_raw = str(session.get("user_id", "")).strip()
        if not user_id_raw:
            return session

        try:
            user_id = uuid.UUID(user_id_raw)
        except ValueError:
            self.delete_session_record(token)
            return None

        db = self.open_db_session()
        if db is None:
            return session
        try:
            row = db.query(self.app_session_model).filter(
                self.app_session_model.session_token_hash == self.session_token_hash(token)
            ).first()
            if not row:
                with self.active_sessions_lock:
                    self.active_sessions.pop(token, None)
                return None
            if row.expires_at <= now:
                db.delete(row)
                db.commit()
                with self.active_sessions_lock:
                    self.active_sessions.pop(token, None)
                return None
            user = db.get(self.app_user_model, user_id)
            if not user or not user.is_active:
                db.delete(row)
                db.commit()
                with self.active_sessions_lock:
                    self.active_sessions.pop(token, None)
                return None
            row.username = user.username
            row.role = self.normalize_role(user.role)
            row.must_change_password = bool(user.must_change_password)
            row.db_checked_at = now
            db.commit()
            session["username"] = user.username
            session["role"] = self.normalize_role(user.role)
            session["must_change_password"] = bool(user.must_change_password)
            session["db_checked_at"] = now
            session["expires_at"] = row.expires_at
            return session
        except Exception:
            db.rollback()
            self.logger.exception("Falha ao validar usuario da sessao no banco.")
            return session
        finally:
            db.close()

    def drop_sessions_for_user(self, user_id: uuid.UUID) -> None:
        user_id_str = str(user_id)
        with self.active_sessions_lock:
            stale_tokens = [
                token for token, data in self.active_sessions.items() if str(data.get("user_id", "")) == user_id_str
            ]
            for token in stale_tokens:
                self.active_sessions.pop(token, None)
        db = self.open_db_session()
        if db is None:
            return
        try:
            db.query(self.app_session_model).filter(self.app_session_model.user_id == user_id).delete()
            db.commit()
        except Exception:
            db.rollback()
            self.logger.exception("Falha ao invalidar sessoes do usuario.")
        finally:
            db.close()

    def _should_touch_session(self, request: Request) -> bool:
        method = (request.method or "").upper()
        if method != "GET":
            return True
        path = (request.url.path or "").rstrip("/") or "/"
        return path not in self.config.idle_passive_paths

    def read_session(self, request: Request) -> Optional[dict[str, Any]]:
        token = request.cookies.get(self.config.session_cookie_name)
        if not token:
            return None

        with self.active_sessions_lock:
            session = self.active_sessions.get(token)
        if not session:
            session = self.load_session_from_store(token)
            if not session:
                return None
            with self.active_sessions_lock:
                self.active_sessions[token] = session

        synced = self.sync_session_from_db(token, session)
        if not synced:
            return None
        session = synced

        now = self.utcnow()
        expires_at = session.get("expires_at")
        if not isinstance(expires_at, datetime) or expires_at <= now:
            self.delete_session_record(token)
            return None

        if self.config.idle_timeout_seconds > 0:
            last_seen = session.get("last_seen_at") or session.get("created_at")
            if not isinstance(last_seen, datetime):
                self.delete_session_record(token)
                return None
            if last_seen + timedelta(seconds=self.config.idle_timeout_seconds) <= now:
                self.delete_session_record(token)
                return None

        if self._should_touch_session(request):
            session["last_seen_at"] = now
            session["db_checked_at"] = now
            session["expires_at"] = now + timedelta(seconds=self.config.ttl_seconds)
            with self.active_sessions_lock:
                self.active_sessions[token] = session
            self.persist_session_activity(token, session)
        return session

    def read_session_user(self, request: Request) -> Optional[str]:
        session = self.read_session(request)
        if not session:
            return None
        return str(session.get("username", ""))

    def read_session_role(self, request: Request) -> Optional[str]:
        session = self.read_session(request)
        if not session:
            return None
        return str(session.get("role", ""))

    def require_app_session(self, request: Request) -> dict[str, Any]:
        session = self.read_session(request)
        if not session:
            raise HTTPException(status_code=401, detail="Nao autenticado")
        return session

    def require_fully_authenticated_session(self, request: Request) -> dict[str, Any]:
        session = self.require_app_session(request)
        if bool(session.get("must_change_password")):
            raise HTTPException(status_code=403, detail="Troca de senha obrigatoria")
        return session

    def require_app_user(self, request: Request) -> str:
        session = self.require_fully_authenticated_session(request)
        username = str(session.get("username", ""))
        if not username:
            raise HTTPException(status_code=401, detail="Nao autenticado")
        return username

    def require_roles(self, *roles: str) -> Callable[[Request], dict[str, Any]]:
        allowed_roles = {self.normalize_role(role) for role in roles if role}

        def _dependency(request: Request) -> dict[str, Any]:
            session = self.require_fully_authenticated_session(request)
            role = self.normalize_role(str(session.get("role", "")))
            if allowed_roles and role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Sem permissao para este perfil")
            return session

        return _dependency
