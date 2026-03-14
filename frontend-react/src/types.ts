export type Role =
  | 'admin'
  | 'gestor'
  | 'gestor_credito'
  | 'analista'
  | 'cca'
  | 'corretor'
  | string

export interface AuthSession {
  user_id?: string
  username: string
  role: Role
  home?: string
  must_change_password?: boolean
}

export interface LoginResponse {
  ok: boolean
  username: string
  role: Role
  must_change_password: boolean
  home: string
}

export interface ClienteFaseItem {
  processo_id: string
  cliente_nome: string
  obra: string
  corretor: string
  imobiliaria?: string | null
  estagio_comercial?: string
  etapa_repasse?: string
  status_cca?: string
  status_agehab?: string
  status_sinal?: string
  status_fiador?: string
  dias_em_aberto?: number | null
  nao_contar_mes?: boolean
}

export interface ImobiliariaResumo {
  nome: string
  total: number
  corretores: Array<{ nome: string; total: number }>
}

export interface GestorDashboardResponse {
  total: number
  total_assinados: number
  conformidade_ok: number
  enviados_conformidade: number
  em_analise: number
  perdas_mes: number
  provaveis_cair: number
  nao_contar_mes: number
  sla_medio_comercial_horas: number
  sla_medio_credito_horas: number
  sla_medio_cca_horas: number
  meta: number
  real: number
  previsao: number
  meta_semanal: number
  real_semanal: number
  previsao_semanal: number
  media_necessaria_dia: number
  clientes_por_fase: Record<string, ClienteFaseItem[]>
  clientes_estagios: ClienteFaseItem[]
  imobiliarias: ImobiliariaResumo[]
}

export interface CreditoPlanejamentoItem {
  id: string
  tipo: string
  tipo_label?: string | null
  titulo: string
  descricao?: string | null
  responsavel?: string | null
  data_referencia?: string | null
  hora_inicio?: string | null
  hora_fim?: string | null
  status: string
  status_label?: string | null
  progresso: number
  urgente: boolean
  created_by_username?: string | null
  updated_by_username?: string | null
  created_at: string
  updated_at: string
  display_titulo?: string | null
  display_descricao?: string | null
  display_meta?: string | null
  meta_kind?: string | null
  meta_cliente?: string | null
  meta_acao?: string | null
  meta_observacao?: string | null
  meta_responsavel?: string | null
  meta_status_oper?: string | null
  meta_status_oper_label?: string | null
}

export interface CreditoPlanejamentoEvolucao {
  responsavel: string
  total: number
  concluidas: number
  pendentes: number
  progresso_medio: number
  taxa_conclusao: number
}

export interface CreditoPlanejamentoDashboard {
  referencia: string
  pendentes_total: number
  tarefas_dia: CreditoPlanejamentoItem[]
  agendamentos_dia: CreditoPlanejamentoItem[]
  entregas_dia: CreditoPlanejamentoItem[]
  urgentes: CreditoPlanejamentoItem[]
  evolucao_time: CreditoPlanejamentoEvolucao[]
  anotacoes: CreditoPlanejamentoItem[]
  itens: CreditoPlanejamentoItem[]
}

export interface ProcessoApiItem {
  processo_id: string
  cliente_nome?: string | null
  obra?: string | null
  corretor?: string | null
  cca_responsavel?: string | null
  status_credito?: string | null
  estagio_comercial?: string | null
  status_geral?: string | null
  etapa_repasse?: string | null
  status_cca?: string | null
  status_agehab?: string | null
  status_sinal?: string | null
  status_fiador?: string | null
  sla_corretor_horas?: number | null
  sla_corretor_dias?: number | null
  sla_analista_horas?: number | null
  sla_credito_dias?: number | null
  sla_cca_horas?: number | null
  sla_cca_dias?: number | null
  data_reserva_origem?: string | null
  data_cadastro_origem?: string | null
  created_at?: string | null
  observacao?: string | null
  docs_total?: number | null
  docs_recebidos?: number | null
  sem_documento_enviado?: boolean | null
  nao_contar_mes?: boolean | null
  aviso_gerar_contrato_agehab?: boolean | null
  estagio_comercial_key?: string | null
  estagio_comercial_label?: string | null
  etapa_repasse_key?: string | null
  etapa_repasse_label?: string | null
  repasse_fase_key?: string | null
  repasse_fase_label?: string | null
  status_cca_key?: string | null
  status_cca_label?: string | null
  status_agehab_key?: string | null
  status_agehab_label?: string | null
  status_sinal_key?: string | null
  status_sinal_label?: string | null
  status_fiador_key?: string | null
  status_fiador_label?: string | null
  docs_pendentes?: number | null
  documentos_resumo?: string | null
  observacao_resumo?: string | null
  status_pendencias?: string[] | null
  status_pendencias_resumo?: string | null
  status_tudo_ok?: boolean | null
}

export interface ProcessoLinha {
  processoId: string
  cliente: string
  emp: string
  corretor: string
  cca: string
  geral: string
  repasse: string
  statusCaixa: string
  statusCaixaLabel: string
  statusAgehab: string
  statusAgehabLabel: string
  sinal: string
  sinalLabel: string
  fiador: string
  fiadorLabel: string
  slaCor: number
  slaCred: number
  slaCca: number
  dataCadastroOrigem: string | null
  createdAt: string | null
  observacao: string
  observacaoResumo: string
  docsTotal: number
  docsRecebidos: number
  docsPendentes: number
  documentosResumo: string
  semDocumento: boolean
  foraContagemMes: boolean
  avisoContratoAgehab: boolean
  geralLabel: string
  repasseLabel: string
  pendingItems: string[]
  pendingSummary: string
  statusTudoOk: boolean
}
