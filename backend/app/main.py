from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import init_db
from app.routers.contexto import router as contexto_router
from app.routers.processos import router as processos_router

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


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "Sistema Credito Pro API",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
    }
