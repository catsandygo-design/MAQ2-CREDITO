from sqlalchemy.orm import Session
from . import models

def create_cliente(db: Session, nome: str, corretor=None, obra=None, reserva=None):
    c = models.Cliente(nome=nome, corretor=corretor, obra=obra, reserva=reserva)
    db.add(c); db.commit(); db.refresh(c)
    return c

def list_clientes(db: Session):
    return db.query(models.Cliente).order_by(models.Cliente.created_at.desc()).all()

def create_processo(db: Session, cliente_id):
    p = models.Processo(cliente_id=cliente_id)
    db.add(p); db.commit(); db.refresh(p)
    return p

def get_processo(db: Session, processo_id):
    return db.query(models.Processo).filter(models.Processo.id == processo_id).first()

def update_processo(db: Session, processo, payload: dict):
    for k, v in payload.items():
        if v is not None and hasattr(processo, k):
            setattr(processo, k, v)
    db.commit(); db.refresh(processo)
    return processo

def create_documento(db: Session, processo_id, categoria, nome):
    d = models.Documento(processo_id=processo_id, categoria=categoria, nome=nome)
    db.add(d); db.commit(); db.refresh(d)
    return d

def list_docs_by_processo(db: Session, processo_id):
    return db.query(models.Documento).filter(models.Documento.processo_id == processo_id).all()

def update_documento(db: Session, doc, payload: dict):
    for k, v in payload.items():
        if v is not None and hasattr(doc, k):
            setattr(doc, k, v)
    db.commit(); db.refresh(doc)
    return doc
