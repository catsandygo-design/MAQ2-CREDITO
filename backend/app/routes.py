from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .db import get_db
from . import crud, models, schemas

router = APIRouter(prefix="/api")

@router.get("/health")
def health():
    return {"ok": True}

@router.post("/clientes", response_model=schemas.ClienteOut)
def clientes_create(payload: schemas.ClienteCreate, db: Session = Depends(get_db)):
    return crud.create_cliente(db, **payload.model_dump())

@router.get("/clientes", response_model=list[schemas.ClienteOut])
def clientes_list(db: Session = Depends(get_db)):
    return crud.list_clientes(db)

@router.post("/processos", response_model=schemas.ProcessoOut)
def processos_create(payload: schemas.ProcessoCreate, db: Session = Depends(get_db)):
    return crud.create_processo(db, payload.cliente_id)

@router.get("/processos/{processo_id}", response_model=schemas.ProcessoOut)
def processos_get(processo_id: str, db: Session = Depends(get_db)):
    p = crud.get_processo(db, processo_id)
    if not p:
        raise HTTPException(404, "Processo não encontrado")
    return p

@router.patch("/processos/{processo_id}", response_model=schemas.ProcessoOut)
def processos_update(processo_id: str, payload: schemas.ProcessoUpdate, db: Session = Depends(get_db)):
    p = crud.get_processo(db, processo_id)
    if not p:
        raise HTTPException(404, "Processo não encontrado")
    return crud.update_processo(db, p, payload.model_dump())

@router.post("/documentos", response_model=schemas.DocumentoOut)
def docs_create(payload: schemas.DocumentoCreate, db: Session = Depends(get_db)):
    p = crud.get_processo(db, payload.processo_id)
    if not p:
        raise HTTPException(404, "Processo não encontrado")
    return crud.create_documento(db, payload.processo_id, payload.categoria, payload.nome)

@router.get("/processos/{processo_id}/documentos", response_model=list[schemas.DocumentoOut])
def docs_list(processo_id: str, db: Session = Depends(get_db)):
    return crud.list_docs_by_processo(db, processo_id)

@router.patch("/documentos/{doc_id}", response_model=schemas.DocumentoOut)
def docs_update(doc_id: str, payload: schemas.DocumentoUpdate, db: Session = Depends(get_db)):
    doc = db.query(models.Documento).filter(models.Documento.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Documento não encontrado")
    return crud.update_documento(db, doc, payload.model_dump())
