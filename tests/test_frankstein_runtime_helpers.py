from datetime import datetime, timedelta, timezone

from app import _frankstein_hours_between, _frankstein_resultado_real_from_statuses


def test_frankstein_resultado_real_prioritiza_status_terminal():
    assert (
        _frankstein_resultado_real_from_statuses(
            status_credito="APROVADO",
            status_geral="EM_ANDAMENTO",
            status_cca="FINALIZADO",
            status_agehab="VALIDADO_AGEHAB",
        )
        == "FINALIZADO"
    )

    assert (
        _frankstein_resultado_real_from_statuses(
            status_credito="REPROVADO",
            status_geral="REPROVADO",
            status_cca="PENDENTE_CCA",
            status_agehab="ANALISE_CREDITO",
        )
        == "REPROVADO"
    )


def test_frankstein_hours_between_handles_valid_and_invalid_ranges():
    start = datetime(2026, 4, 1, 8, 0, tzinfo=timezone.utc)
    end = start + timedelta(hours=30, minutes=30)

    assert _frankstein_hours_between(start, end) == 30.5
    assert _frankstein_hours_between(end, start) is None
