import type { Role } from '../types'

const HOME_BY_ROLE: Record<string, string> = {
  admin: '/admin',
  gestor: '/gestor',
  gestor_credito: '/gestor-credito',
  analista: '/analista',
  cca: '/cca',
  corretor: '/corretor',
}

export function normalizeRole(role: Role | undefined | null): string {
  return String(role ?? '')
    .trim()
    .toLowerCase()
}

export function reactHomeForRole(role: Role | undefined | null): string {
  const key = normalizeRole(role)
  return HOME_BY_ROLE[key] || '/analista'
}

