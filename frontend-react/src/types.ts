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
