import type {
  AuthSession,
  CreditoPlanejamentoDashboard,
  GestorDashboardResponse,
  LoginResponse,
  ProcessoApiItem,
  TabelaPrecoRow,
} from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/app/api'
const FORM_HEADERS: HeadersInit = {
  // deixar vazio para o navegador montar boundary corretamente
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => ({} as Record<string, unknown>))
  if (!res.ok) {
    const detail =
      typeof payload === 'object' && payload && 'detail' in payload
        ? String((payload as { detail?: unknown }).detail || 'Erro inesperado')
        : 'Erro inesperado'
    throw new ApiError(detail, res.status)
  }
  return payload as T
}

export async function fetchSession(): Promise<AuthSession> {
  const res = await fetch('/auth/me', {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  return parseResponse<AuthSession>(res)
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch('/auth/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
  return parseResponse<LoginResponse>(res)
}

export async function logout(): Promise<void> {
  const res = await fetch('/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  })
  if (!res.ok) {
    throw new ApiError('Falha ao encerrar sessao', res.status)
  }
}

export async function fetchGestorDashboard(): Promise<GestorDashboardResponse> {
  const res = await fetch(`${API_BASE}/gestor/dashboard`, {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  return parseResponse<GestorDashboardResponse>(res)
}

export async function fetchCCAs(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/ccas`, {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  return parseResponse<string[]>(res)
}

export async function fetchAnalistaPlannerDashboard(days = 14): Promise<CreditoPlanejamentoDashboard> {
  const res = await fetch(`${API_BASE}/analista/planejamento?dias=${days}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  return parseResponse<CreditoPlanejamentoDashboard>(res)
}

export async function fetchProcessosPaged(
  pageSize = 120,
  maxPages = 20,
): Promise<ProcessoApiItem[]> {
  const out: ProcessoApiItem[] = []

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize
    const res = await fetch(`${API_BASE}/processos?limit=${pageSize}&offset=${offset}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    })

    const chunk = await parseResponse<ProcessoApiItem[]>(res)
    if (!Array.isArray(chunk) || chunk.length === 0) break

    out.push(...chunk)
    if (chunk.length < pageSize) break
  }

  return out
}

export async function uploadTabelaPrecos(file: File): Promise<{ detail?: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/tabela-precos/upload`, {
    method: 'POST',
    credentials: 'same-origin',
    body: formData,
    headers: FORM_HEADERS,
  })

  return parseResponse<{ detail?: string }>(res)
}

export async function fetchTabelaPrecos(): Promise<TabelaPrecoRow[]> {
  const res = await fetch(`${API_BASE}/tabela-precos`, {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  return parseResponse<TabelaPrecoRow[]>(res)
}

export async function fetchRecomendacao(input: {
  renda_bruta: number
  valor_tabela: number
  sobrepreco_vila: number
  valor_obtido: number
  parcela_caixa: number
  preco_digitado_corretor?: number
}) {
  const res = await fetch(`${API_BASE}/recomendacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseResponse<{
    preco_sugerido: number
    status_ia: string
    risco_exposicao: string
    confianca: number
    motivo: string
  }>(res)
}

export async function enviarFeedbackRecomendacao(payload: {
  aceitou: boolean
  preco_sugerido: number
  contexto: Record<string, unknown>
}) {
  const res = await fetch(`${API_BASE}/recomendacao/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<{ ok: boolean }>(res)
}
