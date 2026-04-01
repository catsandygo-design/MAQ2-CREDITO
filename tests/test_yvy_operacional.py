from yvy_operacional import AnaliseInput, analisar_operacao_yvy


def test_yvy_operacional_returns_viavel_when_documentos_and_valor_ok():
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

    resposta = analisar_operacao_yvy(payload)

    assert resposta.yvy.status_geral == "viavel"
    assert resposta.yvy.score.classificacao == "baixo_risco"
    assert resposta.yvy.decisao_recomendada.codigo == "AVANCAR"


def test_yvy_operacional_marks_ajustar_when_missing_docs_and_gap():
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

    resposta = analisar_operacao_yvy(payload)

    assert resposta.yvy.status_geral == "ajustar"
    assert resposta.yvy.score.classificacao in {"alto_risco", "medio_risco"}
    assert len(resposta.yvy.campos_com_problema) >= 3
