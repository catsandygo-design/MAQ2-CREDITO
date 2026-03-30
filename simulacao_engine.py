from __future__ import annotations

import math
from typing import Optional

from pydantic import BaseModel, Field, validator


class SimulacaoInput(BaseModel):
    renda_bruta: float = Field(..., gt=0, description="Renda deve ser maior que zero")
    valor_tabela: float = Field(..., gt=0, description="Valor de tabela obrigatório")
    sobrepreco_vila: float = Field(..., ge=0)
    valor_obtido: float = Field(..., ge=0)
    parcela_caixa: float = Field(..., ge=0)
    preco_digitado_corretor: Optional[float] = 0

    @validator("preco_digitado_corretor", "sobrepreco_vila", "valor_obtido", "parcela_caixa", pre=True, always=True)
    def _coerce_numbers(cls, v):
        try:
            return float(v or 0)
        except (TypeError, ValueError):
            return 0.0


def money(value: float) -> float:
    return round(float(value), 2)


def engine_calculo_imobiliario(data: SimulacaoInput):
    # 1. Preço mínimo de política
    preco_base_politica = money(max(data.valor_tabela, data.valor_obtido) + data.sobrepreco_vila)

    # 2. Preço final (respeita digitação se acima do mínimo)
    preco_digitado = data.preco_digitado_corretor or 0
    preco_final = money(max(preco_base_politica, preco_digitado))

    if preco_digitado and preco_digitado < preco_base_politica:
        # Bloqueia se corretor tentou forçar abaixo do mínimo
        return {"erro_politica": True, "mensagem": "Valor abaixo da política comercial"}

    # 3. Entrada líquida
    entrada_liquida = money(preco_final - data.valor_obtido)

    # --- Parcelamento com regra dos 125 e clamp 80 ---
    juros_am = 0.01
    n_meses = 0
    pmt_entrada = 0.0
    status_parcelamento = "À vista"

    if entrada_liquida > 0:
        n_meses = 80
        def _pmt(pv: float, n: int, i: float) -> float:
            if pv <= 0 or n <= 0:
                return 0.0
            fator = (i * (1 + i) ** n) / ((1 + i) ** n - 1)
            return pv * fator

        pmt_calculado = money(_pmt(entrada_liquida, n_meses, juros_am))

        if pmt_calculado < 125:
            motivo_pmt = "recalculado_125"
            ratio = juros_am * entrada_liquida / 125.0
            if ratio < 1:
                n_recalc = -math.log(1 - ratio) / math.log(1 + juros_am)
                n_meses = max(1, math.ceil(n_recalc))
                if n_meses > 80:
                    n_meses = 80
                pmt_entrada = 125.0
            else:
                n_meses = 80
                pmt_entrada = 125.0
        else:
            pmt_entrada = pmt_calculado

        status_parcelamento = f"{n_meses}x de R$ {money(pmt_entrada)}"

    # --- Risco / garantidores ---
    exposicao_risco = (data.valor_tabela - data.valor_obtido) / data.valor_tabela
    qtd_garantidores = 0
    if exposicao_risco > 0.06:
        qtd_garantidores = 2
    elif exposicao_risco > 0.05:
        qtd_garantidores = 1

    # --- IS pós-chaves ---
    is_pos_chaves = (data.parcela_caixa + pmt_entrada) / data.renda_bruta

    status_ia = "PERFIL_SEG_01"
    bloqueio = False
    motivo = ""

    if is_pos_chaves >= 0.40:
        status_ia = "PERFIL_CRI_03"
        bloqueio = True
        motivo = f"Renda insuficiente para suporte pós-chaves (Comprometimento: {money(is_pos_chaves * 100)}%)"
    elif is_pos_chaves >= 0.35:
        status_ia = "PERFIL_DOU_02"
        motivo = "Atenção: Margem de segurança reduzida. Possível ganância no preço ou baixa renda."

    resposta = {
        "apresentacao_cliente": {
            "valor_imovel": money(preco_final),
            "valor_obtido": money(data.valor_obtido),
            "entrada_facilitada": money(entrada_liquida),
            "plano_pagamento": status_parcelamento,
            "valor_parcela": money(pmt_entrada),
        },
        "leitura_executiva_corretor": {
            "status_ia": status_ia,
            "risco_exposicao": f"{money(exposicao_risco * 100)}%",
            "garantidores_necessarios": qtd_garantidores,
            "is_pos_chaves": f"{money(is_pos_chaves * 100)}%",
            "is_limite": "40.0%",
            "bloqueio_critico": bloqueio,
            "motivo_auditoria": motivo,
            "alerta_preco": "Ajustado pelo Obtido" if data.valor_obtido > data.valor_tabela else "Preço Base",
        },
    }
    return resposta
