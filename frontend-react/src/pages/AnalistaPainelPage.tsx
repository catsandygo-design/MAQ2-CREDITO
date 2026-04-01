import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, fetchAnalistaPlannerDashboard, fetchCCAs, fetchProcessosPaged, fetchSession, logout } from '../lib/api'
import type { TimelineStep } from '../components/TimelineLane'
import type { CreditoPlanejamentoDashboard, CreditoPlanejamentoItem, ProcessoApiItem, ProcessoLinha } from '../types'

const REFRESH_SECONDS = 60
const PAGE_SIZE = 120
const MAX_PAGES = 20
const PLANNER_DAYS = 14
const SLA_WARN = 24
const SLA_BAD = 48

const INSIGHT_COMERCIAL_STAGES = new Set(['em_processo', 'venda_finalizada'])
const INSIGHT_CREDITO_STAGES = new Set(['credito', 'secretaria_vendas'])
const INSIGHT_REPASSE_STAGES = new Set([
  'assinatura_diretoria',
  'autorizacao_diretoria',
  'envio_sienge',
  'venda_finalizada',
])

const COMMERCIAL_FLOW_STEPS: TimelineStep[] = [
  { key: 'reserva', label: 'Reserva' },
  { key: 'em_processo', label: 'Em Processo' },
  { key: 'credito', label: 'Credito' },
  { key: 'secretaria_vendas', label: 'Secretaria' },
  { key: 'assinatura_diretoria', label: 'Assinatura' },
  { key: 'autorizacao_diretoria', label: 'Aprovacao' },
  { key: 'envio_sienge', label: 'Sienge' },
  { key: 'venda_finalizada', label: 'Finalizada' },
]

const REPASSE_FLOW_STEPS: TimelineStep[] = [
  { key: 'em_repasse', label: 'Em Repasse' },
  { key: 'inicio_repasse', label: 'Inicio Repasse' },
  { key: 'assinatura_caixa', label: 'Assinatura Caixa' },
  { key: 'inicio_garantia', label: 'Inicio Garantia' },
]

const ANALISTA_NAV: ReadonlyArray<{ label: string; href: string; active?: boolean }> = [
  { label: 'Painel', href: '/app/analista', active: true },
  { label: 'Acompanhamento', href: '/app/analista/acompanhamento' },
  { label: 'Reuniao Comercial', href: '/app/analista/reuniao-comercial' },
  { label: 'Operacional', href: '/app/analista/acompanhamento-operacional' },
  { label: 'Repasse', href: '/app/analista/repasse' },
  { label: 'Importacao', href: '/app/analista/importacao' },
  { label: 'Arquivados', href: '/app/analista/arquivados' },
]

const FLOW_COMMERCIAL_KEYS = new Set(COMMERCIAL_FLOW_STEPS.map((step) => step.key))

const READY_STATUS = {
  statusCaixa: new Set(['aprovado', 'dar_qv', 'conforme', 'tratando_produto', 'agendado', 'assinatura_caixa', 'finalizado']),
  statusAgehab: new Set(['validado_agehab']),
  sinal: new Set(['nao_tem', 'pago']),
  fiador: new Set(['nao_tem', 'finalizado']),
}

const LABELS: Record<string, Record<string, string>> = {
  geral: {
    reserva: 'Reserva',
    em_processo: 'Em Processo',
    credito: 'Credito',
    secretaria_vendas: 'Secretaria de Vendas',
    assinatura_diretoria: 'Assinatura Diretoria',
    autorizacao_diretoria: 'Aprovacao Diretoria',
    envio_sienge: 'Envio Sienge',
    venda_finalizada: 'Venda Finalizada',
  },
  repasse: {
    em_repasse: 'Em Repasse',
    inicio_repasse: 'Inicio Repasse',
    assinatura_autorizada: 'Assinatura Autorizada',
    assinatura_caixa: 'Assinatura Caixa',
    inicio_garantia: 'Inicio Garantia',
    sem_repasse: 'Sem Repasse',
  },
  statusCaixa: {
    nao_iniciado: 'Nao iniciado',
    analise_credito: 'Analise Credito',
    pendente_credito: 'Pendente Credito',
    analise_cca: 'Analise CCA',
    pendente_cca: 'Pendente CCA',
    aprovado: 'Aprovado',
    reprovado: 'Reprovado',
    condicionado: 'Condicionado',
    bloqueado: 'Bloqueado',
    dar_qv: 'Dar QV',
    aguardando_conformidade: 'Aguardando Conformidade',
    conforme: 'Conforme',
    tratando_produto: 'Tratando Produto',
    agendado: 'Agendado',
    assinatura_caixa: 'Assinatura Caixa',
    finalizado: 'Finalizado',
  },
  statusAgehab: {
    nao_iniciado: 'Nao iniciado',
    analise_credito: 'Analise Credito',
    pendente_credito: 'Pendente Credito',
    envio_agehab: 'Envio Agehab',
    pendente_agehab: 'Pendente Agehab',
    validado_agehab: 'Validado Agehab',
  },
  sinal: {
    nao_tem: 'Nao tem',
    pendente: 'Pendente',
    pago: 'Pago',
  },
  fiador: {
    nao_tem: 'Nao tem',
    pendente: 'Pendente',
    finalizado: 'Finalizado',
  },
}

interface FiltersState {
  q: string
  emp: string
  cor: string
  cca: string
  stG: string
  stC: string
}

interface SectionShellProps {
  eyebrow: string
  title: string
  description: string
  open: boolean
  onToggle: () => void
  aside?: ReactNode
  children: ReactNode
}

interface MiniTimelineProps {
  tone: 'commercial' | 'repasse'
  laneLabel: string
  currentLabel: string
  currentKey: string
  steps: TimelineStep[]
  tooltipForStep?: (step: TimelineStep) => string
}

function norm(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function statusFromBackend(value: unknown): string {
  return norm(value).replace(/\s+/g, '_')
}

function toHours(days: number | null | undefined, createdAt: string | null | undefined): number {
  const d = Number(days)
  if (Number.isFinite(d) && d >= 0) return Math.round(d * 24)

  if (!createdAt) return 0
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return 0

  const diffMs = Date.now() - date.getTime()
  return Math.max(0, Math.floor(diffMs / 3600000))
}

function readSlaHours(
  item: ProcessoApiItem,
  hoursField: keyof ProcessoApiItem,
  daysField: keyof ProcessoApiItem,
): number {
  const direct = Number(item?.[hoursField] as number | null | undefined)
  if (Number.isFinite(direct) && direct >= 0) return Math.round(direct)
  return toHours(item?.[daysField] as number | null | undefined, item.created_at)
}

function toProcessDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function openDays(row: ProcessoLinha): number {
  const source = toProcessDate(row.dataCadastroOrigem) || toProcessDate(row.createdAt)
  if (!source) return 0
  const diff = Date.now() - source.getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

function openHours(row: ProcessoLinha): number {
  const source = toProcessDate(row.dataCadastroOrigem) || toProcessDate(row.createdAt)
  if (!source) return 0
  const diff = Date.now() - source.getTime()
  return Math.max(0, Math.floor(diff / 3600000))
}

function isVisibleInAnalista(item: ProcessoApiItem): boolean {
  const statusGeral = statusFromBackend(item.status_geral)
  return statusGeral !== 'cancelado' && statusGeral !== 'distrato'
}

function fromBackend(item: ProcessoApiItem): ProcessoLinha {
  const semDocumento = Boolean(item?.sem_documento_enviado)
  const statusCaixa = statusFromBackend(item.status_cca_key || (semDocumento ? 'nao_iniciado' : item.status_cca || 'analise_credito'))
  const statusAgehab = statusFromBackend(item.status_agehab_key || (semDocumento ? 'nao_iniciado' : item.status_agehab || 'analise_credito'))
  const sinal = statusFromBackend(item.status_sinal_key || item.status_sinal || 'nao_tem')
  const fiador = statusFromBackend(item.status_fiador_key || item.status_fiador || 'nao_tem')
  const geral = statusFromBackend(item.estagio_comercial_key || item.estagio_comercial || item.status_geral)
  const repasse = statusFromBackend(item.repasse_fase_key || item.etapa_repasse_key || item.etapa_repasse || 'sem_repasse')
  const pendingItems = Array.isArray(item.status_pendencias)
    ? item.status_pendencias.map((entry) => String(entry || '').trim()).filter(Boolean)
    : []

  return {
    processoId: item.processo_id,
    cliente: item.cliente_nome || '-',
    emp: item.obra || '-',
    corretor: item.corretor || '-',
    cca: item.cca_responsavel || '-',
    geral,
    geralLabel: String(item.estagio_comercial_label || labelFor('geral', geral) || '-').trim() || '-',
    repasse,
    repasseLabel: String(item.repasse_fase_label || item.etapa_repasse_label || labelFor('repasse', repasse) || '-').trim() || '-',
    statusCaixa,
    statusCaixaLabel: String(item.status_cca_label || labelFor('statusCaixa', statusCaixa) || '-').trim() || '-',
    statusAgehab,
    statusAgehabLabel: String(item.status_agehab_label || labelFor('statusAgehab', statusAgehab) || '-').trim() || '-',
    sinal,
    sinalLabel: String(item.status_sinal_label || labelFor('sinal', sinal) || '-').trim() || '-',
    fiador,
    fiadorLabel: String(item.status_fiador_label || labelFor('fiador', fiador) || '-').trim() || '-',
    slaCor: readSlaHours(item, 'sla_corretor_horas', 'sla_corretor_dias'),
    slaCred: readSlaHours(item, 'sla_analista_horas', 'sla_credito_dias'),
    slaCca: readSlaHours(item, 'sla_cca_horas', 'sla_cca_dias'),
    dataCadastroOrigem: item.data_reserva_origem || item.data_cadastro_origem || null,
    createdAt: item.created_at || null,
    observacao: String(item.observacao || '').trim(),
    observacaoResumo: String(item.observacao_resumo || '').trim() || 'Sem observacao registrada',
    docsTotal: Math.max(0, Number(item.docs_total || 0)),
    docsRecebidos: Math.max(0, Number(item.docs_recebidos || 0)),
    docsPendentes: Math.max(0, Number(item.docs_pendentes ?? Math.max(0, Number(item.docs_total || 0) - Number(item.docs_recebidos || 0)))),
    documentosResumo: String(item.documentos_resumo || '').trim() || 'Documentos: nenhum enviado',
    semDocumento,
    foraContagemMes: Boolean(item?.nao_contar_mes),
    avisoContratoAgehab:
      Boolean(item?.aviso_gerar_contrato_agehab) &&
      !semDocumento &&
      statusAgehab === 'validado_agehab',
    pendingItems,
    pendingSummary:
      String(item.status_pendencias_resumo || '').trim() ||
      (pendingItems.length ? `Pendencias: ${pendingItems.join('; ')}` : 'Status OK: caixa, agehab, sinal e fiador alinhados'),
    statusTudoOk: Boolean(item.status_tudo_ok) || pendingItems.length === 0,
  }
}

function labelFor(area: keyof typeof LABELS, value: string): string {
  const key = statusFromBackend(value)
  return LABELS[area]?.[key] || value || '-'
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('pt-BR')
}

function plannerStatusLabel(value: string | null | undefined): string {
  const key = statusFromBackend(value)
  if (key === 'concluido') return 'Concluido'
  if (key === 'em_andamento') return 'Em andamento'
  if (key === 'cancelado') return 'Cancelado'
  return 'Pendente'
}

function plannerStatusTone(value: string | null | undefined): 'ok' | 'warn' | 'bad' | 'neutral' {
  const key = statusFromBackend(value)
  if (key === 'concluido') return 'ok'
  if (key === 'em_andamento') return 'warn'
  if (key === 'cancelado') return 'bad'
  return 'neutral'
}

function plannerTimeWindow(item: CreditoPlanejamentoItem): string {
  const start = String(item.hora_inicio || '').slice(0, 5)
  const end = String(item.hora_fim || '').slice(0, 5)
  if (start && end) return `${start} - ${end}`
  if (start) return start
  if (end) return end
  return ''
}

function plannerCardTitle(item: CreditoPlanejamentoItem): string {
  return String(item.display_titulo || item.titulo || '-').trim() || '-'
}

function plannerCardDescription(item: CreditoPlanejamentoItem): string {
  return String(item.display_descricao || item.descricao || '').trim()
}

function plannerMeta(item: CreditoPlanejamentoItem): string {
  if (String(item.display_meta || '').trim()) return String(item.display_meta || '').trim()

  const parts = [item.responsavel || '', plannerTimeWindow(item), formatDateLabel(item.data_referencia)]
    .map((part) => String(part || '').trim())
    .filter((part) => part && part !== '-')
  return parts.join(' - ')
  return parts.join(' • ')
}

function formatElapsedHours(hours: number): string {
  const safeHours = Number.isFinite(hours) ? Math.max(0, Math.round(hours)) : 0
  if (safeHours < 1) return '0 min'
  if (safeHours < 24) return `${safeHours} h`

  const days = Math.floor(safeHours / 24)
  if (days < 365) return `${days} ${days === 1 ? 'dia' : 'dias'}`

  const years = Math.floor(days / 365)
  return `${years} ${years === 1 ? 'ano' : 'anos'}`
}

function classForStatus(value: string): 'neutral' | 'ok' | 'warn' | 'bad' {
  const v = statusFromBackend(value)
  if (!v || v === '-') return 'neutral'
  if (
    ['assinatura_autorizada', 'aprovado', 'dar_qv', 'conforme', 'validado_agehab', 'pago', 'finalizado', 'assinatura_caixa'].includes(
      v,
    )
  ) {
    return 'ok'
  }
  if (
    [
      'pendenciado',
      'reprovado',
      'bloqueado',
      'cancelado',
      'distrato',
      'pendente_credito',
      'pendente_cca',
      'pendente_agehab',
      'pendente',
    ].includes(v)
  ) {
    return 'bad'
  }
  if (['condicionado'].includes(v)) return 'warn'
  return 'neutral'
}

function isHighPriority(row: ProcessoLinha): boolean {
  return statusFromBackend(row.geral) === 'em_processo' && openDays(row) > 15
}

function isFinalizadoRow(row: ProcessoLinha): boolean {
  const status = statusFromBackend(row.statusCaixa)
  return status === 'assinatura_caixa' || status === 'finalizado'
}

function isPendingRow(row: ProcessoLinha): boolean {
  const pending = new Set([
    'pendenciado',
    'pendente_credito',
    'pendente_cca',
    'pendente_agehab',
    'pendente',
    'condicionado',
    'bloqueado',
  ])
  return (
    pending.has(statusFromBackend(row.geral)) ||
    pending.has(statusFromBackend(row.statusCaixa)) ||
    pending.has(statusFromBackend(row.statusAgehab)) ||
    pending.has(statusFromBackend(row.sinal)) ||
    pending.has(statusFromBackend(row.fiador))
  )
}

function isWaitingDocs(row: ProcessoLinha): boolean {
  return (
    Boolean(row.semDocumento) ||
    (statusFromBackend(row.statusCaixa) === 'nao_iniciado' && statusFromBackend(row.statusAgehab) === 'nao_iniciado')
  )
}

function clientAnimState(row: ProcessoLinha): 'pause' | 'rest' | 'panic' | 'wait' | 'progress' {
  if (row.foraContagemMes) return 'pause'
  if (isFinalizadoRow(row)) return 'rest'
  if (isPendingRow(row)) return 'panic'
  if (isWaitingDocs(row)) return 'wait'
  return 'progress'
}

function severityScore(row: ProcessoLinha): number {
  const slaC = Number(row.slaCred || 0)
  const slaR = Number(row.slaCor || 0)
  const aging = openDays(row)
  const prio = isHighPriority(row) ? 10000 : 0
  const sCritCred = slaC >= SLA_BAD ? 4000 : slaC >= SLA_WARN ? 2000 : 0
  const sCritCor = slaR >= SLA_BAD ? 2000 : slaR >= SLA_WARN ? 1000 : 0
  return prio + sCritCred + sCritCor + slaC * 3 + slaR + aging * 10
}

function sortCriticalFirst(rows: ProcessoLinha[]): ProcessoLinha[] {
  return [...rows].sort((a, b) => {
    if (a.foraContagemMes !== b.foraContagemMes) return a.foraContagemMes ? 1 : -1
    return severityScore(b) - severityScore(a)
  })
}

function kpiToneByHours(hours: number): 'ok' | 'warn' | 'danger' {
  if (hours >= SLA_BAD) return 'danger'
  if (hours >= SLA_WARN) return 'warn'
  return 'ok'
}

function isResolved(area: keyof typeof READY_STATUS, value: string): boolean {
  return READY_STATUS[area].has(statusFromBackend(value))
}

function pendingItems(row: ProcessoLinha): string[] {
  if (row.pendingItems.length > 0) return row.pendingItems
  const items: string[] = []
  if (!isResolved('statusCaixa', row.statusCaixa)) items.push(`Caixa: ${row.statusCaixaLabel}`)
  if (!isResolved('statusAgehab', row.statusAgehab)) items.push(`Agehab: ${row.statusAgehabLabel}`)
  if (!isResolved('sinal', row.sinal)) items.push(`Sinal: ${row.sinalLabel}`)
  if (!isResolved('fiador', row.fiador)) items.push(`Fiador: ${row.fiadorLabel}`)
  return items
}

function summarizeObservation(row: ProcessoLinha): string {
  return row.observacaoResumo
}

function documentsSummary(row: ProcessoLinha): string {
  return row.documentosResumo
}

function statusSummary(row: ProcessoLinha): string {
  return row.pendingSummary
}

function timelineTooltip(row: ProcessoLinha, laneLabel: string, step: TimelineStep): string {
  const resumo = `Resumo: Comercial ${row.geralLabel} | Repasse ${row.repasseLabel}`

  return [
    `${laneLabel} • ${step.label}`,
    resumo,
    `Observacao: ${summarizeObservation(row)}`,
    documentsSummary(row),
    statusSummary(row),
    `Sinal: ${row.sinalLabel}`,
    `Fiador: ${row.fiadorLabel}`,
  ].join('\n')
}

function nextActionSummary(row: ProcessoLinha): string {
  if (row.foraContagemMes) return 'Cliente pausado para a contagem mensal'
  if (row.avisoContratoAgehab) return 'Solicitar contrato Agehab e acelerar fechamento'
  if (isWaitingDocs(row)) return 'Cobrar envio documental para destravar a analise'
  const pendencias = pendingItems(row)
  if (pendencias.length > 0) return `Atuar em ${pendencias[0]}`
  if (isFinalizadoRow(row)) return 'Processo em etapa final de assinatura e formalizacao'
  return 'Manter cadencia comercial e preparar proximo avanço'
}

function commercialTimelineKey(row: ProcessoLinha): string {
  const geral = statusFromBackend(row.geral)
  return FLOW_COMMERCIAL_KEYS.has(geral) ? geral : ''
}

function repasseTimelineKey(row: ProcessoLinha): string {
  return statusFromBackend(row.repasse)
}

function buildMiniTimelineSnapshot(steps: TimelineStep[], currentKey: string) {
  const normalized = statusFromBackend(currentKey)
  const currentIndex = steps.findIndex((step) => step.key === normalized)
  if (currentIndex < 0) {
    return {
      currentKey: '',
      doneKeys: [] as string[],
    }
  }
  return {
    currentKey: normalized,
    doneKeys: steps.slice(0, currentIndex).map((step) => step.key),
  }
}

function SectionShell({
  eyebrow,
  title,
  description,
  open,
  onToggle,
  aside,
  children,
}: SectionShellProps) {
  return (
    <section className={`panel section-shell ${open ? 'is-open' : 'is-closed'}`}>
      <button type="button" className="section-toggle" onClick={onToggle} aria-expanded={open}>
        <div className="section-copy">
          <span className="section-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="section-toggle-side">
          {aside}
          <span className="section-toggle-pill">{open ? 'Fechar' : 'Abrir'}</span>
        </div>
      </button>
      {open ? <div className="section-body">{children}</div> : null}
    </section>
  )
}

function MiniTimeline({ tone, laneLabel, currentLabel, currentKey, steps, tooltipForStep }: MiniTimelineProps) {
  const snapshot = buildMiniTimelineSnapshot(steps, currentKey)

  return (
    <div className={`mini-flow mini-flow-${tone}`}>
      <div className="mini-flow-head">
        <span className="mini-flow-lane">{laneLabel}</span>
        <strong>{currentLabel}</strong>
      </div>
      <div className="mini-flow-track">
        {steps.map((step) => {
          const isDone = snapshot.doneKeys.includes(step.key)
          const isCurrent = step.key === snapshot.currentKey
          const state = isDone ? 'done' : isCurrent ? 'current' : 'future'
          const tooltip = tooltipForStep?.(step)

          return (
            <div
              key={step.key}
              className={`mini-flow-step ${state} ${tooltip ? 'has-tooltip' : ''}`.trim()}
              title={tooltip}
              aria-label={tooltip}
              tabIndex={tooltip ? 0 : -1}
            >
              <span className="mini-flow-label">{step.label}</span>
              <span className="mini-flow-dot" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AnalistaPainelPage() {
  const navigate = useNavigate()
  const rowRefs = useRef<Record<string, HTMLElement | null>>({})
  const [rows, setRows] = useState<ProcessoLinha[]>([])
  const [ccas, setCcas] = useState<string[]>([])
  const [planner, setPlanner] = useState<CreditoPlanejamentoDashboard | null>(null)
  const [plannerError, setPlannerError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshTick, setRefreshTick] = useState(REFRESH_SECONDS)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [activeRowId, setActiveRowId] = useState('')
  const [sections, setSections] = useState({
    overview: true,
    operational: true,
    filters: true,
    queue: true,
  })

  const [filters, setFilters] = useState<FiltersState>({
    q: '',
    emp: '',
    cor: '',
    cca: '',
    stG: '',
    stC: '',
  })
  const deferredFilters = useDeferredValue(filters)

  const loadData = useCallback(async () => {
    setError('')
    try {
      const plannerPromise = fetchAnalistaPlannerDashboard(PLANNER_DAYS).catch((err) => {
        if (err instanceof ApiError && err.status === 401) throw err
        setPlanner(null)
        setPlannerError(err instanceof Error ? err.message : 'Erro ao carregar central operacional')
        return null
      })

      const [processos, ccasOut, plannerOut] = await Promise.all([
        fetchProcessosPaged(PAGE_SIZE, MAX_PAGES),
        fetchCCAs(),
        plannerPromise,
      ])

      setRows(processos.filter(isVisibleInAnalista).map(fromBackend))
      setCcas(ccasOut)
      setPlanner(plannerOut)
      if (plannerOut) setPlannerError('')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err.message)
      } else {
        setError('Erro ao carregar painel')
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const me = await fetchSession()
        const role = norm(me.role)
        if (!['analista', 'gestor', 'gestor_credito', 'admin'].includes(role)) {
          window.location.href = me.home || '/app'
          return
        }
        if (mounted) await loadData()
      } catch {
        navigate('/login', { replace: true })
      }
    })()

    return () => {
      mounted = false
    }
  }, [loadData, navigate])

  useEffect(() => {
    const id = window.setInterval(() => {
      setRefreshTick((prev) => {
        if (prev <= 1) {
          void loadData()
          return REFRESH_SECONDS
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [loadData])

  const filteredRows = useMemo(() => {
    const q = norm(deferredFilters.q)
    const emp = norm(deferredFilters.emp)
    const cor = norm(deferredFilters.cor)
    const cca = norm(deferredFilters.cca)

    return sortCriticalFirst(
      rows.filter((row) => {
        const hitQ = !q || [row.cliente, row.emp, row.corretor, row.cca].some((v) => norm(v).includes(q))
        const hitEmp = !emp || norm(row.emp).includes(emp)
        const hitCor = !cor || norm(row.corretor).includes(cor)
        const hitCca = !cca || norm(row.cca) === cca
        const hitG = !deferredFilters.stG || row.geral === deferredFilters.stG
        const hitC = !deferredFilters.stC || row.repasse === deferredFilters.stC
        return hitQ && hitEmp && hitCor && hitCca && hitG && hitC
      }),
    )
  }, [deferredFilters, rows])

  const kpis = useMemo(() => {
    const countedRows = filteredRows.filter((r) => !r.foraContagemMes)
    const count = (predicate: (row: ProcessoLinha) => boolean) => countedRows.reduce((acc, row) => acc + (predicate(row) ? 1 : 0), 0)

    const total = countedRows.length
    const comercial = count((row) => INSIGHT_COMERCIAL_STAGES.has(statusFromBackend(row.geral)))
    const credito = count((row) => INSIGHT_CREDITO_STAGES.has(statusFromBackend(row.geral)))
    const repasse = count((row) => INSIGHT_REPASSE_STAGES.has(statusFromBackend(row.geral)))
    const assinados = count((row) => statusFromBackend(row.statusCaixa) === 'assinatura_caixa')
    const prios = count((row) => isHighPriority(row))
    const avisoAgehab = count((row) => row.avisoContratoAgehab)

    const avg = (values: number[]) => (values.length ? Math.round(values.reduce((acc, value) => acc + value, 0) / values.length) : 0)
    const avgSlaCor = avg(countedRows.map((row) => Number(row.slaCor || 0)))
    const avgSlaCred = avg(countedRows.map((row) => Number(row.slaCred || 0)))

    return {
      total,
      comercial,
      credito,
      repasse,
      assinados,
      prios,
      avisoAgehab,
      avgSlaCor,
      avgSlaCred,
      outCount: filteredRows.length - countedRows.length,
    }
  }, [filteredRows])

  const executiveView = useMemo(() => {
    const countedRows = filteredRows.filter((row) => !row.foraContagemMes)
    const hottest = countedRows[0] || filteredRows[0] || null
    const pending = countedRows.filter((row) => isPendingRow(row)).length
    const waitingDocs = countedRows.filter((row) => isWaitingDocs(row)).length
    const readyFlow = countedRows.filter((row) => pendingItems(row).length === 0).length
    const finalFlow = countedRows.filter((row) => isFinalizadoRow(row)).length
    const focusRows = countedRows.slice(0, 3)

    return {
      hottest,
      pending,
      waitingDocs,
      readyFlow,
      finalFlow,
      focusRows,
    }
  }, [filteredRows])

  const onChangeFilter = (key: keyof FiltersState, value: string) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    })
  }

  const onClear = () => {
    startTransition(() => {
      setFilters({ q: '', emp: '', cor: '', cca: '', stG: '', stC: '' })
    })
  }

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleRow = (processoId: string) => {
    const nextOpen = !expandedRows[processoId]
    setExpandedRows((prev) => ({ ...prev, [processoId]: nextOpen }))

    if (nextOpen) {
      setActiveRowId(processoId)
      window.setTimeout(() => {
        rowRefs.current[processoId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 90)
      return
    }

    setActiveRowId((prev) => (prev === processoId ? '' : prev))
  }

  const expandAllRows = () => {
    setExpandedRows(Object.fromEntries(filteredRows.map((row) => [row.processoId, true])))
    setActiveRowId(filteredRows[0]?.processoId || '')
  }

  const collapseAllRows = () => {
    setExpandedRows({})
    setActiveRowId('')
  }

  const onLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <main className="dashboard-shell analista-shell">
      <header className="dashboard-top dashboard-top-analista">
        <div className="analista-top-row">
          <div className="top-actions top-actions-analista">
            <span className="badge">Auto refresh: {refreshTick}s</span>
            <span className="badge">SLA alerta: &gt;=48h</span>
            <button type="button" onClick={() => loadData()}>
              Atualizar base
            </button>
            <button type="button" className="danger" onClick={onLogout}>
              Sair
            </button>
          </div>

          <div className="analista-hero-layout">
            <div className="analista-hero">
              <span className="hero-kicker">Operacao de credito</span>
              <h1>Painel do Analista</h1>
              <p>Apresentacao executiva da carteira com leitura comercial, pressão da fila e progresso por cliente em uma unica tela.</p>
            </div>

            <div className="analista-hero-board">
              <article className="hero-spotlight-card">
                <span className="hero-spotlight-label">Foco agora</span>
                <strong>{executiveView.hottest?.cliente || 'Carteira estabilizada'}</strong>
                <p>
                  {executiveView.hottest
                    ? `${labelFor('geral', executiveView.hottest.geral)} • ${nextActionSummary(executiveView.hottest)}`
                    : 'Sem cliente critico no momento.'}
                </p>
              </article>

              <div className="hero-stat-grid">
                <article className="hero-stat-card tone-danger">
                  <span className="hero-stat-label">Pressao imediata</span>
                  <strong>{kpis.prios}</strong>
                  <p>Carteira acima de 15 dias em comercial</p>
                </article>
                <article className="hero-stat-card tone-warn">
                  <span className="hero-stat-label">Pendencias ativas</span>
                  <strong>{executiveView.pending}</strong>
                  <p>Status, documentos, sinal ou fiador fora do ideal</p>
                </article>
                <article className="hero-stat-card tone-ok">
                  <span className="hero-stat-label">Prontos para avancar</span>
                  <strong>{executiveView.readyFlow}</strong>
                  <p>Sem trava principal mapeada na leitura atual</p>
                </article>
                <article className={`hero-stat-card tone-${kpiToneByHours(kpis.avgSlaCred)}`}>
                  <span className="hero-stat-label">SLA medio credito</span>
                  <strong>{formatElapsedHours(kpis.avgSlaCred)}</strong>
                  <p>Media operacional do filtro atual</p>
                </article>
              </div>
            </div>
          </div>

        </div>

        <div className="analista-ribbon">
          <span className="hero-ribbon-item">
            <strong>{kpis.total}</strong>
            <span>ativos em carteira</span>
          </span>
          <span className="hero-ribbon-item">
            <strong>{executiveView.waitingDocs}</strong>
            <span>aguardando documentos</span>
          </span>
          <span className="hero-ribbon-item">
            <strong>{executiveView.finalFlow}</strong>
            <span>em fechamento ou assinatura</span>
          </span>
          {executiveView.focusRows.map((row) => (
            <a key={row.processoId} className="hero-ribbon-link" href={`#cliente-${row.processoId}`}>
              <span>{row.cliente}</span>
              <strong>{labelFor('geral', commercialTimelineKey(row) || row.geral)}</strong>
            </a>
          ))}
        </div>

        <nav className="analista-nav" aria-label="Navegacao do analista">
          {ANALISTA_NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`analista-nav-link ${item.active ? 'is-active' : ''}`}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}
      <SectionShell
        eyebrow="Recorte"
        title="Filtros e atalhos"
        description="Bloco recolhivel para refinar a leitura sem poluir a tela."
        open={sections.filters}
        onToggle={() => toggleSection('filters')}
        aside={<span className="section-inline-note">{ccas.length} CCA(s)</span>}
      >
        <section className="panel-soft analista-filters">
          <div className="filters-grid">
            <label>
              Buscar
              <input value={filters.q} onChange={(e) => onChangeFilter('q', e.target.value)} placeholder="Cliente, obra, corretor" />
            </label>
            <label>
              Empreendimento
              <input value={filters.emp} onChange={(e) => onChangeFilter('emp', e.target.value)} placeholder="AGL30" />
            </label>
            <label>
              Corretor
              <input value={filters.cor} onChange={(e) => onChangeFilter('cor', e.target.value)} placeholder="Nome do corretor" />
            </label>
            <label>
              CCA
              <select value={filters.cca} onChange={(e) => onChangeFilter('cca', e.target.value)}>
                <option value="">Todos</option>
                {ccas.map((name) => (
                  <option key={name} value={norm(name)}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Etapa comercial
              <select value={filters.stG} onChange={(e) => onChangeFilter('stG', e.target.value)}>
                <option value="">Todas</option>
                {COMMERCIAL_FLOW_STEPS.map((step) => (
                  <option key={step.key} value={step.key}>
                    {step.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Etapa repasse
              <select value={filters.stC} onChange={(e) => onChangeFilter('stC', e.target.value)}>
                <option value="">Todas</option>
                <option value="em_repasse">Em Repasse</option>
                <option value="inicio_repasse">Inicio Repasse</option>
                <option value="assinatura_caixa">Assinatura Caixa</option>
                <option value="inicio_garantia">Inicio Garantia</option>
                <option value="sem_repasse">Sem Repasse</option>
              </select>
            </label>
            <div className="filter-actions">
              <button type="button" className="ghost" onClick={onClear}>
                Limpar filtros
              </button>
            </div>
          </div>
        </section>
      </SectionShell>

      <SectionShell
        eyebrow="Visao executiva"
        title="Radar da operacao"
        description="Cartoes de leitura rapida com foco no que exige decisao imediata."
        open={sections.overview}
        onToggle={() => toggleSection('overview')}
        aside={
          <span className="section-inline-note">
            {kpis.total} ativos
            {kpis.outCount > 0 ? ` + ${kpis.outCount} fora do mes` : ''}
          </span>
        }
      >
        <section className="metrics-grid analista-kpis">
          <div className="metric-card tone-neutral">
            <span className="metric-label">Total na fila</span>
            <span className="metric-value">{kpis.total}</span>
            <span className="metric-subtitle">Apos filtros</span>
          </div>
          <div className="metric-card tone-ok">
            <span className="metric-label">Comercial</span>
            <span className="metric-value">{kpis.comercial}</span>
            <span className="metric-subtitle">Em Processo + Venda Finalizada</span>
          </div>
          <div className="metric-card tone-neutral">
            <span className="metric-label">Credito</span>
            <span className="metric-value">{kpis.credito}</span>
            <span className="metric-subtitle">Credito + Secretaria</span>
          </div>
          <div className="metric-card tone-warn">
            <span className="metric-label">Repasse</span>
            <span className="metric-value">{kpis.repasse}</span>
            <span className="metric-subtitle">Assinatura + Sienge + venda</span>
          </div>
          <div className="metric-card tone-ok">
            <span className="metric-label">Assinados</span>
            <span className="metric-value">{kpis.assinados}</span>
            <span className="metric-subtitle">Caixa em assinatura</span>
          </div>
          <div className="metric-card tone-danger">
            <span className="metric-label">Prioridade alta</span>
            <span className="metric-value">{kpis.prios}</span>
            <span className="metric-subtitle">Mais de 15 dias em comercial</span>
          </div>
          <div className="metric-card tone-warn">
            <span className="metric-label">Aviso Agehab</span>
            <span className="metric-value">{kpis.avisoAgehab}</span>
            <span className="metric-subtitle">Pronto para solicitar contrato</span>
          </div>
          <div className={`metric-card tone-${kpiToneByHours(kpis.avgSlaCor)}`}>
            <span className="metric-label">SLA medio comercial</span>
            <span className="metric-value">{formatElapsedHours(kpis.avgSlaCor)}</span>
            <span className="metric-subtitle">Media do filtro</span>
          </div>
          <div className={`metric-card tone-${kpiToneByHours(kpis.avgSlaCred)}`}>
            <span className="metric-label">SLA medio credito</span>
            <span className="metric-value">{formatElapsedHours(kpis.avgSlaCred)}</span>
            <span className="metric-subtitle">Media do filtro</span>
          </div>
        </section>
      </SectionShell>

      <SectionShell
        eyebrow="Operacional"
        title="Central de Operacao do Credito"
        description="Resumo oficial do painel operacional, com leitura compacta para nao roubar altura da fila."
        open={sections.operational}
        onToggle={() => toggleSection('operational')}
        aside={
          <div className="section-actions-inline">
            <a className="section-link" href="/app/analista/acompanhamento-operacional">
              Abrir painel operacional
            </a>
            <span className="section-inline-note">Referencia: {formatDateLabel(planner?.referencia)}</span>
            <span className="section-inline-note">Pendentes: {planner?.pendentes_total ?? 0}</span>
          </div>
        }
      >
        {plannerError ? <div className="error-banner">{plannerError}</div> : null}

        {!planner && !plannerError ? <div className="empty">Carregando central operacional...</div> : null}

        {planner ? (
          <>
            <div className="ops-summary-grid">
              {[
                { title: 'Tarefas do dia', items: planner.tarefas_dia, empty: 'Sem tarefas para hoje.' },
                { title: 'Agendamentos', items: planner.agendamentos_dia, empty: 'Sem agendamentos no dia.' },
                { title: 'Entregas do dia', items: planner.entregas_dia, empty: 'Sem entregas no dia.' },
                { title: 'Tarefas urgentes', items: planner.urgentes, empty: 'Sem urgencias em aberto.' },
              ].map((group) => (
                <article key={group.title} className="ops-summary-card">
                  <div className="ops-summary-head">
                    <h3>{group.title}</h3>
                    <span className="ops-summary-count">{group.items.length}</span>
                  </div>

                  {group.items.length > 0 ? (
                    <div className="ops-summary-list">
                      {group.items.slice(0, 2).map((item) => (
                        <div key={item.id} className="ops-summary-item">
                          <div className="ops-summary-title-row">
                            <strong>{plannerCardTitle(item)}</strong>
                            <span className={`ops-state ${plannerStatusTone(item.status)}`}>
                              {plannerStatusLabel(item.status)}
                            </span>
                          </div>
                          {plannerCardDescription(item) ? <p>{plannerCardDescription(item)}</p> : null}
                          <span className="ops-summary-meta">{plannerMeta(item)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ops-empty">{group.empty}</div>
                  )}
                </article>
              ))}
            </div>

            <div className="ops-summary-bottom">
              <article className="ops-summary-card ops-summary-card-wide">
                <div className="ops-summary-head">
                  <h3>Evolucao da equipe</h3>
                  <span className="ops-summary-count">{planner.evolucao_time.length}</span>
                </div>

                {planner.evolucao_time.length > 0 ? (
                  <div className="ops-evolution-list">
                    {planner.evolucao_time.slice(0, 4).map((item) => (
                      <div key={item.responsavel} className="ops-evolution-row">
                        <div className="ops-evolution-top">
                          <strong>{item.responsavel}</strong>
                          <span>
                            {item.concluidas}/{item.total} concluidas
                          </span>
                        </div>
                        <div className="ops-evolution-bar">
                          <span style={{ width: `${Math.max(0, Math.min(100, Number(item.taxa_conclusao || 0)))}%` }} />
                        </div>
                        <span className="ops-summary-meta">
                          {item.progresso_medio}% medio | {item.pendentes} pendentes
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ops-empty">Sem dados de evolucao no momento.</div>
                )}
              </article>

              <article className="ops-summary-card">
                <div className="ops-summary-head">
                  <h3>Anotacoes</h3>
                  <span className="ops-summary-count">{planner.anotacoes.length}</span>
                </div>

                {planner.anotacoes.length > 0 ? (
                  <div className="ops-summary-list">
                    {planner.anotacoes.slice(0, 3).map((item) => (
                      <div key={item.id} className="ops-summary-item">
                        <div className="ops-summary-title-row">
                          <strong>{item.titulo}</strong>
                          <span className="ops-state neutral">Anotacao</span>
                        </div>
                        {item.descricao ? <p>{item.descricao}</p> : null}
                        <span className="ops-summary-meta">
                          {item.updated_by_username || item.created_by_username || '-'} • {formatDateLabel(item.updated_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ops-empty">Nenhuma anotacao registrada.</div>
                )}
              </article>
            </div>
          </>
        ) : null}
      </SectionShell>

      <SectionShell
        eyebrow="Fila viva"
        title="Fluxo do cliente"
        description="Cards com sombra, recuo visual e detalhes sob demanda por cliente."
        open={sections.queue}
        onToggle={() => toggleSection('queue')}
        aside={
          <div className="section-actions-inline">
            <span className="section-inline-note">
              {Math.max(0, filteredRows.length - kpis.outCount)} processo(s)
              {kpis.outCount > 0 ? ` + ${kpis.outCount} fora da contagem` : ''}
            </span>
            <button type="button" className="mini-action" onClick={expandAllRows}>
              Abrir todos
            </button>
            <button type="button" className="mini-action" onClick={collapseAllRows}>
              Fechar todos
            </button>
          </div>
        }
      >
        {loading ? <div className="empty">Carregando...</div> : null}
        {!loading && filteredRows.length === 0 ? <div className="empty">Nenhum resultado com esses filtros.</div> : null}

        {!loading && filteredRows.length > 0 ? (
          <div className="client-card-stack">
            {filteredRows.map((row) => {
              const expanded = Boolean(expandedRows[row.processoId])
              const animState = clientAnimState(row)
              const rowClass = row.foraContagemMes ? 'row-out' : isFinalizadoRow(row) ? 'row-final' : ''
              const comercialKey = commercialTimelineKey(row)
              const repasseKey = repasseTimelineKey(row)
              const comercialLabel = comercialKey ? labelFor('geral', comercialKey) : labelFor('geral', row.geral)
              const repasseLabel = repasseKey ? labelFor('repasse', repasseKey) : labelFor('repasse', row.repasse)
              const pendencias = pendingItems(row)
              const isFocused = activeRowId === row.processoId

              return (
                <article
                  key={row.processoId}
                  ref={(node) => {
                    rowRefs.current[row.processoId] = node
                  }}
                  id={`cliente-${row.processoId}`}
                  className={`client-card ${rowClass} ${expanded ? 'is-open' : ''} ${isFocused ? 'is-focused' : ''}`.trim()}
                >
                  <div className="client-card-header">
                    <div className="client-card-copy">
                      <div className="client-name-row">
                        <span className={`anim-dot ${animState}`} aria-hidden="true" />
                        <a href={`/app/analise?processo_id=${encodeURIComponent(row.processoId)}`}>{row.cliente}</a>
                        {expanded ? <span className="client-focus-flag">Cliente em foco</span> : null}
                      </div>
                      <span className="meta-line">{row.emp}</span>
                      <span className="meta-line">{row.corretor}</span>
                      <div className="client-assignee-row">
                        <span className="client-assignee-label">CCA responsavel</span>
                        <span className="client-assignee-value">{row.cca || '-'}</span>
                      </div>
                      <div className="badges-row">
                        {isHighPriority(row) ? <span className="chip danger">Prioridade alta</span> : null}
                        {row.avisoContratoAgehab ? <span className="chip warn">Solicitar contrato Agehab</span> : null}
                        {row.foraContagemMes ? <span className="chip bad">Fora da contagem do mes</span> : null}
                      </div>
                    </div>

                    <div className="client-card-tools">
                      <div className="sla-cluster">
                        <span className={`status-pill ${kpiToneByHours(row.slaCor)}`}>Comercial {formatElapsedHours(row.slaCor)}</span>
                        <span className={`status-pill ${kpiToneByHours(row.slaCred)}`}>Credito {formatElapsedHours(row.slaCred)}</span>
                      </div>
                      <button
                        type="button"
                        className={`client-expand ${expanded ? 'is-open' : ''}`}
                        onClick={() => toggleRow(row.processoId)}
                        aria-expanded={expanded}
                      >
                        {expanded ? 'Fechar detalhes' : 'Abrir detalhes'}
                      </button>
                    </div>
                  </div>

                  <div className="client-flow-stack">
                    <div className="client-story-grid">
                      <article className="client-story-card tone-neutral">
                        <span className="client-story-label">Momento do cliente</span>
                        <strong>{comercialLabel}</strong>
                        <p>{nextActionSummary(row)}</p>
                      </article>
                      <article className={`client-story-card ${pendencias.length > 0 ? 'tone-danger' : 'tone-ok'}`}>
                        <span className="client-story-label">Leitura executiva</span>
                        <strong>{pendencias.length > 0 ? pendencias[0] : 'Fluxo alinhado'}</strong>
                        <p>{pendencias.length > 1 ? `${pendencias.length} travas mapeadas na linha` : 'Sem pendencia principal neste momento'}</p>
                      </article>
                      <article className={`client-story-card ${row.semDocumento ? 'tone-warn' : 'tone-neutral'}`}>
                        <span className="client-story-label">Documentos</span>
                        <strong>{row.docsRecebidos}/{row.docsTotal}</strong>
                        <p>{documentsSummary(row)}</p>
                      </article>
                      <article className="client-story-card tone-neutral">
                        <span className="client-story-label">Observacao</span>
                        <strong>{row.observacao ? 'Atualizada' : 'Sem nota'}</strong>
                        <p>{summarizeObservation(row)}</p>
                      </article>
                    </div>

                    <MiniTimeline
                      tone="commercial"
                      laneLabel="Comercial"
                      currentLabel={comercialLabel}
                      currentKey={comercialKey}
                      steps={COMMERCIAL_FLOW_STEPS}
                      tooltipForStep={(step) => timelineTooltip(row, 'Comercial', step)}
                    />
                    <MiniTimeline
                      tone="repasse"
                      laneLabel="Repasse"
                      currentLabel={repasseLabel}
                      currentKey={repasseKey}
                      steps={REPASSE_FLOW_STEPS}
                      tooltipForStep={(step) => timelineTooltip(row, 'Repasse', step)}
                    />
                  </div>

                  {expanded ? (
                    <div className="client-card-details">
                      <div className="detail-grid">
                        <div className="detail-block">
                          <span className="detail-label">Caixa</span>
                          <span className={`status-pill ${classForStatus(row.statusCaixa)}`}>{labelFor('statusCaixa', row.statusCaixa)}</span>
                        </div>
                        <div className="detail-block">
                          <span className="detail-label">Agehab</span>
                          <span className={`status-pill ${classForStatus(row.statusAgehab)}`}>{labelFor('statusAgehab', row.statusAgehab)}</span>
                        </div>
                        <div className="detail-block">
                          <span className="detail-label">Sinal</span>
                          <span className={`status-pill ${classForStatus(row.sinal)}`}>{labelFor('sinal', row.sinal)}</span>
                        </div>
                        <div className="detail-block">
                          <span className="detail-label">Fiador</span>
                          <span className={`status-pill ${classForStatus(row.fiador)}`}>{labelFor('fiador', row.fiador)}</span>
                        </div>
                        <div className="detail-block">
                          <span className="detail-label">SLA CCA</span>
                          <span className={`status-pill ${kpiToneByHours(row.slaCca)}`}>{formatElapsedHours(row.slaCca)}</span>
                        </div>
                        <div className="detail-block">
                          <span className="detail-label">Aging</span>
                          <span className="status-pill neutral">{formatElapsedHours(openHours(row))}</span>
                        </div>
                      </div>

                      <div className="detail-subpanel">
                        <h3>Falta para avancar</h3>
                        {pendencias.length > 0 ? (
                          <ul className="detail-list">
                            {pendencias.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="detail-empty">Sem pendencias principais neste momento.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : null}
      </SectionShell>
    </main>
  )
}
