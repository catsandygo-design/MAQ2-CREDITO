export const STAGES = [
  {
    id: 'entrada',
    label: 'Entrada',
    chipTone: 'neutral',
  },
  {
    id: 'triagem',
    label: 'Triagem',
    chipTone: 'info',
  },
  {
    id: 'analise_credito',
    label: 'Analise de Credito',
    chipTone: 'warn',
  },
  {
    id: 'conformidade',
    label: 'Conformidade',
    chipTone: 'warn',
  },
  {
    id: 'assinatura',
    label: 'Assinatura',
    chipTone: 'success',
  },
  {
    id: 'registro',
    label: 'Registro',
    chipTone: 'success',
  },
] as const

export const OWNER_OPTIONS = ['corretor', 'cliente', 'credito', 'conformidade'] as const

export type StageId = (typeof STAGES)[number]['id']
export type OwnerOption = (typeof OWNER_OPTIONS)[number]
export type ChipTone = 'neutral' | 'info' | 'success' | 'warn' | 'danger'
