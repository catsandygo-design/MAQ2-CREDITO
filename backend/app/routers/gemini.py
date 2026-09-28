import asyncio
import json
from calendar import monthrange
from datetime import date, datetime
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from app.config import get_settings
from app.supabase_client import get_supabase

router = APIRouter(prefix="/processos/gemini", tags=["gemini"])

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_TYPES = {
    "application/pdf": {".pdf"},
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
}


class DocumentAnalysisResult(BaseModel):
    status: Literal["APROVADO", "PENDENTE", "REJEITADO"]
    motivo: str
    dadosExtraidos: str
    tipoIdentificado: str
    tipoConfere: bool
    dataEmissao: str | None = None
    dataNascimento: str | None = None
    dataReferencia: str | None = None
    validadeAte: str | None = None
    validacoes: list["DocumentValidation"] = []


class DocumentValidation(BaseModel):
    regra: str
    resultado: Literal["APROVADO", "PENDENTE", "REJEITADO"]
    detalhe: str


def _parse_document_date(value: str | None) -> date | None:
    if not value:
        return None
    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(value.strip(), pattern).date()
        except ValueError:
            continue
    return None


def _plus_years(value: date, years: int) -> date:
    return date(value.year + years, value.month, min(value.day, monthrange(value.year + years, value.month)[1]))


def _age_on(birth_date: date, reference_date: date) -> int:
    return reference_date.year - birth_date.year - ((reference_date.month, reference_date.day) < (birth_date.month, birth_date.day))


def _validation_result(result: DocumentAnalysisResult, selected_type: str) -> DocumentAnalysisResult:
    today = date.today()
    validations: list[DocumentValidation] = []
    detected = result.tipoIdentificado.lower()
    selected = selected_type.lower()
    is_identity = any(value in detected for value in ("rg", "cnh", "identidade", "passaporte", "carteira funcional"))
    is_recent = any(value in detected for value in (
        "comprovante de endereco", "holerite", "contracheque", "extrato", "esocial", "declaracao",
        "formulario", "ficha", "damp", "comprovante de renda",
    ))

    validations.append(DocumentValidation(
        regra="Tipo do documento",
        resultado="APROVADO" if result.tipoConfere else "PENDENTE",
        detalhe=(f"Identificado como {result.tipoIdentificado}." if result.tipoConfere
                 else f"Identificado como {result.tipoIdentificado}; confirme se corresponde a {selected_type}."),
    ))

    issue_date = _parse_document_date(result.dataEmissao)
    reference_date = _parse_document_date(result.dataReferencia) or issue_date
    if is_identity:
        if not issue_date:
            validations.append(DocumentValidation(regra="Data de emissão", resultado="PENDENTE", detalhe="Data de emissão não identificada."))
        elif issue_date > today:
            validations.append(DocumentValidation(regra="Data de emissão", resultado="REJEITADO", detalhe="A data de emissão está no futuro."))
        elif issue_date < _plus_years(today, -10):
            validations.append(DocumentValidation(regra="Documento emitido há até 10 anos", resultado="REJEITADO", detalhe=f"Emitido em {issue_date.strftime('%d/%m/%Y')}; supera o limite de 10 anos."))
        else:
            validations.append(DocumentValidation(regra="Documento emitido há até 10 anos", resultado="APROVADO", detalhe=f"Emitido em {issue_date.strftime('%d/%m/%Y')}."))

        birth_date = _parse_document_date(result.dataNascimento)
        if not birth_date or not issue_date:
            validations.append(DocumentValidation(regra="Maioridade na emissão", resultado="PENDENTE", detalhe="Data de nascimento e/ou emissão não identificada."))
        else:
            age = _age_on(birth_date, issue_date)
            validations.append(DocumentValidation(
                regra="Maioridade na emissão",
                resultado="APROVADO" if age >= 18 else "REJEITADO",
                detalhe=f"Idade na emissão: {age} anos.",
            ))

        valid_until = _parse_document_date(result.validadeAte)
        if valid_until:
            validations.append(DocumentValidation(
                regra="Validade informada no documento",
                resultado="APROVADO" if valid_until >= today else "REJEITADO",
                detalhe=f"Validade: {valid_until.strftime('%d/%m/%Y')}.",
            ))
    elif is_recent:
        if not reference_date:
            validations.append(DocumentValidation(regra="Data de referência/emissão", resultado="PENDENTE", detalhe="Data de referência não identificada."))
        elif reference_date > today:
            validations.append(DocumentValidation(regra="Data de referência/emissão", resultado="REJEITADO", detalhe="A data de referência está no futuro."))
        elif reference_date < _plus_years(today, -1) and "extrato" not in detected:
            validations.append(DocumentValidation(regra="Atualidade do documento", resultado="REJEITADO", detalhe=f"Referência em {reference_date.strftime('%d/%m/%Y')}; documento desatualizado."))
        else:
            validations.append(DocumentValidation(regra="Atualidade do documento", resultado="APROVADO", detalhe=f"Referência em {reference_date.strftime('%d/%m/%Y')}."))
    else:
        validations.append(DocumentValidation(regra="Regra temporal específica", resultado="PENDENTE", detalhe="Este tipo exige conferência humana de vigência e conteúdo."))

    outcomes = {item.resultado for item in validations}
    status: Literal["APROVADO", "PENDENTE", "REJEITADO"] = "REJEITADO" if "REJEITADO" in outcomes else "PENDENTE" if "PENDENTE" in outcomes else "APROVADO"
    return result.model_copy(update={
        "status": status,
        "motivo": next((item.detalhe for item in validations if item.resultado != "APROVADO"), "Triagem automática concluída."),
        "validacoes": validations,
    })


def _validate_signature(content: bytes, mime_type: str) -> bool:
    if mime_type == "application/pdf":
        return content.startswith(b"%PDF-")
    if mime_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if mime_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    return False


def _require_user(authorization: str | None) -> None:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Autenticacao obrigatoria.")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Autenticacao obrigatoria.")
    try:
        response = get_supabase().auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Sessao invalida.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Sessao invalida.") from exc


@router.post("/analyze", response_model=DocumentAnalysisResult)
async def analyze_document(
    file: UploadFile = File(...),
    document_type: str = Form(..., alias="documentType"),
    authorization: str | None = Header(default=None),
) -> DocumentAnalysisResult:
    _require_user(authorization)
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Triagem por IA nao configurada.")

    mime_type = (file.content_type or "").lower()
    extension = Path(file.filename or "").suffix.lower()
    if mime_type not in ALLOWED_TYPES or extension not in ALLOWED_TYPES[mime_type]:
        raise HTTPException(status_code=415, detail="Envie somente PDF, JPG ou PNG.")

    content = await file.read(MAX_FILE_SIZE + 1)
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="O arquivo excede o limite de 10 MB.")
    if not _validate_signature(content, mime_type):
        raise HTTPException(status_code=415, detail="Conteudo do arquivo nao corresponde ao formato informado.")

    prompt = f"""Voce e o MAQ2 Triagem Assistant, especialista em documentos de credito imobiliario Caixa e Agehab.
Analise o documento anexado e identifique seu tipo real, independentemente do tipo selecionado \"{document_type[:120]}\".
Verifique legibilidade e coerencia. Nao invente dados ou datas ausentes. A decisao e uma triagem assistida e deve ser revisada por uma pessoa.

Quando aplicavel:
- RG/CNH/identidade: nome, CPF, nascimento, emissao e validade, se houver.
- Comprovante de endereco: CEP, logradouro, bairro, cidade, UF e emissao/vencimento.
- Renda/holerite/extratos: empresa ou banco, valores, competencia ou data de referencia.
- Formularios Caixa/AGEHAB e certidoes: nome do formulario, partes, emissao e validade, se houver.

Use datas ISO YYYY-MM-DD quando elas estiverem legiveis. Defina tipoConfere como true apenas quando o documento real corresponder ao tipo selecionado.

Responda somente conforme o schema JSON solicitado."""

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=[prompt, types.Part.from_bytes(data=content, mime_type=mime_type)],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_json_schema=DocumentAnalysisResult.model_json_schema(),
                    temperature=0.1,
                ),
            ),
            timeout=60,
        )
        if not response.text:
            raise ValueError("Resposta vazia")
        return _validation_result(DocumentAnalysisResult.model_validate(json.loads(response.text)), document_type)
    except asyncio.TimeoutError as exc:
        raise HTTPException(status_code=504, detail="A triagem por IA excedeu o tempo limite.") from exc
    except (json.JSONDecodeError, ValidationError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="A IA retornou uma resposta invalida.") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Nao foi possivel concluir a triagem por IA.") from exc
    finally:
        if "client" in locals():
            await client.aio.aclose()
