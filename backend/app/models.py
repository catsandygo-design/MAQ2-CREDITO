from typing import Any

from pydantic import BaseModel, Field


class ContextoPayload(BaseModel):
    contexto: str


class ProcessoUpdate(BaseModel):
    caixa: str | None = None
    agehab: str | None = None
    cliente: str | None = None
    produto: str | None = None
    sinal: str | None = None
    fiador: str | None = None
    corretor: str | None = None
    empreendimento: str | None = None
    encaminhado_analista: bool | None = None


class DocumentoUpdate(BaseModel):
    status: str
    updated_by: str | None = None


class RelacionamentoUpdate(BaseModel):
    status: str
    updated_by: str | None = None


class PendenciaUpdate(BaseModel):
    descricao: str = ""
    prazo: str | None = None
    documento: str | None = None
    origem: str | None = None
    destinoCard: str | None = Field(default=None)


class UploadJsonPayload(BaseModel):
    grupo: str = "geral"
    key: str
    name: str
    data: str
    created_by: str | None = None


class SlaResponse(BaseModel):
    status: str = "nao_iniciado"
    started_at: str | None = None
    stopped_at: str | None = None
    elapsed_seconds: int = 0
    elapsed_label: str = "0h"
    stop_reason: str | None = None


class ProcessoResponse(BaseModel):
    reserva: str
    cliente: str | None = None
    caixa: str = "reserva"
    agehab: str = "reserva"
    produto: str | None = None
    sinal: str | None = None
    fiador: str | None = None
    corretor: str | None = None
    empreendimento: str | None = None
    encaminhado_analista: bool = False
    documentos: dict[str, str] = Field(default_factory=dict)
    relacionamento: dict[str, str] = Field(default_factory=dict)
    pendencias: dict[str, dict[str, Any]] = Field(default_factory=dict)
    uploadsCca: dict[str, dict[str, str]] = Field(default_factory=dict)
    uploadsEnviados: dict[str, bool] = Field(default_factory=dict)
    temDocumentoEnviado: bool = False
    sla: SlaResponse = Field(default_factory=SlaResponse)
