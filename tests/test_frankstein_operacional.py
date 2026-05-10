from frankstein_operacional import AnaliseInput, analisar_operacao_frankstein


def test_frankstein_operacional_returns_viavel_when_documentos_and_valor_ok():
    payload = AnaliseInput(
        nome_cliente="Cliente Teste",
        perfil="CLT",
        valor_venda=100000,
        garantido=100000,
        cheque_moradia=0,
        renda_informada=5000,
        documentos={
            "comprovante_renda": True,
            "fgts_validado": True,
            "comprovante_residencia": True,
            "rg_cpf": True,
        },
    )

    resposta = analisar_operacao_frankstein(payload)

    assert resposta.frankstein.status_geral == "viavel"
    assert resposta.frankstein.score.classificacao == "baixo_risco"
    assert resposta.frankstein.decisao_recomendada.codigo == "AVANCAR"
    assert resposta.frankstein.regras_disparadas[0].codigo == "FRK-OK-001"
    assert resposta.frankstein.regras_disparadas[0].severidade == "ok"


def test_frankstein_operacional_marks_ajustar_when_missing_docs_and_gap():
    payload = AnaliseInput(
        nome_cliente="Cliente Teste",
        perfil="CLT",
        valor_venda=120000,
        garantido=100000,
        cheque_moradia=0,
        renda_informada=None,
        documentos={
            "comprovante_renda": False,
            "fgts_validado": False,
            "comprovante_residencia": False,
            "rg_cpf": False,
        },
    )

    resposta = analisar_operacao_frankstein(payload)

    assert resposta.frankstein.status_geral == "ajustar"
    assert resposta.frankstein.score.classificacao in {"alto_risco", "medio_risco"}
    assert len(resposta.frankstein.campos_com_problema) >= 3
    codigos = {regra.codigo for regra in resposta.frankstein.regras_disparadas}
    assert "FRK-VALOR-001" in codigos
    assert "FRK-RENDA-001" in codigos
    assert "FRK-RENDA-002" in codigos
    assert any(regra.bloqueia for regra in resposta.frankstein.regras_disparadas)


def test_frankstein_operacional_explains_rules_with_operational_action():
    payload = AnaliseInput(
        nome_cliente="Cliente Teste",
        perfil="CLT",
        valor_venda=100000,
        garantido=100000,
        cheque_moradia=0,
        renda_informada=4500,
        documentos={
            "comprovante_renda": False,
            "fgts_validado": True,
            "comprovante_residencia": True,
            "rg_cpf": True,
        },
    )

    resposta = analisar_operacao_frankstein(payload)

    regra = next(regra for regra in resposta.frankstein.regras_disparadas if regra.codigo == "FRK-RENDA-001")
    assert regra.campo == "comprovante_renda"
    assert regra.severidade == "bloqueio"
    assert regra.autonomia == 4
    assert "Solicitar comprovante de renda" in regra.acao_sugerida

