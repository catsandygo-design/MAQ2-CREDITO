from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List

class ClienteCreate(BaseModel):
    nome: str
    corretor: Optional[str] = None
    obra: Optional[str] = None
    reserva: Optional[str] = None

class ClienteOut(ClienteCreate):
    id: UUID

class ProcessoCreate(BaseModel):
    cliente_id: UUID

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
    id: UUID
    cliente_id: UUID
    status_geral: str
    status_cca: str
    status_agehab: str
    pendente_fiador: bool
    pendente_sinal: bool
    sla_credito_dias: Optional[int] = None
    sla_corretor_dias: Optional[int] = None
    observacao: Optional[str] = None

class DocumentoCreate(BaseModel):
    processo_id: UUID
    categoria: str
    nome: str

class DocumentoUpdate(BaseModel):
    status_doc: Optional[str] = None
    status_credito: Optional[str] = None

class DocumentoOut(BaseModel):
    id: UUID
    processo_id: UUID
    categoria: str
    nome: str
    status_doc: str
    status_credito: str
