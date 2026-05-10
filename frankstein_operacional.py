from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class DocumentosInput(BaseModel):
    comprovante_renda: bool = False
    fgts_validado: bool = False
    comprovante_residencia: bool = False
    rg_cpf: bool = False


class AnaliseInput(BaseModel):
    nome_cliente: str = Field(..., min_length=2)
    perfil: Literal["CLT", "AUTONOMO", "APOSENTADO", "OUTRO"] = "CLT"
    processo_id: Optional[str] = None
    lead_id: Optional[str] = None
    cliente_id: Optional[str] = None
    reserva_id: Optional[str] = None
    corretor_id: Optional[str] = None
    empreendimento: Optional[str] = None
    valor_venda: float = Field(..., gt=0)
    garantido: float = Field(..., ge=0)
    cheque_moradia: float = Field(0, ge=0)
    renda_informada: Optional[float] = Field(None, ge=0)
    documentos: DocumentosInput


class ScoreOutput(BaseModel):
    valor: float
    escala: str
    classificacao: str


class DecisaoRecomendadaOutput(BaseModel):
    codigo: str
    titulo: str
    motivo_principal: str


class BalaoOutput(BaseModel):
    id: str
    tipo: Literal["alerta", "insight", "acao", "decisao"]
    prioridade: int
    titulo: str
    mensagem: str
    impacto: str
    decisao: str
    acao: str
    campo_relacionado: Optional[str] = None
    visivel: bool = True


class CampoProblemaOutput(BaseModel):
    campo: str
    label: str
    erro: str


class RegraDisparadaOutput(BaseModel):
    codigo: str
    nome: str
    categoria: str
    severidade: Literal["ok", "dica", "atencao", "bloqueio"]
    campo: Optional[str] = None
    motivo: str
    acao_sugerida: str
    autonomia: int = Field(ge=0, le=4)
    bloqueia: bool = False


class MetricasOperacionaisOutput(BaseModel):
    risco_pendencia: float
    risco_atraso_sla: float
    confianca_modelo: float


class AuditoriaOutput(BaseModel):
    origem: str
    versao: str
    timestamp: str


class FranksteinOutput(BaseModel):
    status_geral: Literal["viavel", "ajustar", "bloquear"]
    score: ScoreOutput
    resumo: str
    decisao_recomendada: DecisaoRecomendadaOutput
    baloes: list[BalaoOutput]
    campos_com_problema: list[CampoProblemaOutput]
    regras_disparadas: list[RegraDisparadaOutput]
    metricas_operacionais: MetricasOperacionaisOutput
    auditoria: AuditoriaOutput


class RespostaFrankstein(BaseModel):
    event_id: Optional[str] = None
    modelo_versao: Optional[str] = None
    frankstein: FranksteinOutput


def limitar_entre_0_e_1(valor: float) -> float:
    return max(0.0, min(1.0, round(valor, 2)))


def classificar_score(score: float) -> str:
    if score >= 0.75:
        return "alto_risco"
    if score >= 0.40:
        return "medio_risco"
    return "baixo_risco"


def _formatar_brl(valor: float) -> str:
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def analisar_valor(venda: float, garantido: float, cheque: float) -> dict[str, float | str]:
    cobertura_total = garantido + cheque
    diferenca = cobertura_total - venda

    if diferenca >= 0:
        return {
            "status_valor": "viavel",
            "diferenca": round(diferenca, 2),
            "faltante": 0.0,
            "mensagem": "A composicao financeira atende o valor da venda.",
        }

    faltante = abs(diferenca)
    return {
        "status_valor": "ajustar",
        "diferenca": round(diferenca, 2),
        "faltante": round(faltante, 2),
        "mensagem": f"Faltam {_formatar_brl(faltante)} para sustentar o valor da venda.",
    }


def analisar_documentos(payload: AnaliseInput) -> list[CampoProblemaOutput]:
    problemas: list[CampoProblemaOutput] = []
    docs = payload.documentos

    if not docs.rg_cpf:
        problemas.append(
            CampoProblemaOutput(
                campo="rg_cpf",
                label="RG/CPF",
                erro="Documento de identificacao nao enviado",
            )
        )

    if not docs.comprovante_residencia:
        problemas.append(
            CampoProblemaOutput(
                campo="comprovante_residencia",
                label="Comprovante de residencia",
                erro="Documento nao enviado",
            )
        )

    if payload.perfil == "CLT":
        if not docs.comprovante_renda:
            problemas.append(
                CampoProblemaOutput(
                    campo="comprovante_renda",
                    label="Comprovante de renda",
                    erro="Documento nao enviado",
                )
            )

        if not docs.fgts_validado:
            problemas.append(
                CampoProblemaOutput(
                    campo="fgts_validado",
                    label="FGTS",
                    erro="FGTS nao validado",
                )
            )

    if payload.renda_informada is None:
        problemas.append(
            CampoProblemaOutput(
                campo="renda_informada",
                label="Renda informada",
                erro="Renda nao preenchida",
            )
        )

    return problemas


def calcular_risco(payload: AnaliseInput, faltante: float, qtd_problemas: int) -> ScoreOutput:
    risco = 0.10

    if faltante > 0:
        risco += 0.35

    if qtd_problemas >= 1:
        risco += 0.20
    if qtd_problemas >= 3:
        risco += 0.15

    if payload.perfil == "CLT" and not payload.documentos.fgts_validado:
        risco += 0.10

    if payload.renda_informada is None:
        risco += 0.10

    risco = limitar_entre_0_e_1(risco)

    return ScoreOutput(
        valor=risco,
        escala="0-1",
        classificacao=classificar_score(risco),
    )


def montar_baloes(
    analise_valor: dict[str, float | str],
    campos_problema: list[CampoProblemaOutput],
    score: ScoreOutput,
) -> list[BalaoOutput]:
    baloes: list[BalaoOutput] = []
    prioridade = 1
    faltante = float(analise_valor["faltante"])

    if faltante > 0:
        baloes.append(
            BalaoOutput(
                id="bl_001",
                tipo="insight",
                prioridade=prioridade,
                titulo="Valor acima da aderencia",
                mensagem="A composicao atual nao sustenta o valor da venda.",
                impacto="A operacao pode travar antes da assinatura.",
                decisao="Ajustar antes de avancar.",
                acao=f"Revisar valor da venda ou aumentar entrada em {_formatar_brl(faltante)}.",
                campo_relacionado="valor_venda",
                visivel=True,
            )
        )
        prioridade += 1

    existe_renda_pendente = any(problema.campo == "comprovante_renda" for problema in campos_problema)
    if existe_renda_pendente:
        baloes.append(
            BalaoOutput(
                id="bl_002",
                tipo="alerta",
                prioridade=prioridade,
                titulo="Renda nao comprovada",
                mensagem="A renda informada ainda nao foi validada documentalmente.",
                impacto="Alta chance de pendencia no envio ao CCA.",
                decisao="Nao enviar nesta etapa.",
                acao="Solicitar 3 contracheques ou extrato da conta salario.",
                campo_relacionado="comprovante_renda",
                visivel=True,
            )
        )
        prioridade += 1

    existe_fgts_pendente = any(problema.campo == "fgts_validado" for problema in campos_problema)
    if existe_fgts_pendente:
        baloes.append(
            BalaoOutput(
                id="bl_003",
                tipo="alerta",
                prioridade=prioridade,
                titulo="FGTS nao validado",
                mensagem="O perfil CLT exige validacao do FGTS nesta etapa.",
                impacto="O caso tende a voltar com exigencia ou atraso operacional.",
                decisao="Regularizar antes do avanco.",
                acao="Validar FGTS ou complementar evidencias do vinculo.",
                campo_relacionado="fgts_validado",
                visivel=True,
            )
        )
        prioridade += 1

    if score.classificacao == "alto_risco":
        baloes.append(
            BalaoOutput(
                id="bl_004",
                tipo="acao",
                prioridade=prioridade,
                titulo="Proximo passo recomendado",
                mensagem="Corrigir pendencias antes do reenvio.",
                impacto="Reduz retrabalho e melhora o SLA.",
                decisao="Preparar o caso para nova validacao.",
                acao="Apos anexar os documentos e ajustar a composicao, rodar nova analise FRANKSTEIN.",
                campo_relacionado=None,
                visivel=True,
            )
        )
    else:
        baloes.append(
            BalaoOutput(
                id="bl_004",
                tipo="decisao",
                prioridade=prioridade,
                titulo="Situacao controlada",
                mensagem="O caso apresenta baixo risco operacional.",
                impacto="Pode seguir para a proxima etapa com monitoramento.",
                decisao="Avancar.",
                acao="Prosseguir com o fluxo e manter conferencia final.",
                campo_relacionado=None,
                visivel=True,
            )
        )

    return sorted(baloes, key=lambda balao: balao.prioridade)


def montar_regras_disparadas(
    payload: AnaliseInput,
    analise_valor: dict[str, float | str],
    campos_problema: list[CampoProblemaOutput],
    score: ScoreOutput,
) -> list[RegraDisparadaOutput]:
    regras: list[RegraDisparadaOutput] = []
    faltante = float(analise_valor["faltante"])

    if faltante > 0:
        regras.append(
            RegraDisparadaOutput(
                codigo="FRK-VALOR-001",
                nome="Composicao financeira insuficiente",
                categoria="financeiro",
                severidade="atencao",
                campo="valor_venda",
                motivo=f"Faltam {_formatar_brl(faltante)} para sustentar o valor da venda.",
                acao_sugerida="Revisar valor da venda, garantido ou composicao antes de avancar.",
                autonomia=1,
                bloqueia=False,
            )
        )

    problema_por_campo = {problema.campo: problema for problema in campos_problema}
    doc_rules = [
        (
            "rg_cpf",
            "FRK-DOC-001",
            "RG/CPF nao enviado",
            "documental",
            "atencao",
            "Solicitar documento de identificacao do proponente.",
            False,
        ),
        (
            "comprovante_residencia",
            "FRK-DOC-002",
            "Comprovante de residencia nao enviado",
            "documental",
            "atencao",
            "Solicitar comprovante de residencia antes do envio final.",
            False,
        ),
        (
            "comprovante_renda",
            "FRK-RENDA-001",
            "Renda nao comprovada",
            "renda",
            "bloqueio",
            "Solicitar comprovante de renda antes de enviar para validacao.",
            True,
        ),
        (
            "fgts_validado",
            "FRK-FGTS-001",
            "FGTS nao validado",
            "fgts",
            "atencao",
            "Validar FGTS ou complementar evidencias do vinculo.",
            False,
        ),
        (
            "renda_informada",
            "FRK-RENDA-002",
            "Renda nao preenchida",
            "renda",
            "bloqueio",
            "Preencher renda informada para o Frankstein avaliar a operacao.",
            True,
        ),
    ]

    for campo, codigo, nome, categoria, severidade, acao, bloqueia in doc_rules:
        problema = problema_por_campo.get(campo)
        if not problema:
            continue
        if campo == "fgts_validado" and payload.perfil != "CLT":
            continue
        regras.append(
            RegraDisparadaOutput(
                codigo=codigo,
                nome=nome,
                categoria=categoria,
                severidade=severidade,
                campo=campo,
                motivo=problema.erro,
                acao_sugerida=acao,
                autonomia=4 if bloqueia else 1,
                bloqueia=bloqueia,
            )
        )

    if score.classificacao == "alto_risco":
        regras.append(
            RegraDisparadaOutput(
                codigo="FRK-RISCO-001",
                nome="Alto risco operacional",
                categoria="risco",
                severidade="atencao",
                campo=None,
                motivo="Score operacional classificado como alto risco.",
                acao_sugerida="Corrigir pendencias e rodar nova analise antes do reenvio.",
                autonomia=1,
                bloqueia=False,
            )
        )

    if not regras:
        regras.append(
            RegraDisparadaOutput(
                codigo="FRK-OK-001",
                nome="Processo sem pendencia critica",
                categoria="decisao",
                severidade="ok",
                campo=None,
                motivo="Composicao financeira e documentacao basica atendem a regra atual.",
                acao_sugerida="Prosseguir com o fluxo e manter conferencia final.",
                autonomia=0,
                bloqueia=False,
            )
        )

    return regras


def definir_status_geral(
    analise_valor: dict[str, float | str],
    campos_problema: list[CampoProblemaOutput],
) -> str:
    if any(problema.campo in {"comprovante_renda", "renda_informada"} for problema in campos_problema):
        return "ajustar"

    if float(analise_valor["faltante"]) > 0:
        return "ajustar"

    return "viavel"


def montar_resumo(
    status_geral: str,
    analise_valor: dict[str, float | str],
    campos_problema: list[CampoProblemaOutput],
) -> str:
    if status_geral == "viavel":
        return "Processo com composicao adequada e sem pendencia critica identificada."

    partes: list[str] = []

    if float(analise_valor["faltante"]) > 0:
        partes.append("valor da venda acima da aderencia ideal")

    if campos_problema:
        partes.append("inconsistencias documentais")

    if not partes:
        return "Processo requer ajustes antes do avanco."

    return "Processo com " + " e ".join(partes) + "."


def montar_decisao_recomendada(
    status_geral: str,
    analise_valor: dict[str, float | str],
    campos_problema: list[CampoProblemaOutput],
) -> DecisaoRecomendadaOutput:
    faltante = float(analise_valor["faltante"])

    if status_geral == "viavel":
        return DecisaoRecomendadaOutput(
            codigo="AVANCAR",
            titulo="Avancar",
            motivo_principal="Composicao financeira e documentacao sem pendencia critica.",
        )

    if faltante > 0 and campos_problema:
        return DecisaoRecomendadaOutput(
            codigo="AJUSTAR_VALOR_E_DOCUMENTACAO",
            titulo="Ajustar valor e documentacao",
            motivo_principal=f"Faltam {_formatar_brl(faltante)} para sustentar a venda e ha pendencias documentais.",
        )

    if faltante > 0:
        return DecisaoRecomendadaOutput(
            codigo="AJUSTAR_VALOR",
            titulo="Ajustar valor",
            motivo_principal=f"Faltam {_formatar_brl(faltante)} para sustentar a venda.",
        )

    return DecisaoRecomendadaOutput(
        codigo="AJUSTAR_DOCUMENTACAO",
        titulo="Ajustar documentacao",
        motivo_principal="A documentacao atual nao sustenta o avanco seguro do processo.",
    )


def analisar_operacao_frankstein(payload: AnaliseInput) -> RespostaFrankstein:
    analise_valor = analisar_valor(
        venda=payload.valor_venda,
        garantido=payload.garantido,
        cheque=payload.cheque_moradia,
    )
    campos_problema = analisar_documentos(payload)
    score = calcular_risco(
        payload=payload,
        faltante=float(analise_valor["faltante"]),
        qtd_problemas=len(campos_problema),
    )

    status_geral = definir_status_geral(analise_valor, campos_problema)
    resumo = montar_resumo(status_geral, analise_valor, campos_problema)
    decisao = montar_decisao_recomendada(status_geral, analise_valor, campos_problema)
    baloes = montar_baloes(analise_valor, campos_problema, score)
    regras_disparadas = montar_regras_disparadas(payload, analise_valor, campos_problema, score)

    return RespostaFrankstein(
        frankstein=FranksteinOutput(
            status_geral=status_geral,
            score=score,
            resumo=resumo,
            decisao_recomendada=decisao,
            baloes=baloes,
            campos_com_problema=campos_problema,
            regras_disparadas=regras_disparadas,
            metricas_operacionais=MetricasOperacionaisOutput(
                risco_pendencia=limitar_entre_0_e_1(score.valor + 0.05),
                risco_atraso_sla=limitar_entre_0_e_1(score.valor - 0.10),
                confianca_modelo=0.81,
            ),
            auditoria=AuditoriaOutput(
                origem="frankstein_rules_plus_engine_v1",
                versao="1.0.0",
                timestamp=datetime.now().astimezone().isoformat(),
            ),
        )
    )

