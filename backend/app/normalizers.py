DOCUMENTO_STATUS = {
    "aguardando": "Aguardando",
    "enviado": "Enviado",
    "em analise": "Enviado",
    "em análise": "Enviado",
    "pendente": "Pendente",
    "aprovado": "Aprovado",
    "nao se aplica": "Nao se Aplica",
    "não se aplica": "Nao se Aplica",
    "bloqueado": "Bloqueado",
}

RELACIONAMENTO_STATUS = {
    "sim": "sim",
    "nao": "nao",
    "não": "nao",
    "nao se aplica": "Nao se Aplica",
    "não se aplica": "Nao se Aplica",
}

CAIXA_STATUS = {
    "reserva": "reserva",
    "pendencia documentacao": "reserva",
    "em_analise_credito": "em_analise_credito",
    "em analise credito": "em_analise_credito",
    "em validacao credito": "em_analise_credito",
    "emitir formularios": "emitindo_formularios",
    "formularios disponiveis": "emitindo_formularios",
    "emitindo formularios": "emitindo_formularios",
    "emitindo_formularios": "emitindo_formularios",
    "formularios em assinatura": "formularios_em_assinatura",
    "formularios_em_assinatura": "formularios_em_assinatura",
    "formularios assinados": "formularios_assinados",
    "formularios_assinados": "formularios_assinados",
    "envio a conformidade": "envio_conformidade",
    "enviado para conformidade": "envio_conformidade",
    "enviando para conformidade": "envio_conformidade",
    "envio_conformidade": "envio_conformidade",
}

AGEHAB_STATUS = {
    "reserva": "reserva",
    "documentos pendenciados": "reserva",
    "em_analise_credito": "em_analise_credito",
    "em analise do credito": "em_analise_credito",
    "ficha_emitida": "ficha_emitida",
    "ficha agehab liberada": "ficha_emitida",
    "ficha_recebida": "ficha_recebida",
    "em_validacao_agehab": "em_validacao_agehab",
    "agehab_validada": "agehab_validada",
}


def normalize(value: str, options: dict[str, str], field_name: str) -> str:
    normalized = options.get(value.strip().lower())
    if not normalized:
        allowed = ", ".join(sorted(set(options.values())))
        raise ValueError(f"{field_name} invalido. Valores aceitos: {allowed}")
    return normalized
