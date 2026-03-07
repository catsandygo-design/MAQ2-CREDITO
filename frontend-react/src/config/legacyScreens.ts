import type { Role } from '../types'

type AllowedRole = Extract<Role, 'admin' | 'gestor' | 'gestor_credito' | 'analista' | 'cca' | 'corretor'> | string

export interface LegacyScreenRoute {
  path: string
  title: string
  legacyPath: string
  allowedRoles: AllowedRole[]
  forwardQuery?: boolean
}

export const LEGACY_SCREEN_ROUTES: LegacyScreenRoute[] = [
  {
    path: '/admin',
    title: 'Admin',
    legacyPath: '/app/admin',
    allowedRoles: ['admin'],
  },
  {
    path: '/analise',
    title: 'Analise',
    legacyPath: '/app/analise',
    allowedRoles: ['analista', 'gestor', 'gestor_credito'],
    forwardQuery: true,
  },
  {
    path: '/analista/acompanhamento',
    title: 'Acompanhamento',
    legacyPath: '/app/analista/acompanhamento',
    allowedRoles: ['analista', 'gestor', 'gestor_credito'],
  },
  {
    path: '/analista/acompanhamento-operacional',
    title: 'Acompanhamento Operacional',
    legacyPath: '/app/analista/acompanhamento-operacional',
    allowedRoles: ['analista', 'gestor', 'gestor_credito'],
  },
  {
    path: '/analista/reuniao-comercial',
    title: 'Reuniao Comercial',
    legacyPath: '/app/analista/reuniao-comercial',
    allowedRoles: ['analista', 'gestor', 'gestor_credito', 'admin'],
  },
  {
    path: '/analista/repasse',
    title: 'Repasse',
    legacyPath: '/app/analista/repasse',
    allowedRoles: ['analista', 'gestor', 'gestor_credito'],
  },
  {
    path: '/analista/arquivados',
    title: 'Arquivados',
    legacyPath: '/app/analista/arquivados',
    allowedRoles: ['analista', 'gestor', 'gestor_credito', 'admin'],
  },
  {
    path: '/analista/importacao',
    title: 'Importacao',
    legacyPath: '/app/analista/importacao',
    allowedRoles: ['analista', 'gestor', 'gestor_credito'],
  },
  {
    path: '/cca',
    title: 'CCA',
    legacyPath: '/app/cca',
    allowedRoles: ['cca', 'analista'],
  },
  {
    path: '/cca/analise',
    title: 'CCA Analise',
    legacyPath: '/app/cca/analise',
    allowedRoles: ['cca', 'analista', 'gestor', 'gestor_credito', 'admin'],
    forwardQuery: true,
  },
  {
    path: '/checklist',
    title: 'Checklist',
    legacyPath: '/app/checklist',
    allowedRoles: ['analista', 'cca', 'admin'],
  },
  {
    path: '/corretor',
    title: 'Corretor',
    legacyPath: '/app/corretor',
    allowedRoles: ['corretor'],
  },
  {
    path: '/corretor/precadastro',
    title: 'Corretor Pre-cadastro',
    legacyPath: '/app/corretor/precadastro',
    allowedRoles: ['corretor'],
  },
  {
    path: '/corretor/apresentacao',
    title: 'Corretor Apresentacao',
    legacyPath: '/app/corretor/apresentacao',
    allowedRoles: ['corretor'],
  },
  {
    path: '/gestor-credito',
    title: 'Gestor Credito',
    legacyPath: '/app/gestor-credito',
    allowedRoles: ['gestor', 'gestor_credito', 'admin'],
  },
  {
    path: '/trocar-senha',
    title: 'Trocar Senha',
    legacyPath: '/app/trocar-senha',
    allowedRoles: ['admin', 'gestor', 'gestor_credito', 'analista', 'cca', 'corretor'],
  },
]

