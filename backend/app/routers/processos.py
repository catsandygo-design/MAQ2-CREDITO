import base64
import binascii
from io import BytesIO
import re
from pathlib import Path
from typing import Any
from urllib.request import urlopen

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse, Response
from pypdf import PdfReader, PdfWriter
from starlette.datastructures import UploadFile

from app.config import get_settings
from app.db import execute, fetch_all, fetch_one
from app.models import (
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
from app.supabase_client import get_supabase

router = APIRouter(prefix="/processos", tags=["processos"])
LOCAL_UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "processos"
MERGED_UPLOAD_ROOT = LOCAL_UPLOAD_ROOT / "_merged"

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
    uploads_cca: dict[str, dict[str, str]] = {}
    uploads_enviados: dict[str, bool] = {}
    uploads: list[dict[str, Any]] = []

    if include_details:
        documentos = {row["documento_key"]: row["status"] for row in table_rows("documentos_status", reserva)}
        relacionamento = {row["relacionamento_key"]: row["status"] for row in table_rows("relacionamento_status", reserva)}
        pendencias = {row["documento_key"]: row for row in table_rows("documentos_pendencias", reserva)}
        uploads = table_rows("uploads", reserva)
        uploads_cca = {
            row["documento_key"]: {"name": row["file_name"], "data": row["url"]}
            for row in uploads
            if row.get("documento_key") and row.get("grupo") in {"corretor", "gestor", "caixa", "cca"}
        }
        uploads_enviados = {row["documento_key"]: True for row in uploads if row.get("documento_key")}

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
        pendencias=pendencias,
        uploadsCca=uploads_cca,
        uploadsEnviados=uploads_enviados,
        temDocumentoEnviado=bool(uploads),
        sla=get_sla(reserva),
    )


def upload_to_storage(path: str, content: bytes, content_type: str) -> str:
    settings = get_settings()
    bucket = get_supabase().storage.from_(settings.supabase_storage_bucket)
    bucket.upload(path, content, {"content-type": content_type, "upsert": "true"})
    return bucket.get_public_url(path)


def fallback_upload_url(reserva: str, storage_path: str) -> str:
    return f"/api/processos/{reserva}/uploads/{safe_segment(storage_path)}"


def local_upload_path(storage_path: str) -> Path:
    return LOCAL_UPLOAD_ROOT / safe_segment(storage_path)


def save_local_upload(storage_path: str, content: bytes) -> None:
    path = local_upload_path(storage_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def documento_sort_key(row: dict[str, Any]) -> tuple[int, str, str]:
    key = row.get("documento_key") or ""
    group = row.get("grupo") or ""
    order = next((index for index, prefix in enumerate(DOCUMENT_ORDER) if key.startswith(prefix)), len(DOCUMENT_ORDER))
    return (order, key, group)


def upload_pdf_bytes(row: dict[str, Any]) -> bytes:
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


@router.get("", response_model=list[ProcessoResponse])
def listar_processos(destino: str | None = None) -> list[ProcessoResponse]:
    where = ""
    params: list[Any] = []
    if destino == "analista":
        where = "where encaminhado_analista = true"
    elif destino == "cca":
        where = "where encaminhado_analista = true and caixa_status = %s"
        params.append("envio_conformidade")

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
    upsert_processo(reserva)
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
        [reserva, payload.documento or documento_key, payload.descricao, payload.prazo, payload.origem, payload.destinoCard or "card1"],
    )
    return {"ok": True, "reserva": reserva, "documento": documento_key, "card1Atualizado": True}


@router.put("/{reserva}/documentos/{documento_key}")
def atualizar_documento(reserva: str, documento_key: str, payload: DocumentoUpdate) -> dict[str, Any]:
    status = normalize(payload.status, DOCUMENTO_STATUS, "status")
    upsert_processo(reserva)
    execute(
        """
        insert into public.fastapi_documentos_status (reserva, documento_key, status, updated_by)
        values (%s, %s, %s, %s)
        on conflict (reserva, documento_key)
        do update set status = excluded.status, updated_by = excluded.updated_by, updated_at = now()
        """,
        [reserva, documento_key, status, payload.updated_by],
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
    try:
        url = upload_to_storage(storage_path, content, file_content_type)
    except Exception:
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

    return {"ok": True, "key": documento_key, "name": file_name, "url": url, "temDocumentoEnviado": True}


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
    supabase = get_supabase()
    params: list[Any] = [reserva]
    where = "where reserva = %s"
    if grupo:
        where += " and grupo = %s"
        params.append(grupo)
    rows = fetch_all(f"select * from public.fastapi_uploads {where}", params)

    settings = get_settings()
    paths = [row["storage_path"] for row in rows if row.get("storage_path")]
    if paths:
        supabase.storage.from_(settings.supabase_storage_bucket).remove(paths)

    execute(f"delete from public.fastapi_uploads {where}", params)
    return Response(status_code=204)
