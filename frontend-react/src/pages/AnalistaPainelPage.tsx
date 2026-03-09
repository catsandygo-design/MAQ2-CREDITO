import { useCallback, useEffect, useMemo, useState } from 'react'
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

type DiagnosticArea = 'statusCaixa' | 'statusAgehab' | 'sinal' | 'fiador'
type LaneArea = 'geral' | 'repasse'

const READY_STATUS: Record<DiagnosticArea, Set<string>> = {
  statusCaixa: new Set(['aprovado', 'dar_qv', 'conforme', 'assinatura_caixa', 'finalizado']),
  statusAgehab: new Set(['validado_agehab', 'conforme', 'finalizado']),
  sinal: new Set(['pago']),
  fiador: new Set(['finalizado']),
}

function isResolved(area: DiagnosticArea, value: string): boolean {
  return READY_STATUS[area].has(statusFromBackend(value))
}

function pendingItems(row: ProcessoLinha): string[] {
  const items: string[] = []
  if (!isResolved('statusCaixa', row.statusCaixa)) items.push(`CCA: ${labelFor('statusCaixa', row.statusCaixa)}`)
  if (!isResolved('statusAgehab', row.statusAgehab)) items.push(`Agehab: ${labelFor('statusAgehab', row.statusAgehab)}`)
  if (!isResolved('sinal', row.sinal)) items.push(`Sinal: ${labelFor('sinal', row.sinal)}`)
  if (!isResolved('fiador', row.fiador)) items.push(`Fiador: ${labelFor('fiador', row.fiador)}`)
  return items
}

function summarizeAreaStatus(rows: ProcessoLinha[], area: DiagnosticArea): string {
  const counter = new Map<string, number>()
  rows.forEach((row) => {
    const label = labelFor(area, row[area])
    counter.set(label, (counter.get(label) || 0) + 1)
  })
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, qty]) => `${label} (${qty})`)
    .join(', ')
}

function buildLaneStepTooltip(area: LaneArea, stepKey: string, stepRows: ProcessoLinha[]): string {
  const stepLabel = labelFor(area, stepKey)
  if (!stepRows.length) {
    return `${stepLabel}\nSem processos nesta etapa.`
  }

  const pendCca = stepRows.filter((row) => !isResolved('statusCaixa', row.statusCaixa)).length
  const pendAgehab = stepRows.filter((row) => !isResolved('statusAgehab', row.statusAgehab)).length
  const pendSinal = stepRows.filter((row) => !isResolved('sinal', row.sinal)).length
  const pendFiador = stepRows.filter((row) => !isResolved('fiador', row.fiador)).length

  return [
    `${stepLabel}`,
    `Processos na etapa: ${stepRows.length}`,
    'Falta para avancar:',
    `- CCA: ${pendCca}`,
    `- Agehab: ${pendAgehab}`,
    `- Sinal: ${pendSinal}`,
    `- Fiador: ${pendFiador}`,
    `CCA (top): ${summarizeAreaStatus(stepRows, 'statusCaixa') || '-'}`,
    `Agehab (top): ${summarizeAreaStatus(stepRows, 'statusAgehab') || '-'}`,
    `Sinal (top): ${summarizeAreaStatus(stepRows, 'sinal') || '-'}`,
    `Fiador (top): ${summarizeAreaStatus(stepRows, 'fiador') || '-'}`,
  ].join('\n')
}

function buildProcessTooltip(row: ProcessoLinha, stateText: string): string {
  const pendencias = pendingItems(row)
  const pendenciasText = pendencias.length ? pendencias.map((item) => `- ${item}`).join('\n') : '- Sem pendencias principais'
  return [
    `${row.cliente || 'Processo'}`,
    `Status: ${stateText}`,
    `Comercial: ${labelFor('geral', row.geral)}`,
    `Repasse: ${labelFor('repasse', row.repasse)}`,
    `CCA: ${labelFor('statusCaixa', row.statusCaixa)}`,
    `Agehab: ${labelFor('statusAgehab', row.statusAgehab)}`,
    `Sinal: ${labelFor('sinal', row.sinal)}`,
    `Fiador: ${labelFor('fiador', row.fiador)}`,
    'Falta para avancar:',
    pendenciasText,
  ].join('\n')
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
  area: LaneArea,
  steps: TimelineStep[],
  valueGetter: (row: ProcessoLinha) => string,
): { counts: Record<string, number>; currentKey: string; doneKeys: string[]; tooltips: Record<string, string> } {
  const counts = Object.fromEntries(steps.map((step) => [step.key, 0])) as Record<string, number>
  const rowsByStep = Object.fromEntries(steps.map((step) => [step.key, [] as ProcessoLinha[]])) as Record<string, ProcessoLinha[]>
  const stageIndex = new Map(steps.map((step, index) => [step.key, index]))

  for (const row of rows) {
    if (row.foraContagemMes) continue
    const key = statusFromBackend(valueGetter(row))
    if (Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key] += 1
      rowsByStep[key].push(row)
    }
  }

  const tooltips = Object.fromEntries(
    steps.map((step) => [step.key, buildLaneStepTooltip(area, step.key, rowsByStep[step.key] || [])]),
  ) as Record<string, string>

  const activeEntries = steps
    .map((step) => ({ key: step.key, value: counts[step.key] || 0 }))
    .filter((entry) => entry.value > 0)

  if (activeEntries.length === 0) {
    return {
      counts,
      currentKey: steps[0]?.key ?? '',
      doneKeys: [],
      tooltips,
    }
  }

  activeEntries.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value
    const ai = stageIndex.get(a.key) ?? 0
    const bi = stageIndex.get(b.key) ?? 0
    return ai - bi
  })

  const currentKey = activeEntries[0].key
  const currentIdx = stageIndex.get(currentKey) ?? 0
  const doneKeys = steps.slice(0, currentIdx).map((step) => step.key)
  return { counts, currentKey, doneKeys, tooltips }
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

function clientAnimTitle(state: 'pause' | 'rest' | 'panic' | 'wait' | 'progress'): string {
  if (state === 'pause') return 'Fora da contagem do mes atual'
  if (state === 'wait') return 'Aguardando documento'
  if (state === 'panic') return 'Pendenciado'
  if (state === 'rest') return 'Processo finalizado'
  return 'Em analise'
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

export function AnalistaPainelPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<ProcessoLinha[]>([])
  const [ccas, setCcas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshTick, setRefreshTick] = useState(REFRESH_SECONDS)

  const [filters, setFilters] = useState<FiltersState>({
    q: '',
    emp: '',
    cor: '',
    cca: '',
    stG: '',
    stC: '',
  })

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
    const q = norm(filters.q)
    const emp = norm(filters.emp)
    const cor = norm(filters.cor)
    const cca = norm(filters.cca)

    return sortCriticalFirst(
      rows.filter((row) => {
        const hitQ = !q || [row.cliente, row.emp, row.corretor, row.cca].some((v) => norm(v).includes(q))
        const hitEmp = !emp || norm(row.emp).includes(emp)
        const hitCor = !cor || norm(row.corretor).includes(cor)
        const hitCca = !cca || norm(row.cca) === cca
        const hitG = !filters.stG || row.geral === filters.stG
        const hitC = !filters.stC || row.repasse === filters.stC
        return hitQ && hitEmp && hitCor && hitCca && hitG && hitC
      }),
    )
  }, [filters, rows])

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
    () => buildLaneSnapshot(filteredRows, 'geral', COMMERCIAL_FLOW_STEPS, (row) => row.geral),
    [filteredRows],
  )
  const repasseLaneSnapshot = useMemo(
    () => buildLaneSnapshot(filteredRows, 'repasse', REPASSE_FLOW_STEPS, repasseTimelineKey),
    [filteredRows],
  )

  const onChangeFilter = (key: keyof FiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const onApplyFilters = () => {
    setFilters((prev) => ({ ...prev }))
  }

  const onClear = () => {
    setFilters({ q: '', emp: '', cor: '', cca: '', stG: '', stC: '' })
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
      <header className="dashboard-top">
        <div>
          <h1>Painel do Analista (React)</h1>
          <p>Migracao em andamento: leitura, filtros, indicadores e fila sincronizados com API atual.</p>
        </div>

        <div className="top-actions">
          <span className="badge">Auto refresh: {refreshTick}s</span>
          <span className="badge">SLA alerta: &gt;=48h</span>
          <button type="button" onClick={() => loadData()}>
            Atualizar
          </button>
          <a href="/app/analista" className="ghost-link">
            Tela Legada
          </a>
          <button type="button" className="danger" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <section className="panel analista-filters">
        <div className="filters-grid">
          <label>
            Buscar (cliente / empreendimento / corretor)
            <input value={filters.q} onChange={(e) => onChangeFilter('q', e.target.value)} placeholder="Ex: REBECA, AGL30" />
          </label>
          <label>
            Empreendimento
            <input value={filters.emp} onChange={(e) => onChangeFilter('emp', e.target.value)} placeholder="AGL30" />
          </label>
          <label>
            Corretor
            <input value={filters.cor} onChange={(e) => onChangeFilter('cor', e.target.value)} placeholder="Gabriela" />
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
            Comercial
            <select value={filters.stG} onChange={(e) => onChangeFilter('stG', e.target.value)}>
              <option value="">Todos</option>
              <option value="reserva">Reserva</option>
              <option value="em_processo">Em Processo</option>
              <option value="credito">Credito</option>
              <option value="secretaria_vendas">Secretaria de Vendas</option>
              <option value="assinatura_diretoria">Assinatura Diretoria</option>
              <option value="autorizacao_diretoria">Aprovacao Diretoria</option>
              <option value="envio_sienge">Envio Sienge</option>
              <option value="venda_finalizada">Venda Finalizada</option>
            </select>
          </label>
          <label>
            Etapa repasse
            <select value={filters.stC} onChange={(e) => onChangeFilter('stC', e.target.value)}>
              <option value="">Todos</option>
              <option value="em_repasse">Em Repasse</option>
              <option value="inicio_repasse">Inicio Repasse</option>
              <option value="assinatura_autorizada">Assinatura Autorizada</option>
              <option value="sem_repasse">Sem Repasse</option>
            </select>
          </label>
          <div className="filter-actions">
            <button type="button" onClick={onApplyFilters}>
              Filtrar
            </button>
            <button type="button" className="ghost" onClick={onClear}>
              Limpar
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

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
          <span className="metric-subtitle">Credito + Secretaria de Vendas</span>
        </div>
        <div className="metric-card tone-warn">
          <span className="metric-label">Repasse</span>
          <span className="metric-value">{kpis.repasse}</span>
          <span className="metric-subtitle">Assinatura + Aprovacao + Sienge + Venda Finalizada</span>
        </div>
        <div className="metric-card tone-ok">
          <span className="metric-label">Assinados</span>
          <span className="metric-value">{kpis.assinados}</span>
          <span className="metric-subtitle">Status Caixa = Assinatura Caixa</span>
        </div>
        <div className="metric-card tone-danger">
          <span className="metric-label">Prioridade alta</span>
          <span className="metric-value">{kpis.prios}</span>
          <span className="metric-subtitle">Comercial acima de 15 dias</span>
        </div>
        <div className="metric-card tone-warn">
          <span className="metric-label">Aviso Agehab</span>
          <span className="metric-value">{kpis.avisoAgehab}</span>
          <span className="metric-subtitle">Agehab validado: solicitar contrato</span>
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

      <section className="panel timeline-strip">
        <div className="timeline-strip-head">
          <h2>Fluxo comercial</h2>
          <span>
            Etapa foco: <strong>{labelFor('geral', laneSnapshot.currentKey)}</strong>
          </span>
        </div>
        <TimelineLane
          hideTitle
          steps={COMMERCIAL_FLOW_STEPS}
          currentKey={laneSnapshot.currentKey}
          doneKeys={laneSnapshot.doneKeys}
          stepTooltips={laneSnapshot.tooltips}
          height={58}
          showArrow={false}
        />
        <div className="timeline-strip-head repasse">
          <h2>Fluxo repasse</h2>
          <span>
            Etapa foco: <strong>{labelFor('repasse', repasseLaneSnapshot.currentKey)}</strong>
          </span>
        </div>
        <TimelineLane
          hideTitle
          steps={REPASSE_FLOW_STEPS}
          currentKey={repasseLaneSnapshot.currentKey}
          doneKeys={repasseLaneSnapshot.doneKeys}
          stepTooltips={repasseLaneSnapshot.tooltips}
          height={58}
          showArrow={false}
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Fila de Processos</h2>
          <span>
            {Math.max(0, filteredRows.length - kpis.outCount)} processo(s)
            {kpis.outCount > 0 ? ` + ${kpis.outCount} fora da contagem` : ''}
          </span>
        </div>

        {loading ? <div className="empty">Carregando...</div> : null}
        {!loading && filteredRows.length === 0 ? <div className="empty">Nenhum resultado com esses filtros.</div> : null}

        {!loading && filteredRows.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>CCA</th>
                  <th>Comercial</th>
                  <th>Repasse</th>
                  <th>Status Caixa</th>
                  <th>Status Agehab</th>
                  <th>Sinal</th>
                  <th>Fiador</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const animState = clientAnimState(row)
                  const processTooltip = buildProcessTooltip(row, clientAnimTitle(animState))
                  const geralClass = classForStatus(row.geral)
                  const repasseClass = classForStatus(row.repasse)
                  const caixaClass = classForStatus(row.statusCaixa)
                  const agehabClass = classForStatus(row.statusAgehab)
                  const sinalClass = classForStatus(row.sinal)
                  const fiadorClass = classForStatus(row.fiador)
                  const rowClass = row.foraContagemMes ? 'row-out' : isFinalizadoRow(row) ? 'row-final' : ''

                  return (
                    <tr key={row.processoId} className={rowClass}>
                      <td>
                        <div className="client-col">
                          <div className="client-name-row">
                            <span className={`anim-dot ${animState}`} title={processTooltip} aria-hidden="true" />
                            <a href={`/app/analise?processo_id=${encodeURIComponent(row.processoId)}`}>{row.cliente}</a>
                          </div>
                          <span className="meta-line">{row.emp}</span>
                          <span className="meta-line">{row.corretor}</span>
                          <div className="badges-row">
                            {row.foraContagemMes ? <span className="chip bad">Fora da contagem do mes</span> : null}
                            {isHighPriority(row) ? <span className="chip danger">Prioridade alta</span> : null}
                            {row.avisoContratoAgehab ? <span className="chip warn">Solicitar contrato Agehab</span> : null}
                          </div>
                        </div>
                      </td>
                      <td>{row.cca}</td>
                      <td>
                        <span className={`status-pill ${geralClass}`}>{labelFor('geral', row.geral)}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${repasseClass}`}>{labelFor('repasse', row.repasse)}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${caixaClass}`}>{labelFor('statusCaixa', row.statusCaixa)}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${agehabClass}`}>{labelFor('statusAgehab', row.statusAgehab)}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${sinalClass}`}>{labelFor('sinal', row.sinal)}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${fiadorClass}`}>{labelFor('fiador', row.fiador)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  )
}
