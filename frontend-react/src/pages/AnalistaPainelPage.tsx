import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, fetchCCAs, fetchProcessosPaged, fetchSession, logout } from '../lib/api'
import { TimelineLane, type TimelineStep } from '../components/TimelineLane'
import type { ProcessoApiItem, ProcessoLinha } from '../types'

const REFRESH_SECONDS = 60
const PAGE_SIZE = 120
const MAX_PAGES = 20
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
  { label: 'Painel React', href: '/app/analista', active: true },
  { label: 'Acompanhamento', href: '/app/analista/acompanhamento' },
  { label: 'Reuniao Comercial', href: '/app/analista/reuniao-comercial' },
  { label: 'Operacional', href: '/app/analista/acompanhamento-operacional' },
  { label: 'Repasse', href: '/app/analista/repasse' },
  { label: 'Importacao', href: '/app/analista/importacao' },
  { label: 'Arquivados', href: '/app/analista/arquivados' },
  { label: 'Legado', href: '/app/analista/legado' },
]

const FLOW_COMMERCIAL_KEYS = new Set(COMMERCIAL_FLOW_STEPS.map((step) => step.key))

const READY_STATUS = {
  statusCaixa: new Set(['aprovado', 'dar_qv', 'conforme', 'assinatura_caixa', 'finalizado']),
  statusAgehab: new Set(['validado_agehab', 'conforme', 'finalizado']),
  sinal: new Set(['pago']),
  fiador: new Set(['finalizado']),
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
  },
  statusAgehab: {
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

interface LaneSnapshot {
  counts: Record<string, number>
  currentKey: string
  doneKeys: string[]
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

function isVisibleInAnalista(item: ProcessoApiItem): boolean {
  const statusGeral = statusFromBackend(item.status_geral)
  return statusGeral !== 'cancelado' && statusGeral !== 'distrato'
}

function fromBackend(item: ProcessoApiItem): ProcessoLinha {
  const semDocumento = Boolean(item?.sem_documento_enviado)
  const statusCaixa = semDocumento ? 'nao_iniciado' : statusFromBackend(item.status_cca || 'analise_credito')
  const statusAgehab = semDocumento ? 'nao_iniciado' : statusFromBackend(item.status_agehab || 'analise_credito')

  return {
    processoId: item.processo_id,
    cliente: item.cliente_nome || '-',
    emp: item.obra || '-',
    corretor: item.corretor || '-',
    cca: item.cca_responsavel || '-',
    geral: statusFromBackend(item.estagio_comercial || item.status_geral),
    repasse: statusFromBackend(item.etapa_repasse || 'sem_repasse'),
    statusCaixa,
    statusAgehab,
    sinal: statusFromBackend(item.status_sinal || 'nao_tem'),
    fiador: statusFromBackend(item.status_fiador || 'nao_tem'),
    slaCor: readSlaHours(item, 'sla_corretor_horas', 'sla_corretor_dias'),
    slaCred: readSlaHours(item, 'sla_analista_horas', 'sla_credito_dias'),
    slaCca: readSlaHours(item, 'sla_cca_horas', 'sla_cca_dias'),
    dataCadastroOrigem: item.data_reserva_origem || item.data_cadastro_origem || null,
    createdAt: item.created_at || null,
    semDocumento,
    foraContagemMes: Boolean(item?.nao_contar_mes),
    avisoContratoAgehab:
      Boolean(item?.aviso_gerar_contrato_agehab) &&
      !semDocumento &&
      statusFromBackend(item.status_agehab) === 'validado_agehab',
  }
}

function labelFor(area: keyof typeof LABELS, value: string): string {
  const key = statusFromBackend(value)
  return LABELS[area]?.[key] || value || '-'
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
  const items: string[] = []
  if (!isResolved('statusCaixa', row.statusCaixa)) items.push(`Caixa: ${labelFor('statusCaixa', row.statusCaixa)}`)
  if (!isResolved('statusAgehab', row.statusAgehab)) items.push(`Agehab: ${labelFor('statusAgehab', row.statusAgehab)}`)
  if (!isResolved('sinal', row.sinal)) items.push(`Sinal: ${labelFor('sinal', row.sinal)}`)
  if (!isResolved('fiador', row.fiador)) items.push(`Fiador: ${labelFor('fiador', row.fiador)}`)
  return items
}

function commercialTimelineKey(row: ProcessoLinha): string {
  const geral = statusFromBackend(row.geral)
  return FLOW_COMMERCIAL_KEYS.has(geral) ? geral : ''
}

function repasseTimelineKey(row: ProcessoLinha): string {
  const repasse = statusFromBackend(row.repasse)
  const caixa = statusFromBackend(row.statusCaixa)
  const agehab = statusFromBackend(row.statusAgehab)

  if (agehab === 'validado_agehab' || caixa === 'finalizado') return 'inicio_garantia'
  if (caixa === 'assinatura_caixa' || repasse === 'assinatura_autorizada') return 'assinatura_caixa'
  if (repasse === 'inicio_repasse') return 'inicio_repasse'
  if (repasse === 'em_repasse') return 'em_repasse'
  return ''
}

function buildLaneSnapshot(
  rows: ProcessoLinha[],
  steps: TimelineStep[],
  valueGetter: (row: ProcessoLinha) => string,
): LaneSnapshot {
  const counts = Object.fromEntries(steps.map((step) => [step.key, 0])) as Record<string, number>
  const stageIndex = new Map(steps.map((step, index) => [step.key, index]))

  for (const row of rows) {
    if (row.foraContagemMes) continue
    const key = statusFromBackend(valueGetter(row))
    if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1
  }

  const activeEntries = steps
    .map((step) => ({ key: step.key, value: counts[step.key] || 0 }))
    .filter((entry) => entry.value > 0)

  if (activeEntries.length === 0) {
    return {
      counts,
      currentKey: steps[0]?.key ?? '',
      doneKeys: [],
    }
  }

  activeEntries.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value
    return (stageIndex.get(a.key) ?? 0) - (stageIndex.get(b.key) ?? 0)
  })

  const currentKey = activeEntries[0].key
  const currentIndex = stageIndex.get(currentKey) ?? 0
  return {
    counts,
    currentKey,
    doneKeys: steps.slice(0, currentIndex).map((step) => step.key),
  }
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

function MiniTimeline({ tone, laneLabel, currentLabel, currentKey, steps }: MiniTimelineProps) {
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

          return (
            <div key={step.key} className={`mini-flow-step ${state}`}>
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
  const [rows, setRows] = useState<ProcessoLinha[]>([])
  const [ccas, setCcas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshTick, setRefreshTick] = useState(REFRESH_SECONDS)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [sections, setSections] = useState({
    overview: true,
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
      const [processos, ccasOut] = await Promise.all([
        fetchProcessosPaged(PAGE_SIZE, MAX_PAGES),
        fetchCCAs(),
      ])

      setRows(processos.filter(isVisibleInAnalista).map(fromBackend))
      setCcas(ccasOut)
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

  const laneSnapshot = useMemo(
    () => buildLaneSnapshot(filteredRows, COMMERCIAL_FLOW_STEPS, (row) => row.geral),
    [filteredRows],
  )

  const repasseSnapshot = useMemo(
    () => buildLaneSnapshot(filteredRows, REPASSE_FLOW_STEPS, repasseTimelineKey),
    [filteredRows],
  )

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
    setExpandedRows((prev) => ({ ...prev, [processoId]: !prev[processoId] }))
  }

  const expandAllRows = () => {
    setExpandedRows(Object.fromEntries(filteredRows.map((row) => [row.processoId, true])))
  }

  const collapseAllRows = () => {
    setExpandedRows({})
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
        <div className="analista-hero">
          <span className="hero-kicker">Operacao de credito</span>
          <h1>Painel do Analista</h1>
          <p>Painel React com profundidade visual, blocos recolhiveis e leitura mais profissional da fila.</p>
        </div>

        <div className="top-actions">
          <span className="badge">Auto refresh: {refreshTick}s</span>
          <span className="badge">SLA alerta: &gt;=48h</span>
          <button type="button" onClick={() => loadData()}>
            Atualizar base
          </button>
          <button type="button" className="danger" onClick={onLogout}>
            Sair
          </button>
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
                <option value="assinatura_autorizada">Assinatura Autorizada</option>
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
        description="Cartoes de leitura rapida com profundidade e trilhos consolidados das duas frentes."
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
            <span className="metric-value">{kpis.avgSlaCor}h</span>
            <span className="metric-subtitle">Media do filtro</span>
          </div>
          <div className={`metric-card tone-${kpiToneByHours(kpis.avgSlaCred)}`}>
            <span className="metric-label">SLA medio credito</span>
            <span className="metric-value">{kpis.avgSlaCred}h</span>
            <span className="metric-subtitle">Media do filtro</span>
          </div>
        </section>

        <div className="overview-grid">
          <section className="timeline-strip timeline-card tone-commercial">
            <div className="timeline-strip-head">
              <h2>Fluxo comercial</h2>
              <span>
                Etapa foco: <strong>{labelFor('geral', laneSnapshot.currentKey)}</strong>
              </span>
            </div>
            <TimelineLane
              title="Comercial"
              steps={COMMERCIAL_FLOW_STEPS}
              currentKey={laneSnapshot.currentKey}
              doneKeys={laneSnapshot.doneKeys}
              height={62}
            />
            <div className="timeline-legend">
              {COMMERCIAL_FLOW_STEPS.map((step) => (
                <span key={step.key} className={`timeline-chip ${step.key === laneSnapshot.currentKey ? 'active' : ''}`}>
                  {step.label}: <strong>{laneSnapshot.counts[step.key] ?? 0}</strong>
                </span>
              ))}
            </div>
          </section>

          <section className="timeline-strip timeline-card tone-repasse">
            <div className="timeline-strip-head">
              <h2>Fluxo repasse</h2>
              <span>
                Etapa foco: <strong>{labelFor('repasse', repasseSnapshot.currentKey)}</strong>
              </span>
            </div>
            <TimelineLane
              title="Repasse"
              steps={REPASSE_FLOW_STEPS}
              currentKey={repasseSnapshot.currentKey}
              doneKeys={repasseSnapshot.doneKeys}
              height={62}
            />
            <div className="timeline-legend">
              {REPASSE_FLOW_STEPS.map((step) => (
                <span key={step.key} className={`timeline-chip ${step.key === repasseSnapshot.currentKey ? 'active' : ''}`}>
                  {step.label}: <strong>{repasseSnapshot.counts[step.key] ?? 0}</strong>
                </span>
              ))}
            </div>
          </section>
        </div>
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

              return (
                <article key={row.processoId} className={`client-card ${rowClass} ${expanded ? 'is-open' : ''}`.trim()}>
                  <div className="client-card-header">
                    <div className="client-card-copy">
                      <div className="client-name-row">
                        <span className={`anim-dot ${animState}`} aria-hidden="true" />
                        <a href={`/app/analise?processo_id=${encodeURIComponent(row.processoId)}`}>{row.cliente}</a>
                      </div>
                      <span className="meta-line">{row.emp}</span>
                      <span className="meta-line">{row.corretor}</span>
                      <div className="badges-row">
                        <span className="chip">CCA {row.cca || '-'}</span>
                        {row.foraContagemMes ? <span className="chip bad">Fora da contagem do mes</span> : null}
                        {isHighPriority(row) ? <span className="chip danger">Prioridade alta</span> : null}
                        {row.avisoContratoAgehab ? <span className="chip warn">Solicitar contrato Agehab</span> : null}
                      </div>
                    </div>

                    <div className="client-card-tools">
                      <div className="sla-cluster">
                        <span className={`status-pill ${kpiToneByHours(row.slaCor)}`}>Comercial {row.slaCor}h</span>
                        <span className={`status-pill ${kpiToneByHours(row.slaCred)}`}>Credito {row.slaCred}h</span>
                      </div>
                      <button type="button" className="client-expand" onClick={() => toggleRow(row.processoId)} aria-expanded={expanded}>
                        {expanded ? 'Fechar detalhes' : 'Abrir detalhes'}
                      </button>
                    </div>
                  </div>

                  <div className="client-flow-stack">
                    <MiniTimeline
                      tone="commercial"
                      laneLabel="Comercial"
                      currentLabel={comercialLabel}
                      currentKey={comercialKey}
                      steps={COMMERCIAL_FLOW_STEPS}
                    />
                    <MiniTimeline
                      tone="repasse"
                      laneLabel="Repasse"
                      currentLabel={repasseLabel}
                      currentKey={repasseKey}
                      steps={REPASSE_FLOW_STEPS}
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
                          <span className={`status-pill ${kpiToneByHours(row.slaCca)}`}>{row.slaCca}h</span>
                        </div>
                        <div className="detail-block">
                          <span className="detail-label">Aging</span>
                          <span className="status-pill neutral">{openDays(row)} dias</span>
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
