import base64
import hashlib
import logging
import os
from functools import lru_cache
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken


logger = logging.getLogger("sistema_credito.security")
ENC_PREFIX = "enc::"
PROTECTED_FALLBACK = "[protegido]"


def hash_token(value: str) -> str:
    return hashlib.sha256((value or "").encode("utf-8")).hexdigest()


def normalize_email(value: Optional[str]) -> Optional[str]:
    text = (value or "").strip().lower()
    return text or None


def last4_digits(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    if not digits:
        return None
    return digits[-4:]


def mask_email(value: Optional[str]) -> Optional[str]:
    email = normalize_email(value)
    if not email or "@" not in email:
        return email
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = local[:1] + "*"
    else:
        masked_local = local[:2] + "*" * max(2, len(local) - 2)
    return f"{masked_local}@{domain}"


def mask_document(value: Optional[str]) -> Optional[str]:
    text = (value or "").strip()
    if not text:
        return None
    digits = "".join(ch for ch in text if ch.isdigit())
    if len(digits) >= 4:
        return f"***{digits[-4:]}"
    return "***"


def is_encrypted_value(value: Optional[str]) -> bool:
    return bool(value and str(value).startswith(ENC_PREFIX))


@lru_cache(maxsize=1)
def _get_fernet() -> Optional[Fernet]:
    raw_key = (os.getenv("PII_ENCRYPTION_KEY", "") or "").strip()
    if not raw_key:
        return None
    try:
        return Fernet(raw_key.encode("utf-8"))
    except Exception:
        logger.warning("PII_ENCRYPTION_KEY invalida. Dados sensiveis seguirao sem criptografia aplicada.")
        return None


def pii_encryption_enabled() -> bool:
    return _get_fernet() is not None


def generate_pii_encryption_key() -> str:
    return Fernet.generate_key().decode("utf-8")


def encrypt_pii(value: Optional[str]) -> Optional[str]:
    text = (value or "").strip()
    if not text:
        return None
    if is_encrypted_value(text):
        return text
    fernet = _get_fernet()
    if fernet is None:
        return text
    token = fernet.encrypt(text.encode("utf-8")).decode("utf-8")
    return f"{ENC_PREFIX}{token}"


def decrypt_pii(value: Optional[str]) -> Optional[str]:
    text = (value or "").strip()
    if not text:
        return None
    if not is_encrypted_value(text):
        return text
    fernet = _get_fernet()
    if fernet is None:
        return PROTECTED_FALLBACK
    token = text[len(ENC_PREFIX) :]
    try:
        return fernet.decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        logger.warning("Falha ao descriptografar valor protegido; retornando placeholder.")
        return PROTECTED_FALLBACK
    except Exception:
        logger.exception("Erro inesperado ao descriptografar valor protegido.")
        return PROTECTED_FALLBACK


def hash_optional(value: Optional[str]) -> Optional[str]:
    text = (value or "").strip()
    if not text:
        return None
    return hash_token(text.lower())


def hash_email(value: Optional[str]) -> Optional[str]:
    email = normalize_email(value)
    if not email:
        return None
    return hash_token(email)
