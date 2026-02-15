import os
import uuid
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, create_engine, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker
from sqlalchemy.sql import func

logger = logging.getLogger("sistema_credito")


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
    status_geral: Mapped[str] = mapped_column(String, nullable=False, default="EM_ANALISE")
    status_cca: Mapped[str] = mapped_column(String, nullable=False, default="EM_ANALISE")
    status_agehab: Mapped[str] = mapped_column(String, nullable=False, default="EM_ANALISE")
    pendente_fiador: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pendente_sinal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sla_credito_dias: Mapped[Optional[int]] = mapped_column(Integer)
    sla_corretor_dias: Mapped[Optional[int]] = mapped_column(Integer)
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
    status_geral: Optional[str] = None
    status_cca: Optional[str] = None
    status_agehab: Optional[str] = None
    pendente_fiador: Optional[bool] = None
    pendente_sinal: Optional[bool] = None
    sla_credito_dias: Optional[int] = None
    sla_corretor_dias: Optional[int] = None
    observacao: Optional[str] = None


class ProcessoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    cliente_id: uuid.UUID
    status_geral: str
    status_cca: str
    status_agehab: str
    pendente_fiador: bool
    pendente_sinal: bool
    sla_credito_dias: Optional[int] = None
    sla_corretor_dias: Optional[int] = None
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
            "que normalmente exige IPv6. Em Render, use a URL do Supavisor session mode "
            "(aws-0-<region>.pooler.supabase.com:5432)."
        )

    if engine is not None and os.getenv("AUTO_CREATE_TABLES", "false").lower() in {"1", "true", "yes"}:
        try:
            Base.metadata.create_all(bind=engine)
        except SQLAlchemyError:
            logger.exception("Falha ao executar create_all no startup.")
            if os.getenv("STARTUP_DB_STRICT", "false").lower() in {"1", "true", "yes"}:
                raise
    yield


app = FastAPI(title="Sistema Credito API", lifespan=lifespan)


@app.get("/")
def root():
    return {"service": "sistema-credito-api", "status": "ok"}


@app.get("/health")
def health():
    return {
        "ok": True,
        "db_configured": bool(DATABASE_URL),
        "db_url_valid": SessionLocal is not None,
        "db_url_has_placeholders": DB_URL_HAS_PLACEHOLDERS,
    }


@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"ok": True}


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
