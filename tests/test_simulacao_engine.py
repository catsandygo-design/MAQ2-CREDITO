from simulacao_engine import SimulacaoInput, engine_calculo_imobiliario


def test_simulacao_reprova_preco_abaixo_da_politica():
    payload = SimulacaoInput(
        renda_bruta=5000,
        valor_tabela=200000,
        sobrepreco_vila=10000,
        valor_obtido=180000,
        parcela_caixa=800,
        preco_digitado_corretor=150000,
    )

    resposta = engine_calculo_imobiliario(payload)

    assert resposta["erro_politica"] is True


def test_simulacao_retorna_apresentacao_e_leitura_executiva():
    payload = SimulacaoInput(
        renda_bruta=8000,
        valor_tabela=200000,
        sobrepreco_vila=0,
        valor_obtido=190000,
        parcela_caixa=900,
        preco_digitado_corretor=0,
    )

    resposta = engine_calculo_imobiliario(payload)

    assert "apresentacao_cliente" in resposta
    assert "leitura_executiva_corretor" in resposta
