from __future__ import annotations

PROCESS_CREDITO_STATUSES = {"EM_ANALISE", "PENDENCIADO", "APROVADO", "REPROVADO"}
PROCESS_GERAL_STATUSES = {"NOVO", "EM_ANDAMENTO", "PENDENCIADO", "APROVADO", "REPROVADO", "DISTRATO", "CANCELADO"}
PROCESS_CAIXA_STATUSES = {
    "ANALISE_CREDITO",
    "PENDENTE_CREDITO",
    "ANALISE_CCA",
    "PENDENTE_CCA",
    "APROVADO",
    "REPROVADO",
    "CONDICIONADO",
    "BLOQUEADO",
    "DAR_QV",
    "AGUARDANDO_CONFORMIDADE",
    "CONFORME",
    "TRATANDO_PRODUTO",
    "AGENDADO",
    "ASSINATURA_CAIXA",
    "FINALIZADO",
}
PROCESS_AGEHAB_STATUSES = {"ANALISE_CREDITO", "PENDENTE_CREDITO", "ENVIO_AGEHAB", "PENDENTE_AGEHAB", "VALIDADO_AGEHAB"}
PROCESS_SINAL_STATUSES = {"NAO_TEM", "PENDENTE", "PAGO"}
PROCESS_FIADOR_STATUSES = {"NAO_TEM", "PENDENTE", "FINALIZADO"}
PROCESS_RECOLHA_FGTS_STATUSES = {"OK", "NAO_RECOLHIDO", "VALIDADO_PELO_BANCO", "RECOLHENDO"}
PROCESS_GERAL_FINAL_STATUSES = {"APROVADO", "REPROVADO", "DISTRATO", "CANCELADO"}
PROCESS_GERAL_ARQUIVO_IMEDIATO = {"CANCELADO", "DISTRATO"}
PROCESS_CCA_FINAL_STATUSES = {"ASSINATURA_CAIXA", "FINALIZADO"}
CAIXA_ASSINATURA_APTA_STATUSES = {
    "APROVADO",
    "DAR_QV",
    "CONFORME",
    "TRATANDO_PRODUTO",
    "AGENDADO",
    "ASSINATURA_CAIXA",
    "FINALIZADO",
}

ESTAGIO_COMERCIAL_VALUES = [
    "RESERVA",
    "EM_PROCESSO",
    "CREDITO",
    "SECRETARIA_VENDAS",
    "ASSINATURA_DIRETORIA",
    "AUTORIZACAO_DIRETORIA",
    "ENVIO_SIENGE",
    "VENDA_FINALIZADA",
]
ESTAGIO_COMERCIAL_SET = set(ESTAGIO_COMERCIAL_VALUES)
ESTAGIO_COMERCIAL_INDEX = {value: idx for idx, value in enumerate(ESTAGIO_COMERCIAL_VALUES)}
REPASSE_ETAPAS_VALUES = [
    "EM_REPASSE",
    "INICIO_REPASSE",
    "ASSINATURA_AUTORIZADA",
]
REPASSE_ETAPAS_SET = set(REPASSE_ETAPAS_VALUES)
ESTAGIOS_REPASSE_COMERCIAL = {
    "ASSINATURA_DIRETORIA",
    "AUTORIZACAO_DIRETORIA",
    "ENVIO_SIENGE",
    "VENDA_FINALIZADA",
}
ESTAGIOS_DASH_COMERCIAL = {"EM_PROCESSO", "CREDITO", "SECRETARIA_VENDAS"}
PROCESS_OVERVIEW_LABELS = {
    "geral": {
        "reserva": "Reserva",
        "em_processo": "Em Processo",
        "credito": "Credito",
        "secretaria_vendas": "Secretaria de Vendas",
        "assinatura_diretoria": "Assinatura Diretoria",
        "autorizacao_diretoria": "Aprovacao Diretoria",
        "envio_sienge": "Envio Sienge",
        "venda_finalizada": "Venda Finalizada",
    },
    "repasse": {
        "em_repasse": "Em Repasse",
        "inicio_repasse": "Inicio Repasse",
        "assinatura_autorizada": "Assinatura Autorizada",
        "assinatura_caixa": "Assinatura Caixa",
        "inicio_garantia": "Inicio Garantia",
        "sem_repasse": "Sem Repasse",
    },
    "status_cca": {
        "nao_iniciado": "Nao iniciado",
        "analise_credito": "Analise Credito",
        "pendente_credito": "Pendente Credito",
        "analise_cca": "Analise CCA",
        "pendente_cca": "Pendente CCA",
        "aprovado": "Aprovado",
        "reprovado": "Reprovado",
        "condicionado": "Condicionado",
        "bloqueado": "Bloqueado",
        "dar_qv": "Dar QV",
        "aguardando_conformidade": "Aguardando Conformidade",
        "conforme": "Conforme",
        "tratando_produto": "Tratando Produto",
        "agendado": "Agendado",
        "assinatura_caixa": "Assinatura Caixa",
        "finalizado": "Finalizado",
    },
    "status_agehab": {
        "nao_iniciado": "Nao iniciado",
        "analise_credito": "Analise Credito",
        "pendente_credito": "Pendente Credito",
        "envio_agehab": "Envio Agehab",
        "pendente_agehab": "Pendente Agehab",
        "validado_agehab": "Validado Agehab",
    },
    "status_sinal": {
        "nao_tem": "Nao tem",
        "pendente": "Pendente",
        "pago": "Pago",
    },
    "status_fiador": {
        "nao_tem": "Nao tem",
        "pendente": "Pendente",
        "finalizado": "Finalizado",
    },
}
PROCESS_READY_STATUS_KEYS = {
    "status_cca": {"aprovado", "dar_qv", "conforme", "tratando_produto", "agendado", "assinatura_caixa", "finalizado"},
    "status_agehab": {"validado_agehab"},
    "status_sinal": {"nao_tem", "pago"},
    "status_fiador": {"nao_tem", "finalizado"},
}
PLANEJAMENTO_ENTREGA_META_PREFIX = "__entrega_meta__:"
PLANEJAMENTO_DIA_TODO_META_PREFIX = "__dia_todo_meta__:"
PLANEJAMENTO_ENTREGA_STATUS_LABELS = {
    "entregue": "Entregue",
    "caixa": "Caixa",
    "agehab": "Agehab",
    "pendenciado": "Pendenciado",
}
PLANEJAMENTO_TIPO_LABELS = {
    "tarefa": "Tarefa",
    "subtarefa": "Subtarefa",
    "agendamento": "Agendamento",
    "entrega": "Entrega",
    "urgente": "Urgente",
    "anotacao": "Anotacao",
}
PLANEJAMENTO_STATUS_LABELS = {
    "pendente": "Pendente",
    "em_andamento": "Em andamento",
    "concluido": "Concluido",
    "atrasado": "Atrasado",
}
LEAD_STAGE_VALUES = [
    "LEAD",
    "AGENDAMENTO",
    "VISITA",
    "PRECADASTRO",
    "RESERVA",
    "PERDIDO",
]
LEAD_STAGE_SET = set(LEAD_STAGE_VALUES)
LEAD_CCA_DECISION_VALUES = [
    "EM_ANALISE",
    "APROVADO",
    "CONDICIONADO",
    "REPROVADO",
    "BLOQUEADO",
    "DAR_QV",
]
LEAD_CCA_DECISION_SET = set(LEAD_CCA_DECISION_VALUES)
UNIDADE_STATUS_VALUES = ["DISPONIVEL", "RESERVADA", "VENDIDA", "BLOQUEADA"]
UNIDADE_STATUS_SET = set(UNIDADE_STATUS_VALUES)
IMPORT_REQUIRED_COLUMNS = {
    "reserva",
    "nome_cliente",
    "data_cadastro",
    "estagio",
    "empreendimento",
    "corretor",
    "imobiliaria",
}
IMPORT_COLUMN_ALIASES = {
    "reserva": "reserva",
    "data_reserva": "reserva",
    "data_da_reserva": "reserva",
    "data_criacao_reserva": "reserva",
    "nome": "nome_cliente",
    "cliente": "nome_cliente",
    "nome_cliente": "nome_cliente",
    "nome_do_cliente": "nome_cliente",
    "data": "data_cadastro",
    "data_cad": "data_cadastro",
    "data_cadastro": "data_cadastro",
    "data_de_cadastro": "data_cadastro",
    "status": "estagio",
    "situacao": "estagio",
    "estagio": "estagio",
    "empreendimento": "empreendimento",
    "obra": "empreendimento",
    "corretor": "corretor",
    "imobiliaria": "imobiliaria",
}
CSV_IMPORT_ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")
CSV_IMPORT_DELIMITERS = (",", ";", "\t", "|")

SLA_OWNER_NONE = "NONE"
SLA_OWNER_CORRETOR = "CORRETOR"
SLA_OWNER_ANALISTA = "ANALISTA"
SLA_OWNER_CCA = "CCA"
SLA_OWNER_VALUES = {SLA_OWNER_NONE, SLA_OWNER_CORRETOR, SLA_OWNER_ANALISTA, SLA_OWNER_CCA}
