from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Base(DeclarativeBase):
    pass

class Cliente(Base):
    __tablename__ = "clientes"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    corretor: Mapped[str | None] = mapped_column(Text)
    obra: Mapped[str | None] = mapped_column(Text)
    reserva: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

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

    sla_credito_dias: Mapped[int | None] = mapped_column(Integer)
    sla_corretor_dias: Mapped[int | None] = mapped_column(Integer)
    observacao: Mapped[str | None] = mapped_column(Text)

    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cliente: Mapped["Cliente"] = relationship(back_populates="processos")
    documentos: Mapped[list["Documento"]] = relationship(back_populates="processo", cascade="all, delete-orphan")

class Documento(Base):
    __tablename__ = "documentos"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    processo_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("processos.id", ondelete="CASCADE"))

    categoria: Mapped[str] = mapped_column(String, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)

    status_doc: Mapped[str] = mapped_column(String, nullable=False, default="PENDENTE")
    status_credito: Mapped[str] = mapped_column(String, nullable=False, default="ANALISE")

    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    processo: Mapped["Processo"] = relationship(back_populates="documentos")
