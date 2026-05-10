from datetime import date, datetime, timezone
from uuid import uuid4

from app import CreditoPlanejamentoItem, _credito_planejamento_item_out


def make_item(**overrides):
    base = {
        "tipo": "tarefa",
        "id": uuid4(),
        "titulo": "Revisar pendencia Caixa",
        "descricao": "Conferir kit e avisar responsavel.",
        "responsavel": "Analista",
        "data_referencia": date.today(),
        "hora_inicio": "10:00",
        "hora_fim": "10:30",
        "status": "pendente",
        "progresso": 0,
        "urgente": False,
        "created_by_username": "admin",
        "updated_by_username": "admin",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    base.update(overrides)
    return CreditoPlanejamentoItem(**base)


def test_credito_planejamento_pendente_gera_whatsapp_frankstein():
    out = _credito_planejamento_item_out(make_item())

    assert out.frankstein_lembrete_status in {"hoje", "programada"}
    assert out.whatsapp_lembrete_url
    assert out.whatsapp_lembrete_url.startswith("https://wa.me")
    assert "Frankstein" in (out.whatsapp_lembrete_texto or "")
    assert "Revisar pendencia Caixa" in (out.whatsapp_lembrete_texto or "")


def test_credito_planejamento_concluido_nao_gera_whatsapp():
    out = _credito_planejamento_item_out(make_item(status="concluido"))

    assert out.frankstein_lembrete_status == "sem_alerta"
    assert out.whatsapp_lembrete_url is None
    assert out.whatsapp_lembrete_texto is None
