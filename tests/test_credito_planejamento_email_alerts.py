from datetime import date, datetime, time, timezone

import app as app_module
from app import (
    CreditoPlanejamentoItem,
    KEEPALIVE_BRT_TZ,
    _credito_planejamento_email_body,
    _credito_planejamento_item_view,
    _credito_planejamento_reminder_at_brt,
)


def make_item(**overrides):
    base = {
        "tipo": "tarefa",
        "titulo": "Revisar compromisso Caixa",
        "descricao": "Conferir pauta antes da reuniao.",
        "responsavel": "Analista",
        "data_referencia": date(2026, 5, 10),
        "hora_inicio": "14:30",
        "hora_fim": "15:00",
        "status": "pendente",
        "progresso": 0,
        "urgente": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    base.update(overrides)
    return CreditoPlanejamentoItem(**base)


def test_credito_planejamento_email_reminder_is_five_minutes_before_task():
    item = make_item()
    reminder_at = _credito_planejamento_reminder_at_brt(item)

    assert reminder_at == datetime.combine(date(2026, 5, 10), time(14, 25), tzinfo=KEEPALIVE_BRT_TZ)


def test_credito_planejamento_email_body_is_supervised_frankstein_alert():
    item = make_item()
    view = _credito_planejamento_item_view(item)
    reminder_at = _credito_planejamento_reminder_at_brt(item)
    assert reminder_at is not None

    body = _credito_planejamento_email_body(item, view, reminder_at)

    assert "Frankstein alerta supervisionado" in body
    assert "Faltam 5 minutos" in body
    assert "Revisar compromisso Caixa" in body
    assert "decisao continua supervisionada" in body


def test_credito_planejamento_subtarefa_sem_data_usa_data_atual_para_lembrete():
    item = make_item(tipo="subtarefa", data_referencia=None, hora_inicio="09:00")
    reminder_at = _credito_planejamento_reminder_at_brt(item)

    assert reminder_at is not None
    assert reminder_at.time() == time(8, 55)
    assert reminder_at.date() == datetime.now(KEEPALIVE_BRT_TZ).date()


def test_email_delivery_prefers_brevo_api_when_key_is_configured(monkeypatch):
    monkeypatch.setattr(app_module, "EMAIL_DELIVERY_PROVIDER", "")
    monkeypatch.setattr(app_module, "EMAIL_BREVO_API_KEY", "xkeysib-test")
    monkeypatch.setattr(app_module, "EMAIL_FROM", "frank.siocred@example.com")

    assert app_module._email_delivery_provider() == "brevo"
    assert app_module._is_email_delivery_configured()


def test_email_delivery_uses_smtp_when_no_brevo_key(monkeypatch):
    monkeypatch.setattr(app_module, "EMAIL_DELIVERY_PROVIDER", "")
    monkeypatch.setattr(app_module, "EMAIL_BREVO_API_KEY", "")
    monkeypatch.setattr(app_module, "EMAIL_SMTP_HOST", "smtp.gmail.com")
    monkeypatch.setattr(app_module, "EMAIL_FROM", "frank.siocred@example.com")

    assert app_module._email_delivery_provider() == "smtp"
    assert app_module._is_email_delivery_configured()
