from fastapi import APIRouter

from app.db import execute
from app.models import ContextoPayload

router = APIRouter(tags=["contexto"])


@router.post("/contexto")
def registrar_contexto(payload: ContextoPayload) -> dict[str, bool]:
    execute("insert into public.fastapi_contextos (contexto) values (%s)", [payload.contexto])
    return {"ok": True}
