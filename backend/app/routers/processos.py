import asyncio
import base64
import binascii
from datetime import datetime, timezone
from io import BytesIO
import logging
import re
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse, Response, StreamingResponse
from pypdf import PdfReader, PdfWriter
from starlette.datastructures import UploadFile

from app.db import execute, fetch_all, fetch_one
from app.config import get_settings
from app.models import (
    ChecklistMessageCreate,
    ChecklistMessageResponse,
    CredituDadosPayload,
    DiagnosticoProcessoResponse,
    DocumentoUpdate,
    PendenciaUpdate,
    ProcessoResponse,
    ProcessoUpdate,
    RelacionamentoUpdate,
    SlaResponse,
    UploadJsonPayload,
)
from app.normalizers import (
    AGEHAB_STATUS,
    CAIXA_STATUS,
    DOCUMENTO_STATUS,
    RELACIONAMENTO_STATUS,
    normalize,
)
from app.storage import (
    LOCAL_UPLOAD_ROOT,
    MERGED_UPLOAD_ROOT,
    fallback_upload_url,
    local_upload_path,
    remove_from_storage,
    save_local_upload,
    upload_bytes,
    upload_to_storage,
)

router = APIRouter(prefix="/processos", tags=["processos"])
logger = logging.getLogger(__name__)


def prazo_no_passado(valor: str | None) -> bool:
    if not valor:
        return False
    try:
        prazo = datetime.fromisoformat(valor.replace("Z", "+00:00"))
    except ValueError:
        return False
    agora = datetime.now(prazo.tzinfo or timezone.utc) if prazo.tzinfo else datetime.now()
    return prazo < agora

DOCUMENT_ORDER = [
    "documentos-do-proponente-identidade-e-cpf",
    "documentos-do-proponente-comp-de-estado-civil",
    "documentos-do-proponente-comprovante-de-residencia",
    "documentos-do-proponente-irpf-recibo",
    "documentos-do-proponente-extrato-fgts",
    "documentos-do-proponente-ctps-carteira",
    "dependente-filhos-menores",
    "dependente-filhos-maiores",
    "renda-formal",
    "renda-informal",
    "aposentados",
    "domesticos",
    "documentos-caixa",
    "documentos-agehab",
    "relacionamento-com-o-banco",
]


def safe_segment(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-") or "arquivo"


def parse_data_url(data: str) -> tuple[bytes, str]:
    content_type = "application/octet-stream"
    encoded = data
    if data.startswith("data:"):
        header, encoded = data.split(",", 1)
        content_type = header[5:].split(";")[0] or content_type
    try:
        return base64.b64decode(encoded), content_type
    except binascii.Error as exc:
        raise HTTPException(status_code=400, detail="Upload em base64 invalido.") from exc


def upsert_processo(reserva: str, values: dict[str, Any] | None = None) -> None:
    values = values or {}
    columns = ["reserva", *values.keys()]
    placeholders = ", ".join(["%s"] * len(columns))
    update_parts = [f"{column} = excluded.{column}" for column in values]
    if values:
        update_parts.append("updated_at = now()")
    updates = ", ".join(update_parts)
    conflict = f"do update set {updates}" if updates else "do nothing"
    execute(
        f"""
        insert into public.fastapi_processos ({", ".join(columns)})
        values ({placeholders})
        on conflict (reserva) {conflict}
        """,
        [reserva, *values.values()],
    )


def start_sla(reserva: str) -> None:
    upsert_processo(reserva)
    execute(
        """
        insert into public.fastapi_sla_processos (reserva, started_at, updated_at)
        values (%s, now(), now())
        on conflict (reserva) do update set updated_at = now()
        """,
        [reserva],
    )


def stop_sla(reserva: str, reason: str = "envio_conformidade") -> None:
    upsert_processo(reserva)
    execute(
        """
        insert into public.fastapi_sla_processos (reserva, started_at, stopped_at, stop_reason, updated_at)
        values (%s, now(), now(), %s, now())
        on conflict (reserva) do update set
          stopped_at = coalesce(public.fastapi_sla_processos.stopped_at, now()),
          stop_reason = coalesce(public.fastapi_sla_processos.stop_reason, excluded.stop_reason),
          updated_at = now()
        """,
        [reserva, reason],
    )


EVENT_LABELS = {
    "reserva": "Reserva",
    "em_analise_credito": "Em Analise Credito",
    "emitindo_formularios": "Emitindo Formularios",
    "formularios_em_assinatura": "Formulários Em Assinatura",
    "formularios_assinados": "Formularios Assinados",
    "envio_conformidade": "Enviado para Conformidade",
    "ficha_emitida": "Ficha emitida",
    "ficha_recebida": "Ficha Recebida",
    "em_validacao_agehab": "Em Validacao Agehab",
    "agehab_validada": "Agehab Validada",
}


def registrar_evento(reserva: str, status: str, id_corretor: str | None = None) -> None:
    execute(
        """
        insert into public.log_eventos (id_cliente, status, timestamp, id_corretor)
        values (%s, %s, now(), %s)
        """,
        [reserva, status, id_corretor],
    )


def registrar_historico_pendencia(
    reserva: str,
    documento_key: str,
    descricao: str = "",
    prazo: str | None = None,
    origem: str | None = None,
    evento: str = "criada",
    status_documento: str | None = None,
) -> None:
    execute(
        """
        insert into public.fastapi_pendencias_historico
          (reserva, documento_key, descricao, prazo, origem, evento, status_documento)
        values (%s, %s, %s, %s, %s, %s, %s)
        """,
        [reserva, documento_key, descricao, prazo, origem, evento, status_documento],
    )


def format_elapsed(seconds: int) -> str:
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours:
        return f"{hours}h {minutes:02d}m"
    return f"{minutes}m"


def get_sla(reserva: str) -> SlaResponse:
    row = fetch_one(
        """
        select
          reserva,
          started_at,
          stopped_at,
          stop_reason,
          extract(epoch from (coalesce(stopped_at, now()) - started_at))::int as elapsed_seconds
        from public.fastapi_sla_processos
        where reserva = %s
        """,
        [reserva],
    )
    if not row:
        return SlaResponse()
    elapsed = max(int(row.get("elapsed_seconds") or 0), 0)
    return SlaResponse(
        status="parado" if row.get("stopped_at") else "rodando",
        started_at=row["started_at"].isoformat() if row.get("started_at") else None,
        stopped_at=row["stopped_at"].isoformat() if row.get("stopped_at") else None,
        elapsed_seconds=elapsed,
        elapsed_label=format_elapsed(elapsed),
        stop_reason=row.get("stop_reason"),
    )


def table_rows(table: str, reserva: str) -> list[dict[str, Any]]:
    table_map = {
        "documentos_status": "fastapi_documentos_status",
        "relacionamento_status": "fastapi_relacionamento_status",
        "documentos_pendencias": "fastapi_documentos_pendencias",
        "pendencias_historico": "fastapi_pendencias_historico",
        "uploads": "fastapi_uploads",
    }
    physical_table = table_map.get(table)
    if not physical_table:
        raise ValueError("Tabela nao permitida.")
    return fetch_all(f"select * from public.{physical_table} where reserva = %s", [reserva])


def processo_to_response(processo: dict[str, Any], include_details: bool = True) -> ProcessoResponse:
    reserva = processo.get("reserva") or ""
    documentos: dict[str, str] = {}
    relacionamento: dict[str, str] = {}
    pendencias: dict[str, dict[str, Any]] = {}
    pendencias_historico: list[dict[str, Any]] = []
    uploads_cca: dict[str, dict[str, str]] = {}
    uploads_enviados: dict[str, bool] = {}
    uploads: list[dict[str, Any]] = []
    creditu: dict[str, str] = {}

    if include_details:
        documentos = {row["documento_key"]: row["status"] for row in table_rows("documentos_status", reserva)}
        relacionamento = {row["relacionamento_key"]: row["status"] for row in table_rows("relacionamento_status", reserva)}
        pendencias = {row["documento_key"]: row for row in table_rows("documentos_pendencias", reserva)}
        pendencias_historico = table_rows("pendencias_historico", reserva)
        uploads = table_rows("uploads", reserva)
        uploads_cca = {
            row["documento_key"]: {"name": row["file_name"], "data": row["url"]}
            for row in uploads
            if row.get("documento_key") and row.get("grupo") in {"corretor", "gestor", "caixa", "cca"}
        }
        uploads_enviados = {row["documento_key"]: True for row in uploads if row.get("documento_key")}
        ensure_creditu_table()
        creditu_row = fetch_one(
            "select email_segundo_proponente, telefone_segundo_proponente from public.fastapi_creditu_dados where reserva = %s",
            [reserva],
        )
        if creditu_row:
            creditu = {
                "email_segundo_proponente": creditu_row.get("email_segundo_proponente") or "",
                "telefone_segundo_proponente": creditu_row.get("telefone_segundo_proponente") or "",
            }

    return ProcessoResponse(
        reserva=reserva,
        cliente=processo.get("cliente"),
        caixa=processo.get("caixa_status") or "reserva",
        agehab=processo.get("agehab_status") or "reserva",
        produto=processo.get("produto"),
        sinal=processo.get("sinal"),
        fiador=processo.get("fiador"),
        corretor=processo.get("corretor"),
        empreendimento=processo.get("empreendimento"),
        cca_vinculado=processo.get("cca_vinculado"),
        observacao_analista=processo.get("observacao_analista"),
        encaminhado_analista=bool(processo.get("encaminhado_analista")),
        documentos=documentos,
        relacionamento=relacionamento,
        creditu=creditu,
        pendencias=pendencias,
        pendenciasHistorico=pendencias_historico,
        uploadsCca=uploads_cca,
        uploadsEnviados=uploads_enviados,
        temDocumentoEnviado=bool(uploads),
        sla=get_sla(reserva),
    )


def ensure_creditu_table() -> None:
    execute(
        """
        create extension if not exists pgcrypto;

        create table if not exists public.fastapi_creditu_dados (
          id uuid primary key default gen_random_uuid(),
          reserva text not null references public.fastapi_processos(reserva) on delete cascade,
          email_segundo_proponente text,
          telefone_segundo_proponente text,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (reserva)
        )
        """
    )


def documento_sort_key(row: dict[str, Any]) -> tuple[int, str, str]:
    key = row.get("documento_key") or ""
    group = row.get("grupo") or ""
    order = next((index for index, prefix in enumerate(DOCUMENT_ORDER) if key.startswith(prefix)), len(DOCUMENT_ORDER))
    return (order, key, group)


def upload_pdf_bytes(row: dict[str, Any]) -> bytes:
    return upload_bytes(row)


def merge_pdf_uploads(reserva: str, rows: list[dict[str, Any]]) -> FileResponse:
    pdf_uploads = sorted(
        [row for row in rows if (row.get("content_type") or "").lower() == "application/pdf"],
        key=documento_sort_key,
    )
    if not pdf_uploads:
        raise HTTPException(status_code=404, detail="Nenhum PDF encontrado para esta reserva.")

    writer = PdfWriter()
    for row in pdf_uploads:
        try:
            reader = PdfReader(BytesIO(upload_pdf_bytes(row)))
            for page in reader.pages:
                writer.add_page(page)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Nao foi possivel juntar o PDF: {row.get('file_name')}") from exc

    MERGED_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    output_path = MERGED_UPLOAD_ROOT / f"kit-documental-{safe_segment(reserva)}.pdf"
    with output_path.open("wb") as output:
        writer.write(output)

    return FileResponse(
        output_path,
        media_type="application/pdf",
        filename=f"KIT_DOCUMENTAL_RESERVA_{safe_segment(reserva)}.pdf",
    )


def merge_creditu_uploads(reserva: str, rows: list[dict[str, Any]]) -> FileResponse:
    creditu_order = [
        "documentos-creditu-tela-score-cliente",
        "documentos-creditu-rg-cpf-ou-cnh",
        "documentos-creditu-tela-score-segundo-proponente",
        "documentos-creditu-tela-aprovacao-creditu",
        "documentos-creditu-tela-sicaq-cliente",
    ]
    basic_order = [
        "documentos-do-proponente-identidade-e-cpf",
        "renda-formal-clt-vinculo-holerites",
        "renda-formal-clt-vinculo-renda-variavel",
        "renda-informal-autonomo-liberal-extrato-bancario",
        "aposentados-pensionistas-extrato-do-beneficio",
        "domesticos-contratacao-por-cpf-esocial",
        "documentos-do-proponente-comprovante-de-residencia",
        "documentos-do-proponente-comp-de-estado-civil",
    ]

    def select_by_prefixes(prefixes: list[str]) -> list[dict[str, Any]]:
        selected: list[dict[str, Any]] = []
        for prefix in prefixes:
            match = next(
                (
                    row
                    for row in rows
                    if (row.get("content_type") or "").lower() == "application/pdf"
                    and (row.get("documento_key") or "").startswith(prefix)
                    and row not in selected
                ),
                None,
            )
            if match:
                selected.append(match)
        return selected

    selected = select_by_prefixes(creditu_order)
    filename_prefix = "CREDITU"
    if not selected:
        selected = select_by_prefixes(basic_order)
        filename_prefix = "DOCUMENTOS_BASICOS_CREDITU"
    if not selected:
        raise HTTPException(status_code=404, detail="Não existem documentos disponíveis para download.")

    writer = PdfWriter()
    for row in selected:
        try:
            reader = PdfReader(BytesIO(upload_pdf_bytes(row)))
            for page in reader.pages:
                writer.add_page(page)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Nao foi possivel juntar o PDF: {row.get('file_name')}") from exc

    MERGED_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    output_path = MERGED_UPLOAD_ROOT / f"creditu-{safe_segment(reserva)}.pdf"
    with output_path.open("wb") as output:
        writer.write(output)

    return FileResponse(
        output_path,
        media_type="application/pdf",
        filename=f"{filename_prefix}_RESERVA_{safe_segment(reserva)}.pdf",
    )


def merge_kit_caixa_uploads(reserva: str, rows: list[dict[str, Any]]) -> FileResponse:
    kit_caixa_order = [
        ["documentos-do-proponente-identidade-e-cpf"],
        ["documentos-do-proponente-comp-de-estado-civil"],
        ["conjuge", "cônjuge", "conjuge-identidade", "conjuge-rg", "conjuge-cpf"],
        ["dependente-filhos-menores", "dependente-filhos-maiores"],
        ["documentos-do-proponente-comprovante-de-residencia"],
        ["renda-formal"],
        ["documentos-caixa-damp"],
        ["documentos-caixa-ficha-de-cadastro-caixa"],
        ["documentos-caixa-abertura-de-conta"],
        ["documentos-caixa-mo"],
        ["documentos-caixa-formulario-cartao", "documentos-caixa-proposta-cartao"],
        ["documentos-caixa-formulario-cheque-azul"],
    ]

    latest_by_key: dict[str, dict[str, Any]] = {}
    for row in rows:
        if (row.get("content_type") or "").lower() != "application/pdf":
            continue
        key = row.get("documento_key") or ""
        if not key:
            continue
        current = latest_by_key.get(key)
        if not current or str(row.get("created_at") or "") > str(current.get("created_at") or ""):
            latest_by_key[key] = row

    selected: list[dict[str, Any]] = []
    selected_keys: set[str] = set()
    for prefixes in kit_caixa_order:
        matches = sorted(
            [
                row
                for key, row in latest_by_key.items()
                if key not in selected_keys and any(key.startswith(prefix) for prefix in prefixes)
            ],
            key=lambda item: item.get("documento_key") or "",
        )
        for row in matches:
            selected.append(row)
            selected_keys.add(row.get("documento_key") or "")

    if not selected:
        raise HTTPException(status_code=404, detail="Não existem documentos do Kit Caixa disponíveis para download.")

    writer = PdfWriter()
    for row in selected:
        try:
            reader = PdfReader(BytesIO(upload_pdf_bytes(row)))
            for page in reader.pages:
                writer.add_page(page)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Nao foi possivel juntar o PDF: {row.get('file_name')}") from exc

    MERGED_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    output_path = MERGED_UPLOAD_ROOT / f"kit-caixa-{safe_segment(reserva)}.pdf"
    with output_path.open("wb") as output:
        writer.write(output)

    return FileResponse(
        output_path,
        media_type="application/pdf",
        filename=f"KIT_CAIXA_RESERVA_{safe_segment(reserva)}.pdf",
    )


def merge_kit_agehab_uploads(reserva: str, rows: list[dict[str, Any]]) -> FileResponse:
    kit_agehab_order = [
        "documentos-agehab-declaracao-de-endereco",
        "documentos-agehab-declaracao-renda-informal",
        "documentos-agehab-declaracao-de-nao-renda",
        "documentos-agehab-vinculo-3-anos",
        "documentos-agehab-checklist-agehab",
        "documentos-agehab-ficha-agehab",
    ]

    latest_by_key: dict[str, dict[str, Any]] = {}
    for row in rows:
        if (row.get("content_type") or "").lower() != "application/pdf":
            continue
        key = row.get("documento_key") or ""
        if not key or not any(key.startswith(prefix) for prefix in kit_agehab_order):
            continue
        current = latest_by_key.get(key)
        if not current or str(row.get("created_at") or "") > str(current.get("created_at") or ""):
            latest_by_key[key] = row

    selected: list[dict[str, Any]] = []
    selected_keys: set[str] = set()
    for prefix in kit_agehab_order:
        matches = sorted(
            [
                row
                for key, row in latest_by_key.items()
                if key not in selected_keys and key.startswith(prefix)
            ],
            key=lambda item: item.get("documento_key") or "",
        )
        for row in matches:
            selected.append(row)
            selected_keys.add(row.get("documento_key") or "")

    if not selected:
        raise HTTPException(status_code=404, detail="Não existem documentos do Kit AGEHAB disponíveis para download.")

    writer = PdfWriter()
    for row in selected:
        try:
            reader = PdfReader(BytesIO(upload_pdf_bytes(row)))
            for page in reader.pages:
                writer.add_page(page)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Nao foi possivel juntar o PDF: {row.get('file_name')}") from exc

    MERGED_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    output_path = MERGED_UPLOAD_ROOT / f"kit-agehab-{safe_segment(reserva)}.pdf"
    with output_path.open("wb") as output:
        writer.write(output)

    return FileResponse(
        output_path,
        media_type="application/pdf",
        filename=f"KIT_AGEHAB_RESERVA_{safe_segment(reserva)}.pdf",
    )


def processos_event_signature(reserva: str | None = None) -> str:
    where = "where reserva = %s" if reserva else ""
    params = [reserva] if reserva else []
    row = fetch_one(
        f"""
        select concat_ws('|',
          coalesce((select max(updated_at)::text from public.fastapi_processos {where}), ''),
          coalesce((select max(updated_at)::text from public.fastapi_documentos_status {where}), ''),
          coalesce((select max(updated_at)::text from public.fastapi_documentos_pendencias {where}), ''),
          coalesce((select max(created_at)::text from public.fastapi_uploads {where}), ''),
          coalesce((select max(updated_at)::text from public.fastapi_relacionamento_status {where}), '')
        ) as signature
        """,
        params * 5,
    )
    return str(row.get("signature") if row else "")


@router.get("", response_model=list[ProcessoResponse])
def listar_processos(destino: str | None = None) -> list[ProcessoResponse]:
    where = ""
    params: list[Any] = []
    if destino == "analista":
        where = "where encaminhado_analista = true"
    elif destino == "cca":
        where = "where encaminhado_analista = true and caixa_status in (%s, %s, %s, %s)"
        params.extend(["emitindo_formularios", "formularios_em_assinatura", "formularios_assinados", "envio_conformidade"])

    rows = fetch_all(
        f"""
        select * from public.fastapi_processos
        {where}
        order by updated_at desc, created_at desc
        limit 100
        """,
        params,
    )
    return [processo_to_response(row, include_details=True) for row in rows]


@router.get("/diagnosticos/gargalos", response_model=list[DiagnosticoProcessoResponse])
def diagnosticar_gargalos(sla_meta: int = 7, retrabalho_corte: int = 0) -> list[DiagnosticoProcessoResponse]:
    rows = fetch_all(
        """
        with eventos as (
          select
            id_cliente,
            status,
            lower(status) as status_norm,
            "timestamp" as evento_em,
            id_corretor
          from public.log_eventos
        ),
        marcos as (
          select
            id_cliente,
            min(evento_em) filter (where status = 'Reserva') as reserva_em,
            min(evento_em) filter (where status = 'Enviado para Conformidade') as conformidade_em
          from eventos
          group by id_cliente
        ),
        corretores as (
          select distinct on (id_cliente)
            id_cliente,
            id_corretor
          from eventos
          where id_corretor is not null
          order by id_cliente, evento_em desc
        ),
        retrabalhos as (
          select
            e.id_cliente,
            count(*)::int as qtd_retrabalho
          from eventos e
          where e.status in ('Formulários Em Assinatura', 'Ficha emitida')
            and exists (
              select 1
              from eventos inval
              where inval.id_cliente = e.id_cliente
                and inval.evento_em < e.evento_em
                and (
                  inval.status_norm like '%%invalid%%'
                  or inval.status_norm like '%%pendenc%%'
                  or inval.status_norm like '%%reprov%%'
                )
            )
          group by e.id_cliente
        )
        select
          m.id_cliente,
          c.id_corretor,
          round((extract(epoch from (m.conformidade_em - m.reserva_em)) / 86400)::numeric, 2)::float as "Lead_Time_Total",
          coalesce(r.qtd_retrabalho, 0) as "Qtd_Retrabalho",
          case
            when extract(epoch from (m.conformidade_em - m.reserva_em)) / 86400 > %s
             and coalesce(r.qtd_retrabalho, 0) > %s then 'Problema Documental'
            when extract(epoch from (m.conformidade_em - m.reserva_em)) / 86400 > %s
             and coalesce(r.qtd_retrabalho, 0) <= %s then 'Problema de Processo'
            else 'Processo Eficiente'
          end as "Diagnostico"
        from marcos m
        left join retrabalhos r on r.id_cliente = m.id_cliente
        left join corretores c on c.id_cliente = m.id_cliente
        where m.reserva_em is not null
          and m.conformidade_em is not null
        order by "Lead_Time_Total" desc, m.id_cliente
        """,
        [sla_meta, retrabalho_corte, sla_meta, retrabalho_corte],
    )
    return [DiagnosticoProcessoResponse(**row) for row in rows]


@router.get("/events")
async def processo_events(reserva: str | None = None) -> StreamingResponse:
    async def stream():
        last_signature = processos_event_signature(reserva)
        yield "event: ready\ndata: ok\n\n"
        while True:
            await asyncio.sleep(12)
            signature = processos_event_signature(reserva)
            if signature != last_signature:
                last_signature = signature
                yield "event: change\ndata: updated\n\n"
            else:
                yield "event: ping\ndata: ok\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.get("/{reserva}", response_model=ProcessoResponse)
def obter_processo(reserva: str) -> ProcessoResponse:
    processo = fetch_one("select * from public.fastapi_processos where reserva = %s", [reserva]) or {"reserva": reserva}
    return processo_to_response(processo)


@router.put("/{reserva}")
def atualizar_processo(reserva: str, payload: ProcessoUpdate) -> dict[str, Any]:
    values = payload.model_dump(exclude_none=True)
    if "caixa" in values:
        values["caixa_status"] = normalize(values.pop("caixa"), CAIXA_STATUS, "caixa")
    if "agehab" in values:
        values["agehab_status"] = normalize(values.pop("agehab"), AGEHAB_STATUS, "agehab")
    upsert_processo(reserva, values)
    start_sla(reserva)
    corretor = values.get("corretor")
    if values.get("encaminhado_analista"):
        registrar_evento(reserva, "Reserva", corretor)
    if values.get("caixa_status"):
        registrar_evento(reserva, EVENT_LABELS.get(values["caixa_status"], values["caixa_status"]), corretor)
    if values.get("agehab_status"):
        registrar_evento(reserva, EVENT_LABELS.get(values["agehab_status"], values["agehab_status"]), corretor)
    if values.get("caixa_status") == "envio_conformidade":
        stop_sla(reserva, "envio_conformidade")
    return {"ok": True, "reserva": reserva, "sla": get_sla(reserva).model_dump()}


@router.post("/{reserva}/sla/start")
def iniciar_sla(reserva: str) -> dict[str, Any]:
    start_sla(reserva)
    return {"ok": True, "reserva": reserva, "sla": get_sla(reserva).model_dump()}


@router.post("/{reserva}/sla/stop")
def parar_sla(reserva: str) -> dict[str, Any]:
    stop_sla(reserva, "manual")
    return {"ok": True, "reserva": reserva, "sla": get_sla(reserva).model_dump()}


@router.put("/{reserva}/documentos/{documento_key}/pendencia")
def salvar_pendencia(reserva: str, documento_key: str, payload: PendenciaUpdate) -> dict[str, Any]:
    if prazo_no_passado(payload.prazo):
        raise HTTPException(status_code=400, detail="O prazo da pendencia nao pode ser anterior ao horario atual.")
    upsert_processo(reserva)
    registrar_evento(reserva, "Pendencia documental", payload.origem)
    documento = payload.documento or documento_key
    registrar_historico_pendencia(
        reserva=reserva,
        documento_key=documento,
        descricao=payload.descricao,
        prazo=payload.prazo,
        origem=payload.origem,
        evento="criada",
    )
    execute(
        """
        insert into public.fastapi_documentos_pendencias (reserva, documento_key, descricao, prazo, origem, destino_card)
        values (%s, %s, %s, %s, %s, %s)
        on conflict (reserva, documento_key)
        do update set
          descricao = excluded.descricao,
          prazo = excluded.prazo,
          origem = excluded.origem,
          destino_card = excluded.destino_card
        """,
        [reserva, documento, payload.descricao, payload.prazo, payload.origem, payload.destinoCard or "card1"],
    )
    return {"ok": True, "reserva": reserva, "documento": documento_key, "card1Atualizado": True}


@router.get("/{reserva}/messages", response_model=list[ChecklistMessageResponse])
def listar_mensagens_processo(reserva: str) -> list[dict[str, Any]]:
    rows = fetch_all(
        """
        select id::text, reserva, documento_key, author_name, author_role,
               coalesce(target_role, 'todos') as target_role, message,
               created_at::text, read_at::text
        from public.fastapi_checklist_messages
        where reserva = %s
        order by created_at asc
        """,
        [reserva],
    )
    labels = {"analista": "Analista", "corretor": "Corretor", "gestor": "Gestor", "cca": "CCA", "todos": "Todos"}
    for row in rows:
        target_role = row.get("target_role") or "todos"
        row["targetRole"] = target_role
        row["targetLabel"] = labels.get(target_role, target_role.title())
    return rows


@router.get("/{reserva}/creditu")
def obter_creditu(reserva: str) -> dict[str, str]:
    if not reserva:
        raise HTTPException(status_code=400, detail="Reserva nao informada.")
    try:
        ensure_creditu_table()
        row = fetch_one(
            "select email_segundo_proponente, telefone_segundo_proponente from public.fastapi_creditu_dados where reserva = %s",
            [reserva],
        )
    except Exception as exc:
        logger.exception("Erro ao buscar dados Creditú da reserva %s", reserva)
        raise HTTPException(status_code=500, detail=f"Erro ao buscar dados Creditú: {type(exc).__name__}: {exc}") from exc
    return {
        "email_segundo_proponente": (row or {}).get("email_segundo_proponente") or "",
        "telefone_segundo_proponente": (row or {}).get("telefone_segundo_proponente") or "",
    }


@router.put("/{reserva}/creditu")
def salvar_creditu(reserva: str, payload: CredituDadosPayload) -> dict[str, str]:
    if not reserva:
        raise HTTPException(status_code=400, detail="Reserva nao informada.")
    try:
        ensure_creditu_table()
        upsert_processo(reserva)
        atual = obter_creditu(reserva)
        email = payload.email_segundo_proponente if payload.email_segundo_proponente is not None else atual["email_segundo_proponente"]
        telefone = payload.telefone_segundo_proponente if payload.telefone_segundo_proponente is not None else atual["telefone_segundo_proponente"]
        row = fetch_one(
            """
            insert into public.fastapi_creditu_dados (reserva, email_segundo_proponente, telefone_segundo_proponente)
            values (%s, %s, %s)
            on conflict (reserva)
            do update set
              email_segundo_proponente = excluded.email_segundo_proponente,
              telefone_segundo_proponente = excluded.telefone_segundo_proponente,
              updated_at = now()
            returning email_segundo_proponente, telefone_segundo_proponente
            """,
            [reserva, email, telefone],
        )
    except Exception as exc:
        logger.exception("Erro ao salvar dados Creditú da reserva %s", reserva)
        raise HTTPException(status_code=500, detail=f"Erro ao salvar dados Creditú: {type(exc).__name__}: {exc}") from exc
    return {
        "email_segundo_proponente": (row or {}).get("email_segundo_proponente") or "",
        "telefone_segundo_proponente": (row or {}).get("telefone_segundo_proponente") or "",
    }


@router.post("/{reserva}/messages", response_model=ChecklistMessageResponse)
def criar_mensagem_processo(
    reserva: str,
    payload: ChecklistMessageCreate,
) -> dict[str, Any]:
    mensagem = payload.message.strip()
    if not mensagem:
        raise HTTPException(status_code=400, detail="Mensagem obrigatoria.")
    target_role = (payload.targetRole or payload.target_role or "todos").strip().lower()
    if target_role not in {"analista", "corretor", "gestor", "cca", "todos"}:
        raise HTTPException(status_code=400, detail="Destinatario invalido.")
    upsert_processo(reserva)
    row = fetch_one(
        """
        insert into public.fastapi_checklist_messages
          (reserva, documento_key, author_name, author_role, target_role, message)
        values (%s, %s, %s, %s, %s, %s)
        returning id::text, reserva, documento_key, author_name, author_role,
                  target_role, message,
                  created_at::text, read_at::text
        """,
        [reserva, payload.documento_key, payload.author_name.strip() or payload.author_role, payload.author_role, target_role, mensagem],
    )
    if not row:
        raise HTTPException(status_code=500, detail="Nao foi possivel salvar a mensagem.")
    labels = {"analista": "Analista", "corretor": "Corretor", "gestor": "Gestor", "cca": "CCA", "todos": "Todos"}
    row["targetRole"] = row.get("target_role") or "todos"
    row["targetLabel"] = labels.get(row["targetRole"], row["targetRole"].title())
    return row


@router.put("/{reserva}/documentos/{documento_key}")
def atualizar_documento(reserva: str, documento_key: str, payload: DocumentoUpdate) -> dict[str, Any]:
    status = normalize(payload.status, DOCUMENTO_STATUS, "status")
    upsert_processo(reserva)
    registrar_evento(reserva, status, payload.updated_by)
    execute(
        """
        insert into public.fastapi_documentos_status (reserva, documento_key, status, updated_by)
        values (%s, %s, %s, %s)
        on conflict (reserva, documento_key)
        do update set status = excluded.status, updated_by = excluded.updated_by, updated_at = now()
        """,
        [reserva, documento_key, status, payload.updated_by],
    )
    if status != "Pendente":
        pendencia = fetch_one(
            "select * from public.fastapi_documentos_pendencias where reserva = %s and documento_key = %s",
            [reserva, documento_key],
        )
        if pendencia:
            registrar_historico_pendencia(
                reserva=reserva,
                documento_key=documento_key,
                descricao=pendencia.get("descricao") or "",
                prazo=pendencia.get("prazo"),
                origem=payload.updated_by,
                evento="tratada",
                status_documento=status,
            )
        execute(
            "delete from public.fastapi_documentos_pendencias where reserva = %s and documento_key = %s",
            [reserva, documento_key],
        )
    return {"ok": True, "reserva": reserva, "documento": documento_key, "status": status}


@router.put("/{reserva}/relacionamento/{relacionamento_key}")
def atualizar_relacionamento(
    reserva: str,
    relacionamento_key: str,
    payload: RelacionamentoUpdate,
) -> dict[str, Any]:
    status = normalize(payload.status, RELACIONAMENTO_STATUS, "status")
    upsert_processo(reserva)
    execute(
        """
        insert into public.fastapi_relacionamento_status (reserva, relacionamento_key, status, updated_by)
        values (%s, %s, %s, %s)
        on conflict (reserva, relacionamento_key)
        do update set status = excluded.status, updated_by = excluded.updated_by, updated_at = now()
        """,
        [reserva, relacionamento_key, status, payload.updated_by],
    )
    return {"ok": True, "reserva": reserva, "relacionamento": relacionamento_key, "status": status}


@router.get("/{reserva}/uploads", response_model=None)
def listar_uploads(reserva: str, grupo: str | None = None, merge: str | None = None) -> Any:
    params: list[Any] = [reserva]
    where = "where reserva = %s"
    if grupo:
        where += " and grupo = %s"
        params.append(grupo)
    rows = fetch_all(f"select * from public.fastapi_uploads {where} order by created_at desc", params)
    if merge == "1":
        return merge_pdf_uploads(reserva, rows)

    uploads = [{"key": row["documento_key"], "name": row["file_name"], "url": row["url"]} for row in rows]
    return {
        "temAnexoCaixa": bool(uploads),
        "temDocumentoEnviado": bool(uploads),
        "uploads": uploads,
    }


@router.get("/{reserva}/creditu/download", response_model=None)
def baixar_creditu(reserva: str) -> FileResponse:
    rows = fetch_all(
        "select * from public.fastapi_uploads where reserva = %s order by created_at desc",
        [reserva],
    )
    return merge_creditu_uploads(reserva, rows)


@router.get("/{reserva}/kit-caixa/download", response_model=None)
def baixar_kit_caixa(reserva: str) -> FileResponse:
    rows = fetch_all(
        "select * from public.fastapi_uploads where reserva = %s order by created_at desc",
        [reserva],
    )
    return merge_kit_caixa_uploads(reserva, rows)


@router.get("/{reserva}/kit-agehab/download", response_model=None)
def baixar_kit_agehab(reserva: str) -> FileResponse:
    rows = fetch_all(
        "select * from public.fastapi_uploads where reserva = %s order by created_at desc",
        [reserva],
    )
    return merge_kit_agehab_uploads(reserva, rows)


@router.post("/{reserva}/uploads")
async def criar_upload(reserva: str, request: Request) -> dict[str, Any]:
    content_type = request.headers.get("content-type", "")

    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        file = form.get("file")
        if not isinstance(file, UploadFile):
            raise HTTPException(status_code=400, detail="Arquivo nao enviado.")
        grupo = str(form.get("grupo") or "corretor")
        documento_key = str(form.get("key") or form.get("documento_key") or file.filename)
        file_name = str(form.get("name") or file.filename)
        content = await file.read()
        file_content_type = file.content_type or "application/octet-stream"
        created_by = str(form.get("created_by") or "") or None
    else:
        payload = UploadJsonPayload.model_validate(await request.json())
        grupo = payload.grupo
        documento_key = payload.key
        file_name = payload.name
        content, file_content_type = parse_data_url(payload.data)
        created_by = payload.created_by

    safe_name = safe_segment(file_name)
    storage_path = f"{safe_segment(reserva)}/{safe_segment(grupo)}/{safe_segment(documento_key)}-{safe_name}"
    storage_backend = "supabase"
    try:
        url = upload_to_storage(storage_path, content, file_content_type)
    except Exception as exc:
        settings = get_settings()
        logger.warning(
            "Falha ao enviar upload para Supabase Storage; bucket=%s path=%s error=%s",
            settings.supabase_storage_bucket,
            storage_path,
            exc,
        )
        if not settings.allow_local_upload_fallback:
            raise HTTPException(status_code=502, detail="Falha ao salvar arquivo no Supabase Storage.") from exc
        storage_backend = "local"
        save_local_upload(storage_path, content)
        url = fallback_upload_url(reserva, storage_path)

    upsert_processo(reserva)
    start_sla(reserva)
    execute(
        """
        insert into public.fastapi_uploads
          (reserva, grupo, documento_key, file_name, storage_path, url, content_type, created_by)
        values (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        [reserva, grupo, documento_key, file_name, storage_path, url, file_content_type, created_by],
    )
    execute(
        """
        insert into public.fastapi_documentos_status (reserva, documento_key, status, updated_by)
        values (%s, %s, %s, %s)
        on conflict (reserva, documento_key)
        do update set status = excluded.status, updated_by = excluded.updated_by, updated_at = now()
        """,
        [reserva, documento_key, "Enviado", grupo],
    )
    execute(
        "delete from public.fastapi_documentos_pendencias where reserva = %s and documento_key = %s",
        [reserva, documento_key],
    )

    return {"ok": True, "key": documento_key, "name": file_name, "url": url, "storage": storage_backend, "temDocumentoEnviado": True}


@router.get("/{reserva}/uploads/{storage_name:path}", response_model=None)
def abrir_upload_local(reserva: str, storage_name: str) -> FileResponse:
    row = fetch_one(
        """
        select file_name, storage_path, content_type
        from public.fastapi_uploads
        where reserva = %s and storage_path = %s
        order by created_at desc
        limit 1
        """,
        [reserva, storage_name],
    )
    if not row:
        row = fetch_one(
            """
            select file_name, storage_path, content_type
            from public.fastapi_uploads
            where reserva = %s and replace(storage_path, '/', '-') = %s
            order by created_at desc
            limit 1
            """,
            [reserva, storage_name],
        )
    if not row:
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado.")

    path = local_upload_path(row["storage_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Arquivo local nao encontrado.")

    return FileResponse(
        path,
        media_type=row.get("content_type") or "application/octet-stream",
        filename=row.get("file_name") or path.name,
    )


@router.delete("/{reserva}/uploads")
def remover_uploads(reserva: str, grupo: str | None = None) -> Response:
    params: list[Any] = [reserva]
    where = "where reserva = %s"
    if grupo:
        where += " and grupo = %s"
        params.append(grupo)
    rows = fetch_all(f"select * from public.fastapi_uploads {where}", params)

    paths = [row["storage_path"] for row in rows if row.get("storage_path")]
    remove_from_storage(paths)

    execute(f"delete from public.fastapi_uploads {where}", params)
    return Response(status_code=204)
