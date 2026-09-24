from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import urlopen

from fastapi import HTTPException

from app.config import get_settings
from app.supabase_client import get_supabase


LOCAL_UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "uploads" / "processos"
MERGED_UPLOAD_ROOT = LOCAL_UPLOAD_ROOT / "_merged"


def safe_segment(value: str) -> str:
    import re

    return re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-") or "arquivo"


def encode_storage_path(storage_path: str) -> str:
    return "/".join(quote(segment, safe="") for segment in storage_path.split("/"))


def upload_to_storage(path: str, content: bytes, content_type: str) -> str:
    settings = get_settings()
    bucket = get_supabase().storage.from_(settings.supabase_storage_bucket)
    bucket.upload(path, content, {"content-type": content_type, "upsert": "true"})
    return bucket.get_public_url(path)


def remove_from_storage(paths: list[str]) -> None:
    if not paths:
        return
    settings = get_settings()
    get_supabase().storage.from_(settings.supabase_storage_bucket).remove(paths)


def fallback_upload_url(reserva: str, storage_path: str) -> str:
    encoded_reserva = quote(reserva, safe="")
    return f"/api/processos/{encoded_reserva}/uploads/{encode_storage_path(storage_path)}"


def local_upload_path(storage_path: str) -> Path:
    return LOCAL_UPLOAD_ROOT / safe_segment(storage_path)


def save_local_upload(storage_path: str, content: bytes) -> None:
    path = local_upload_path(storage_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def upload_bytes(row: dict[str, Any]) -> bytes:
    storage_path = row.get("storage_path") or ""
    local_path = local_upload_path(storage_path)
    if local_path.exists():
        return local_path.read_bytes()

    url = row.get("url") or ""
    if url.startswith("/api/processos/"):
        raise HTTPException(status_code=404, detail=f"Arquivo local nao encontrado: {row.get('file_name')}")
    if url.startswith("http://") or url.startswith("https://"):
        with urlopen(url, timeout=30) as response:
            return response.read()
    raise HTTPException(status_code=404, detail=f"Arquivo nao encontrado: {row.get('file_name')}")
