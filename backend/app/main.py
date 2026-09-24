from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import fetch_one, init_db
from app.routers.contexto import router as contexto_router
from app.routers.processos import router as processos_router
from app.supabase_client import get_supabase

settings = get_settings()

app = FastAPI(title="Sistema Credito Pro API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(contexto_router, prefix="/api")
app.include_router(processos_router, prefix="/api")


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/health/supabase")
def supabase_health() -> dict[str, object]:
    checks: dict[str, object] = {
        "ok": True,
        "database": {"ok": False},
        "storage": {"ok": False, "bucket": settings.supabase_storage_bucket},
        "config": {
            "supabase_url": bool(settings.supabase_url),
            "service_role_key": bool(settings.supabase_service_role_key),
            "database_url": bool(settings.database_url),
            "allow_local_upload_fallback": settings.allow_local_upload_fallback,
        },
    }

    try:
        fetch_one("select 1 as ok")
        checks["database"] = {"ok": True}
    except Exception as exc:
        checks["ok"] = False
        checks["database"] = {"ok": False, "error": type(exc).__name__}

    try:
        bucket = get_supabase().storage.from_(settings.supabase_storage_bucket)
        bucket.list("", {"limit": 1})
        checks["storage"] = {"ok": True, "bucket": settings.supabase_storage_bucket}
    except Exception as exc:
        checks["ok"] = False
        checks["storage"] = {
            "ok": False,
            "bucket": settings.supabase_storage_bucket,
            "error": type(exc).__name__,
            "message": str(exc)[:240],
        }

    return checks


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "Sistema Credito Pro API",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
    }
