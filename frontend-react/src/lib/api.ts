import type {
  AuthSession,
  GestorDashboardResponse,
  LoginResponse,
  ProcessoApiItem,
} from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/app/api'

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
