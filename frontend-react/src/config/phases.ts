import type { CockpitProcess } from '../data/mockProcesses'

interface ChecklistItem {
  id: string
  label: string
}

export interface PhaseDefinition {
  id: string
  name: string
  goal: string
  focus: (process: CockpitProcess) => boolean
  checklist: ChecklistItem[]
}

const isOpen = (process: CockpitProcess): boolean => !process.resolved

export const PHASES: PhaseDefinition[] = [
  {
    id: '09:00',
    name: 'Abertura',
    goal: 'Atacar risco imediato (SLA estourado e severidade alta).',
    focus: (process) => isOpen(process) && (process.slaHours <= 0 || process.severity === 'alta'),
    checklist: [
      { id: 'prioridades', label: 'Prioridades de risco revisadas.' },
      { id: 'owners', label: 'Dono da proxima acao definido para cada caso critico.' },
      { id: 'escalonamentos', label: 'Escalonamentos urgentes disparados.' },
    ],
  },
  {
    id: '10:00',
    name: 'Pendencias de entrada',
    goal: 'Reduzir fila de documentos e bloqueios de abertura.',
    focus: (process) =>
      isOpen(process) &&
      (process.stage === 'entrada' ||
        process.stage === 'triagem' ||
        process.nextOwner === 'cliente' ||
        process.nextOwner === 'corretor'),
    checklist: [
      { id: 'documentos', label: 'Pendencias documentais notificadas.' },
      { id: 'triagem', label: 'Fila de entrada abaixo do limite operacional.' },
      { id: 'sla', label: 'Sem novos SLAs estourados na base inicial.' },
    ],
  },
  {
    id: '11:00',
    name: 'Analise tecnica',
    goal: 'Empurrar casos para decisao de credito.',
    focus: (process) => isOpen(process) && process.stage === 'analise_credito',
    checklist: [
      { id: 'analise', label: 'Casos de analise revisados por prioridade.' },
      { id: 'duvidas', label: 'Duvidas de renda/patrimonio respondidas.' },
      { id: 'decisao', label: 'Casos prontos enviados para proxima etapa.' },
    ],
  },
  {
    id: '13:00',
    name: 'Retomada e retrabalho',
    goal: 'Eliminar gargalos de retrabalho no meio do dia.',
    focus: (process) => isOpen(process) && (process.reworkScore > 0 || process.nextOwner === 'credito'),
    checklist: [
      { id: 'retrabalho', label: 'Top causas de retrabalho atacadas.' },
      { id: 'alinhamento', label: 'Alinhamento com corretores realizado.' },
      { id: 'revisao', label: 'Itens voltaram para trilho correto.' },
    ],
  },
  {
    id: '15:00',
    name: 'Conformidade',
    goal: 'Garantir aderencia regulatoria antes de assinatura.',
    focus: (process) =>
      isOpen(process) && (process.stage === 'conformidade' || process.nextOwner === 'conformidade'),
    checklist: [
      { id: 'compliance', label: 'Checklist regulatorio concluido.' },
      { id: 'evidencias', label: 'Evidencias minimas registradas.' },
      { id: 'pendencias', label: 'Pendencias criticas devolvidas com prazo.' },
    ],
  },
  {
    id: '16:00',
    name: 'Assinatura e registro',
    goal: 'Garantir fluxo final sem interrupcao.',
    focus: (process) =>
      isOpen(process) && (process.stage === 'assinatura' || process.stage === 'registro'),
    checklist: [
      { id: 'assinatura', label: 'Assinaturas validadas sem divergencias.' },
      { id: 'registro', label: 'Documentos de registro conferidos.' },
      { id: 'handoff', label: 'Handoff para encerramento preparado.' },
    ],
  },
  {
    id: '17:00',
    name: 'Fechamento do dia',
    goal: 'Consolidar pendencias remanescentes e foto final.',
    focus: (process) => isOpen(process),
    checklist: [
      { id: 'resumo', label: 'Foto do dia registrada.' },
      { id: 'backlog', label: 'Backlog priorizado para o proximo dia.' },
      { id: 'comunicacao', label: 'Comunicacao final enviada ao time.' },
    ],
  },
]
