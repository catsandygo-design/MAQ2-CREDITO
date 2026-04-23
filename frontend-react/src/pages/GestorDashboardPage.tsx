import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import './GestorDashboardPage.css'
import { ApiError, fetchGestorDashboard, fetchProcessosPaged, fetchSession, logout } from '../lib/api'
import type { ClienteFaseItem, GestorDashboardResponse, ProcessoApiItem } from '../types'

const REFRESH_SECONDS = 60
const PAGE_SIZE = 120
const MAX_PAGES = 20
const FALL_RISK_DAYS = 15

const APPROVED_STATUS_KEYS = new Set(['aprovado', 'dar_qv', 'assinatura_caixa', 'finalizado'])
const CONDITIONED_STATUS_KEYS = new Set(['condicionado'])
const REJECTED_STATUS_KEYS = new Set(['reprovado', 'bloqueado'])
const SIGNED_STATUS_KEYS = new Set(['assinatura_caixa', 'finalizado'])
const SIGNAL_READY_KEYS = new Set(['nao_tem', 'pago'])
const FIADOR_READY_KEYS = new Set(['nao_tem', 'finalizado'])
const CAIXA_READY_KEYS = new Set(['aprovado', 'dar_qv', 'conforme', 'tratando_produto', 'agendado', 'assinatura_caixa', 'finalizado'])
const CREDIT_STAGE_KEYS = new Set(['credito', 'secretaria_vendas'])
const REPASSE_STAGE_KEYS = new Set(['assinatura_diretoria', 'autorizacao_diretoria', 'envio_sienge', 'venda_finalizada'])

type FocusMode = 'geral' | 'propostas' | 'ipc'
type PeriodKey = 'mes' | '30d' | '7d' | 'carteira'
type Tone = 'ok' | 'warn' | 'danger' | 'neutral'

interface FiltersState {
  focus: FocusMode
  period: PeriodKey
  search: string
  obra: string
  corretor: string
  imobiliaria: string
  cca: string
}

interface DashboardRow {
  processoId: string
  cliente: string
  obra: string
  corretor: string
  imobiliaria: string
  cca: string
  geralKey: string
  geralLabel: string
  repasseKey: string
  repasseLabel: string
  statusCaixaKey: string
  statusCaixaLabel: string
  statusAgehabKey: string
  sinalKey: string
  fiadorKey: string
  docsPendentes: number
  foraContagemMes: boolean
  signed: boolean
  prontoRepasse: boolean
  emComercial: boolean
  emCredito: boolean
  emRepasse: boolean
  emRisco: boolean
  openDays: number
  referenceDate: Date | null
}

interface PeriodInfo {
  start: Date | null
  end: Date
  previousStart: Date | null
  previousEnd: Date | null
  chartStart: Date
  chartEnd: Date
  label: string
  compareLabel: string
}

interface ExecutiveCard {
  key: string
  label: string
  value: number
  tone: Tone
  chip: string
  note: string
  footLeft: string
  footRight: string
  delta: number | null
  series: number[]
}

interface ChartSeries {
  label: string
  color: string
  data: number[]
  dashed?: boolean
}

interface ProposalAnalytics {
  meta: number
  forecast: number
  attainment: number
  gap: number
  avgPerDay: number
  comparePercent: number | null
  approved: number
  conditioned: number
  rejected: number
  responded: number
  approvalRate: number
  labels: string[]
  cumulativeApproved: number[]
  cumulativeConditioned: number[]
  cumulativeRejected: number[]
  cumulativeTotal: number[]
  cumulativeMeta: number[]
  cumulativeForecast: number[]
  dailyApproved: number[]
  dailyConditioned: number[]
  dailyRejected: number[]
  dailyTotal: number[]
  metaDay: number[]
  periodUsed: string
}

interface IpcRankingRow {
  label: string
  total: number
  signed: number
  ready: number
  ratio: number
}

interface IpcAnalytics {
  repasses: number
  corretoresAtivos: number
  imobiliariasAtivas: number
  ipcCorretor: number
  ipcImobiliaria: number
  comparePercent: number | null
  labels: string[]
  cumulativeSigned: number[]
  cumulativeIpcCorretor: number[]
  cumulativeIpcImobiliaria: number[]
  previousIpcCorretor: number[]
  previousIpcImobiliaria: number[]
  dailyVolume: number[]
  dailySigned: number[]
  dailyIpc: number[]
  metaIpc: number[]
  rankingCorretores: IpcRankingRow[]
  rankingImobiliarias: IpcRankingRow[]
}

interface StageCount {
  label: string
  count: number
}

interface AttentionRow {
  processoId: string
  cliente: string
  obra: string
  corretor: string
  cca: string
  status: string
  note: string
  urgency: number
}

const numberFormatter = new Intl.NumberFormat('pt-BR')
const decimalFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const percentFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })

function norm(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function formatNumber(value: number): string {
  return numberFormatter.format(Number.isFinite(value) ? value : 0)
}

function formatDecimal(value: number): string {
  return decimalFormatter.format(Number.isFinite(value) ? value : 0)
}

function formatPercent(value: number): string {
  return `${percentFormatter.format(Number.isFinite(value) ? value : 0)}%`
}

function compactPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'sem base'
  const arrow = value >= 0 ? '↑' : '↓'
  return `${arrow} ${percentFormatter.format(Math.abs(value))}%`
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function addDays(value: Date, days: number): Date {
  const copy = new Date(value)
  copy.setDate(copy.getDate() + days)
  return startOfDay(copy)
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return startOfDay(parsed)
}

function dayKey(date: Date | null): string {
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isWeekday(date: Date): boolean {
  const weekday = date.getDay()
  return weekday >= 1 && weekday <= 5
}

function countBusinessDays(start: Date, end: Date): number {
  let cursor = startOfDay(start)
  const finish = startOfDay(end)
  let total = 0
  while (cursor <= finish) {
    if (isWeekday(cursor)) total += 1
    cursor = addDays(cursor, 1)
  }
  return total
}

function diffPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null
  if (previous <= 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function enumerateDays(start: Date, end: Date): Date[] {
  const out: Date[] = []
  let cursor = startOfDay(start)
  const finish = startOfDay(end)
  while (cursor <= finish) {
    out.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return out
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0)
}

function safeSeriesMax(values: number[]): number {
  const max = Math.max(...values, 0)
  return max > 0 ? max : 1
}

function buildPeriodInfo(period: PeriodKey, now: Date): PeriodInfo {
  const end = startOfDay(now)

  if (period === '7d') {
    const start = addDays(end, -6)
    const previousEnd = addDays(start, -1)
    const previousStart = addDays(previousEnd, -6)
    return {
      start,
      end,
      previousStart,
      previousEnd,
      chartStart: start,
      chartEnd: end,
      label: `${dateFormatter.format(start)} -> ${dateFormatter.format(end)}`,
      compareLabel: `${dateFormatter.format(previousStart)} -> ${dateFormatter.format(previousEnd)}`,
    }
  }

  if (period === '30d') {
    const start = addDays(end, -29)
    const previousEnd = addDays(start, -1)
    const previousStart = addDays(previousEnd, -29)
    return {
      start,
      end,
      previousStart,
      previousEnd,
      chartStart: start,
      chartEnd: end,
      label: `${dateFormatter.format(start)} -> ${dateFormatter.format(end)}`,
      compareLabel: `${dateFormatter.format(previousStart)} -> ${dateFormatter.format(previousEnd)}`,
    }
  }

  if (period === 'carteira') {
    const chartEnd = end
    const chartStart = addDays(chartEnd, -13)
    const previousEnd = addDays(chartStart, -1)
    const previousStart = addDays(previousEnd, -13)
    return {
      start: null,
      end,
      previousStart,
      previousEnd,
      chartStart,
      chartEnd,
      label: 'Carteira ativa completa',
      compareLabel: `${dateFormatter.format(previousStart)} -> ${dateFormatter.format(previousEnd)}`,
    }
  }

  const start = new Date(end.getFullYear(), end.getMonth(), 1)
  const span = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1)
  const previousEnd = addDays(start, -1)
  const previousStart = addDays(previousEnd, -(span - 1))
  return {
    start,
    end,
    previousStart,
    previousEnd,
    chartStart: start,
    chartEnd: end,
    label: `${dateFormatter.format(start)} -> ${dateFormatter.format(end)}`,
    compareLabel: `${dateFormatter.format(previousStart)} -> ${dateFormatter.format(previousEnd)}`,
  }
}

function inRange(date: Date | null, start: Date | null, end: Date | null): boolean {
  if (!date) return false
  if (start && date < start) return false
  if (end && date > end) return false
  return true
}

function dedupeSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, 'pt-BR'),
  )
}

function buildDashboardRow(item: ProcessoApiItem, now: Date): DashboardRow {
  const referenceDate = parseDate(item.data_cadastro_origem || item.created_at || item.data_reserva_origem)
  const statusCaixaKey = norm(item.status_cca_key || item.status_cca || (item.sem_documento_enviado ? 'nao_iniciado' : 'analise_credito'))
  const statusAgehabKey = norm(item.status_agehab_key || item.status_agehab || (item.sem_documento_enviado ? 'nao_iniciado' : 'analise_credito'))
  const sinalKey = norm(item.status_sinal_key || item.status_sinal || 'nao_tem')
  const fiadorKey = norm(item.status_fiador_key || item.status_fiador || 'nao_tem')
  const geralKey = norm(item.estagio_comercial_key || item.estagio_comercial || item.status_geral)
  const repasseKey = norm(item.repasse_fase_key || item.etapa_repasse_key || item.etapa_repasse || 'sem_repasse')
  const docsPendentes = Math.max(0, Number(item.docs_pendentes ?? Math.max(0, Number(item.docs_total ?? 0) - Number(item.docs_recebidos ?? 0))))
  const openDays = referenceDate ? Math.max(0, Math.floor((startOfDay(now).getTime() - referenceDate.getTime()) / 86400000)) : 0
  const prontoRepasse =
    geralKey === 'venda_finalizada' &&
    statusAgehabKey === 'validado_agehab' &&
    SIGNAL_READY_KEYS.has(sinalKey) &&
    FIADOR_READY_KEYS.has(fiadorKey) &&
    CAIXA_READY_KEYS.has(statusCaixaKey)

  return {
    processoId: String(item.processo_id),
    cliente: String(item.cliente_nome || '-').trim() || '-',
    obra: String(item.obra || 'Sem obra').trim() || 'Sem obra',
    corretor: String(item.corretor || 'Sem corretor').trim() || 'Sem corretor',
    imobiliaria: String(item.imobiliaria || 'Sem imobiliaria').trim() || 'Sem imobiliaria',
    cca: String(item.cca_responsavel || 'Sem CCA').trim() || 'Sem CCA',
    geralKey,
    geralLabel: String(item.estagio_comercial_label || item.estagio_comercial || item.status_geral || 'Carteira'),
    repasseKey,
    repasseLabel: String(item.repasse_fase_label || item.etapa_repasse_label || item.etapa_repasse || 'Sem repasse'),
    statusCaixaKey,
    statusCaixaLabel: String(item.status_cca_label || item.status_cca || 'Analise'),
    statusAgehabKey,
    sinalKey,
    fiadorKey,
    docsPendentes,
    foraContagemMes: Boolean(item.nao_contar_mes),
    signed: SIGNED_STATUS_KEYS.has(statusCaixaKey),
    prontoRepasse,
    emComercial: geralKey === 'em_processo',
    emCredito: CREDIT_STAGE_KEYS.has(geralKey),
    emRepasse: REPASSE_STAGE_KEYS.has(geralKey) || repasseKey !== 'sem_repasse',
    emRisco: geralKey === 'em_processo' && openDays > FALL_RISK_DAYS,
    openDays,
    referenceDate,
  }
}

function buildItemSeries(items: ClienteFaseItem[], days: number, now: Date): number[] {
  const labels = enumerateDays(addDays(startOfDay(now), -(days - 1)), startOfDay(now))
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = dayKey(parseDate(item.data_cadastro_origem))
    if (!key) continue
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return labels.map((date) => counts.get(dayKey(date)) || 0)
}

function countItemsInRange(items: ClienteFaseItem[], start: Date, end: Date): number {
  return items.reduce((acc, item) => acc + (inRange(parseDate(item.data_cadastro_origem), start, end) ? 1 : 0), 0)
}

function urgencyForRow(row: DashboardRow): number {
  let score = row.openDays
  score += row.docsPendentes * 4
  if (row.emRisco) score += 26
  if (row.statusCaixaKey === 'condicionado') score += 18
  if (row.statusAgehabKey === 'pendente_agehab') score += 12
  if (row.prontoRepasse) score -= 10
  if (row.signed) score -= 22
  return score
}

function buildProposalAnalytics(rows: DashboardRow[], previousRows: DashboardRow[], period: PeriodInfo, dashboard: GestorDashboardResponse | null, now: Date): ProposalAnalytics {
  const days = enumerateDays(period.chartStart, period.chartEnd)
  const labels = days.map((date) => dateFormatter.format(date))
  const buckets = new Map<string, { approved: number; conditioned: number; rejected: number; total: number }>()

  for (const row of rows) {
    const key = dayKey(row.referenceDate)
    if (!key || !inRange(row.referenceDate, period.chartStart, period.chartEnd)) continue
    const bucket = buckets.get(key) || { approved: 0, conditioned: 0, rejected: 0, total: 0 }
    bucket.total += 1
    if (APPROVED_STATUS_KEYS.has(row.statusCaixaKey)) bucket.approved += 1
    if (CONDITIONED_STATUS_KEYS.has(row.statusCaixaKey)) bucket.conditioned += 1
    if (REJECTED_STATUS_KEYS.has(row.statusCaixaKey)) bucket.rejected += 1
    buckets.set(key, bucket)
  }

  const dailyApproved = days.map((date) => buckets.get(dayKey(date))?.approved || 0)
  const dailyConditioned = days.map((date) => buckets.get(dayKey(date))?.conditioned || 0)
  const dailyRejected = days.map((date) => buckets.get(dayKey(date))?.rejected || 0)
  const dailyTotal = days.map((date) => buckets.get(dayKey(date))?.total || 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const monthBusinessDays = Math.max(1, countBusinessDays(monthStart, monthEnd))
  const rangeBusinessDays = Math.max(1, countBusinessDays(period.chartStart, period.chartEnd))
  const observedBusinessDays = Math.max(1, countBusinessDays(period.chartStart, period.chartEnd < now ? period.chartEnd : startOfDay(now)))
  const monthlyMeta = Number(dashboard?.meta ?? 0)
  const meta = Math.round((monthlyMeta * rangeBusinessDays) / monthBusinessDays)
  const approved = sum(dailyApproved)
  const conditioned = sum(dailyConditioned)
  const rejected = sum(dailyRejected)
  const responded = approved + conditioned + rejected
  const avgPerDay = responded / observedBusinessDays
  const futureWorkdays = countBusinessDays(addDays(startOfDay(now), 1), period.chartEnd)
  const forecast = responded + avgPerDay * futureWorkdays
  const approvalRate = responded > 0 ? (approved / responded) * 100 : 0

  let runningApproved = 0
  let runningConditioned = 0
  let runningRejected = 0
  let runningTotal = 0
  let runningMeta = 0
  let runningForecast = 0
  const cumulativeApproved: number[] = []
  const cumulativeConditioned: number[] = []
  const cumulativeRejected: number[] = []
  const cumulativeTotal: number[] = []
  const cumulativeMeta: number[] = []
  const cumulativeForecast: number[] = []
  const goalPerBusinessDay = meta / rangeBusinessDays
  const forecastPerBusinessDay = avgPerDay

  for (let index = 0; index < days.length; index += 1) {
    const day = days[index]
    runningApproved += dailyApproved[index]
    runningConditioned += dailyConditioned[index]
    runningRejected += dailyRejected[index]
    runningTotal += dailyTotal[index]
    if (isWeekday(day)) {
      runningMeta += goalPerBusinessDay
      if (day <= startOfDay(now)) {
        runningForecast = runningTotal
      } else {
        runningForecast += forecastPerBusinessDay
      }
    }
    cumulativeApproved.push(runningApproved)
    cumulativeConditioned.push(runningConditioned)
    cumulativeRejected.push(runningRejected)
    cumulativeTotal.push(runningTotal)
    cumulativeMeta.push(runningMeta)
    cumulativeForecast.push(runningForecast)
  }

  const previousResponded = previousRows.reduce((acc, row) => {
    if (APPROVED_STATUS_KEYS.has(row.statusCaixaKey) || CONDITIONED_STATUS_KEYS.has(row.statusCaixaKey) || REJECTED_STATUS_KEYS.has(row.statusCaixaKey)) {
      return acc + 1
    }
    return acc
  }, 0)

  return {
    meta,
    forecast,
    attainment: meta > 0 ? (responded / meta) * 100 : 0,
    gap: responded - meta,
    avgPerDay,
    comparePercent: diffPercent(responded, previousResponded),
    approved,
    conditioned,
    rejected,
    responded,
    approvalRate,
    labels,
    cumulativeApproved,
    cumulativeConditioned,
    cumulativeRejected,
    cumulativeTotal,
    cumulativeMeta,
    cumulativeForecast,
    dailyApproved,
    dailyConditioned,
    dailyRejected,
    dailyTotal,
    metaDay: labels.map(() => goalPerBusinessDay),
    periodUsed: `${dateFormatter.format(period.chartStart)} -> ${dateFormatter.format(period.chartEnd)} (${rangeBusinessDays} dias uteis)`,
  }
}

function buildIpcAnalytics(rows: DashboardRow[], previousRows: DashboardRow[], period: PeriodInfo, dashboard: GestorDashboardResponse | null): IpcAnalytics {
  const days = enumerateDays(period.chartStart, period.chartEnd)
  const labels = days.map((date) => dateFormatter.format(date))
  const volumeMap = new Map<string, { total: number; signed: number }>()

  for (const row of rows) {
    const key = dayKey(row.referenceDate)
    if (!key || !inRange(row.referenceDate, period.chartStart, period.chartEnd)) continue
    const bucket = volumeMap.get(key) || { total: 0, signed: 0 }
    bucket.total += 1
    if (row.signed) bucket.signed += 1
    volumeMap.set(key, bucket)
  }

  const corretoresAtivos = new Set(rows.map((row) => row.corretor)).size
  const imobiliariasAtivas = new Set(rows.map((row) => row.imobiliaria)).size
  const repasses = rows.filter((row) => row.signed).length
  const ipcCorretor = corretoresAtivos > 0 ? repasses / corretoresAtivos : 0
  const ipcImobiliaria = imobiliariasAtivas > 0 ? repasses / imobiliariasAtivas : 0

  const previousCorretores = new Set(previousRows.map((row) => row.corretor)).size
  const previousRepasses = previousRows.filter((row) => row.signed).length
  const previousIpcCorretorFinal = previousCorretores > 0 ? previousRepasses / previousCorretores : 0
  const previousImobs = new Set(previousRows.map((row) => row.imobiliaria)).size
  const previousIpcImobiliariaFinal = previousImobs > 0 ? previousRepasses / previousImobs : 0

  let cumulativeSigned = 0
  const cumulativeSignedSeries: number[] = []
  const cumulativeIpcCorretor: number[] = []
  const cumulativeIpcImobiliaria: number[] = []
  const previousIpcCorretorSeries: number[] = []
  const previousIpcImobiliariaSeries: number[] = []
  const dailyVolume: number[] = []
  const dailySigned: number[] = []
  const dailyIpc: number[] = []

  for (const day of days) {
    const bucket = volumeMap.get(dayKey(day)) || { total: 0, signed: 0 }
    cumulativeSigned += bucket.signed
    dailyVolume.push(bucket.total)
    dailySigned.push(bucket.signed)
    dailyIpc.push(bucket.signed / Math.max(1, corretoresAtivos))
    cumulativeSignedSeries.push(cumulativeSigned)
    cumulativeIpcCorretor.push(cumulativeSigned / Math.max(1, corretoresAtivos))
    cumulativeIpcImobiliaria.push(cumulativeSigned / Math.max(1, imobiliariasAtivas))
    previousIpcCorretorSeries.push(previousIpcCorretorFinal)
    previousIpcImobiliariaSeries.push(previousIpcImobiliariaFinal)
  }

  const metaIpcTarget = Number(dashboard?.meta ?? 0) / Math.max(1, corretoresAtivos || 1)
  const businessDays = Math.max(1, countBusinessDays(period.chartStart, period.chartEnd))
  const metaIpc = labels.map(() => metaIpcTarget / businessDays)

  const rankingCorretores = Array.from(
    rows.reduce((map, row) => {
      const current = map.get(row.corretor) || { label: row.corretor, total: 0, signed: 0, ready: 0, ratio: 0 }
      current.total += 1
      if (row.signed) current.signed += 1
      if (row.prontoRepasse) current.ready += 1
      current.ratio = current.total > 0 ? current.signed / current.total : 0
      map.set(row.corretor, current)
      return map
    }, new Map<string, IpcRankingRow>()).values(),
  )
    .sort((left, right) => right.signed - left.signed || right.total - left.total || left.label.localeCompare(right.label, 'pt-BR'))
    .slice(0, 6)

  const rankingImobiliarias = Array.from(
    rows.reduce((map, row) => {
      const current = map.get(row.imobiliaria) || { label: row.imobiliaria, total: 0, signed: 0, ready: 0, ratio: 0 }
      current.total += 1
      if (row.signed) current.signed += 1
      if (row.prontoRepasse) current.ready += 1
      current.ratio = current.total > 0 ? current.signed / current.total : 0
      map.set(row.imobiliaria, current)
      return map
    }, new Map<string, IpcRankingRow>()).values(),
  )
    .sort((left, right) => right.signed - left.signed || right.total - left.total || left.label.localeCompare(right.label, 'pt-BR'))
    .slice(0, 6)

  return {
    repasses,
    corretoresAtivos,
    imobiliariasAtivas,
    ipcCorretor,
    ipcImobiliaria,
    comparePercent: diffPercent(ipcCorretor, previousIpcCorretorFinal),
    labels,
    cumulativeSigned: cumulativeSignedSeries,
    cumulativeIpcCorretor,
    cumulativeIpcImobiliaria,
    previousIpcCorretor: previousIpcCorretorSeries,
    previousIpcImobiliaria: previousIpcImobiliariaSeries,
    dailyVolume,
    dailySigned,
    dailyIpc,
    metaIpc,
    rankingCorretores,
    rankingImobiliarias,
  }
}

function MiniBars({ values, tone }: { values: number[]; tone: Tone }) {
  const max = safeSeriesMax(values)
  return (
    <div className={`gestorx-mini-bars gestorx-mini-bars-${tone}`}>
      {values.map((value, index) => (
        <span
          key={`${tone}-${index}`}
          className="gestorx-mini-bar"
          style={{ height: `${Math.max(12, (value / max) * 100)}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function Legend({ items }: { items: Array<{ label: string; color: string; dashed?: boolean }> }) {
  return (
    <div className="gestorx-legend">
      {items.map((item) => (
        <span key={item.label} className="gestorx-legend-item">
          <i className={`gestorx-legend-swatch${item.dashed ? ' dashed' : ''}`} style={{ '--swatch': item.color } as CSSProperties} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function ComposedChart({
  labels,
  barSeries = [],
  lineSeries = [],
}: {
  labels: string[]
  barSeries?: ChartSeries[]
  lineSeries?: ChartSeries[]
}) {
  const maxValue = safeSeriesMax([...barSeries.flatMap((series) => series.data), ...lineSeries.flatMap((series) => series.data)])
  const innerWidth = 92
  const innerHeight = 46
  const barCount = Math.max(1, barSeries.length)
  const step = labels.length > 1 ? innerWidth / (labels.length - 1) : innerWidth
  const groupWidth = labels.length > 0 ? innerWidth / labels.length : innerWidth
  const barWidth = Math.min(5.8, groupWidth / Math.max(1.6, barCount + 0.2))

  const linePoints = (data: number[]) =>
    data
      .map((value, index) => {
        const x = 4 + index * step
        const y = 4 + innerHeight - (value / maxValue) * innerHeight
        return `${x},${y}`
      })
      .join(' ')

  return (
    <div className="gestorx-chart-shell">
      <svg viewBox="0 0 100 56" className="gestorx-chart-svg" role="img" aria-label="Grafico analitico">
        {[0, 0.33, 0.66, 1].map((ratio, index) => {
          const y = 4 + innerHeight - innerHeight * ratio
          return <line key={`grid-${index}`} x1="4" x2="96" y1={y} y2={y} className="gestorx-chart-grid" />
        })}

        {barSeries.map((series, seriesIndex) =>
          series.data.map((value, index) => {
            const x = 4 + index * groupWidth + seriesIndex * (barWidth + 0.4)
            const h = (value / maxValue) * innerHeight
            const y = 4 + innerHeight - h
            return (
              <rect
                key={`${series.label}-${index}`}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(0.8, h)}
                rx="0.9"
                fill={series.color}
                opacity="0.9"
              />
            )
          }),
        )}

        {lineSeries.map((series) => (
          <polyline
            key={series.label}
            fill="none"
            stroke={series.color}
            strokeWidth="1.25"
            strokeDasharray={series.dashed ? '3 2.2' : undefined}
            points={linePoints(series.data)}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </svg>

      <div className="gestorx-chart-labels">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ card }: { card: ExecutiveCard }) {
  return (
    <article className={`gestorx-metric-card tone-${card.tone}`}>
      <div className="gestorx-metric-top">
        <div>
          <h3>{card.label}</h3>
          <p>{card.note}</p>
        </div>
        <span className={`gestorx-chip tone-${card.tone}`}>{card.chip}</span>
      </div>

      <div className="gestorx-metric-main">
        <div className="gestorx-metric-delta">{compactPercent(card.delta)}</div>
        <div className="gestorx-metric-value">{formatNumber(card.value)}</div>
      </div>

      <MiniBars values={card.series} tone={card.tone} />

      <div className="gestorx-metric-footer">
        <span>{card.footLeft}</span>
        <span>{card.footRight}</span>
      </div>
    </article>
  )
}

function SummaryBlock({ label, value, note, tone = 'neutral' }: { label: string; value: string; note?: string; tone?: Tone }) {
  return (
    <article className={`gestorx-summary-block tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  )
}

function RankingList({
  title,
  subtitle,
  rows,
  accent,
}: {
  title: string
  subtitle: string
  rows: IpcRankingRow[]
  accent: 'blue' | 'amber'
}) {
  const max = safeSeriesMax(rows.map((row) => row.total))
  return (
    <section className="gestorx-detail-card">
      <header className="gestorx-section-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </header>

      <div className="gestorx-ranking-list">
        {rows.length === 0 ? <div className="gestorx-empty">Nenhum registro disponivel para este recorte.</div> : null}
        {rows.map((row) => (
          <article key={`${title}-${row.label}`} className="gestorx-ranking-item">
            <div className="gestorx-ranking-copy">
              <strong>{row.label}</strong>
              <span>
                {row.signed} rep. | {row.ready} prontos | conversao {formatPercent(row.ratio * 100)}
              </span>
            </div>
            <div className={`gestorx-ranking-bar accent-${accent}`}>
              <i style={{ width: `${Math.max(10, (row.total / max) * 100)}%` }} />
            </div>
            <strong className="gestorx-ranking-total">{formatNumber(row.total)}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}

export function GestorDashboardPage() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<GestorDashboardResponse | null>(null)
  const [processos, setProcessos] = useState<ProcessoApiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [refreshTick, setRefreshTick] = useState(REFRESH_SECONDS)
  const [filters, setFilters] = useState<FiltersState>({
    focus: 'geral',
    period: 'mes',
    search: '',
    obra: '',
    corretor: '',
    imobiliaria: '',
    cca: '',
  })

  const deferredSearch = useDeferredValue(filters.search)

  const loadData = useCallback(async () => {
    setLoading((prev) => prev || dashboard === null)
    try {
      const [me, dashboardOut, processosOut] = await Promise.all([
        fetchSession(),
        fetchGestorDashboard(),
        fetchProcessosPaged(PAGE_SIZE, MAX_PAGES),
      ])

      const role = norm(me.role)
      if (!['gestor', 'gestor_credito', 'admin'].includes(role)) {
        window.location.href = me.home || '/app'
        return
      }

      setDashboard(dashboardOut)
      setProcessos(processosOut)
      setError('')
      setLastUpdated(new Date())
      setNow(new Date())
      setRefreshTick(REFRESH_SECONDS)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err.message)
      } else {
        setError('Falha ao carregar os dashboards do gestor')
      }
    } finally {
      setLoading(false)
    }
  }, [dashboard, navigate])

  useEffect(() => {
    void loadData()
  }, [loadData])

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

  const rows = useMemo(() => processos.map((item) => buildDashboardRow(item, now)), [now, processos])

  const options = useMemo(
    () => ({
      obras: dedupeSorted(rows.map((row) => row.obra)),
      corretores: dedupeSorted(rows.map((row) => row.corretor)),
      imobiliarias: dedupeSorted(rows.map((row) => row.imobiliaria)),
      ccas: dedupeSorted(rows.map((row) => row.cca)),
    }),
    [rows],
  )

  const filteredUniverse = useMemo(() => {
    const search = norm(deferredSearch)
    return rows.filter((row) => {
      const hitSearch =
        !search ||
        [row.cliente, row.obra, row.corretor, row.imobiliaria, row.cca, row.geralLabel, row.repasseLabel]
          .map((value) => norm(value))
          .some((value) => value.includes(search))
      const hitObra = !filters.obra || row.obra === filters.obra
      const hitCorretor = !filters.corretor || row.corretor === filters.corretor
      const hitImobiliaria = !filters.imobiliaria || row.imobiliaria === filters.imobiliaria
      const hitCca = !filters.cca || row.cca === filters.cca
      return hitSearch && hitObra && hitCorretor && hitImobiliaria && hitCca
    })
  }, [deferredSearch, filters.cca, filters.corretor, filters.imobiliaria, filters.obra, rows])

  const periodInfo = useMemo(() => buildPeriodInfo(filters.period, now), [filters.period, now])

  const currentRows = useMemo(
    () => (periodInfo.start ? filteredUniverse.filter((row) => inRange(row.referenceDate, periodInfo.start, periodInfo.end)) : filteredUniverse),
    [filteredUniverse, periodInfo.end, periodInfo.start],
  )

  const previousRows = useMemo(
    () =>
      periodInfo.previousStart && periodInfo.previousEnd
        ? filteredUniverse.filter((row) => inRange(row.referenceDate, periodInfo.previousStart, periodInfo.previousEnd))
        : [],
    [filteredUniverse, periodInfo.previousEnd, periodInfo.previousStart],
  )

  const proposalAnalytics = useMemo(
    () => buildProposalAnalytics(currentRows, previousRows, periodInfo, dashboard, now),
    [currentRows, dashboard, now, periodInfo, previousRows],
  )

  const ipcAnalytics = useMemo(
    () => buildIpcAnalytics(currentRows, previousRows, periodInfo, dashboard),
    [currentRows, dashboard, periodInfo, previousRows],
  )

  const generalView = useMemo(() => {
    const stageMap = new Map<string, number>()
    const blockerMap = new Map<string, number>([
      ['Documentos', 0],
      ['CCA / Caixa', 0],
      ['Agehab', 0],
      ['Sinal / Fiador', 0],
      ['Prontos repasse', 0],
    ])

    for (const row of currentRows) {
      stageMap.set(row.geralLabel, (stageMap.get(row.geralLabel) || 0) + 1)
      if (row.docsPendentes > 0) blockerMap.set('Documentos', (blockerMap.get('Documentos') || 0) + 1)
      if (row.statusCaixaKey.includes('pendente') || row.statusCaixaKey === 'condicionado') {
        blockerMap.set('CCA / Caixa', (blockerMap.get('CCA / Caixa') || 0) + 1)
      }
      if (row.statusAgehabKey.includes('pendente')) blockerMap.set('Agehab', (blockerMap.get('Agehab') || 0) + 1)
      if (!SIGNAL_READY_KEYS.has(row.sinalKey) || !FIADOR_READY_KEYS.has(row.fiadorKey)) {
        blockerMap.set('Sinal / Fiador', (blockerMap.get('Sinal / Fiador') || 0) + 1)
      }
      if (row.prontoRepasse) blockerMap.set('Prontos repasse', (blockerMap.get('Prontos repasse') || 0) + 1)
    }

    const stages: StageCount[] = Array.from(stageMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 7)

    const blockers: StageCount[] = Array.from(blockerMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)

    const attention: AttentionRow[] = currentRows
      .map((row) => {
        const status =
          row.emRisco
            ? 'Risco de queda'
            : row.prontoRepasse
              ? 'Pronto para repasse'
              : row.statusCaixaLabel || row.geralLabel
        const notes: string[] = []
        if (row.docsPendentes > 0) notes.push(`${row.docsPendentes} docs pendentes`)
        if (row.openDays > 0) notes.push(`${row.openDays} dias em aberto`)
        if (!notes.length) notes.push(row.repasseLabel)
        return {
          processoId: row.processoId,
          cliente: row.cliente,
          obra: row.obra,
          corretor: row.corretor,
          cca: row.cca,
          status,
          note: notes.join(' | '),
          urgency: urgencyForRow(row),
        }
      })
      .sort((left, right) => right.urgency - left.urgency)
      .slice(0, 6)

    const rankingImob = Array.from(
      currentRows.reduce((map, row) => {
        const current = map.get(row.imobiliaria) || { label: row.imobiliaria, total: 0, signed: 0, ready: 0, ratio: 0 }
        current.total += 1
        if (row.signed) current.signed += 1
        if (row.prontoRepasse) current.ready += 1
        current.ratio = current.total > 0 ? current.signed / current.total : 0
        map.set(row.imobiliaria, current)
        return map
      }, new Map<string, IpcRankingRow>()).values(),
    )
      .sort((left, right) => right.total - left.total || right.signed - left.signed)
      .slice(0, 6)

    return { stages, blockers, attention, rankingImob }
  }, [currentRows])

  const monthCardRange = useMemo(() => buildPeriodInfo('mes', now), [now])

  const executiveCards = useMemo(() => {
    const phaseMap = dashboard?.clientes_por_fase || {}
    const totalItems = dashboard?.clientes_estagios || []
    const cardSource: Array<Omit<ExecutiveCard, 'delta' | 'series'> & { items: ClienteFaseItem[] }> = [
      {
        key: 'carteira',
        label: 'Carteira Ativa',
        value: Number(dashboard?.total ?? rows.length),
        items: totalItems,
        note: 'Processos vivos no pipeline atual.',
        tone: 'neutral' as Tone,
        chip: 'Operacao',
        footLeft: `Base bruta ${formatNumber(Number(dashboard?.total_bruto ?? rows.length))}`,
        footRight: `${formatNumber(totalItems.filter((item) => !item.nao_contar_mes).length)} validos`,
      },
      {
        key: 'comercial',
        label: 'Comercial',
        value: Number(dashboard?.total_comercial ?? dashboard?.enviados_conformidade ?? 0),
        items: phaseMap.comercial || phaseMap.enviados_conformidade || [],
        note: 'Carteira em processo com corretor.',
        tone: 'warn' as Tone,
        chip: 'Atencao',
        footLeft: `Chegadas 7d ${formatNumber(Number(dashboard?.chegadas_ultimos_7_dias ?? 0))}`,
        footRight: `${formatDecimal(Number(dashboard?.media_chegadas_dia_7d ?? 0))}/dia`,
      },
      {
        key: 'credito',
        label: 'Credito',
        value: Number(dashboard?.total_credito ?? dashboard?.em_analise ?? 0),
        items: phaseMap.em_analise || [],
        note: 'Processos em analise tecnica e CCA.',
        tone: 'neutral' as Tone,
        chip: 'Analise',
        footLeft: `SLA medio ${formatNumber(Number(dashboard?.sla_medio_credito_horas ?? 0))}h`,
        footRight: `${formatNumber(rows.filter((row) => row.emCredito).length)} no recorte`,
      },
      {
        key: 'repasse',
        label: 'Repasse',
        value: Number(dashboard?.total_repasse ?? 0),
        items: phaseMap.repasse || [],
        note: 'Fila pronta para assinatura e conclusao.',
        tone: 'ok' as Tone,
        chip: 'Em rota',
        footLeft: `Meta semanal ${formatNumber(Number(dashboard?.meta_semanal ?? 0))}`,
        footRight: `Real ${formatNumber(Number(dashboard?.real_semanal ?? 0))}`,
      },
      {
        key: 'assinados',
        label: 'Assinados',
        value: Number(dashboard?.total_assinados ?? dashboard?.real ?? 0),
        items: phaseMap.assinados || [],
        note: 'Resultado fechado do periodo.',
        tone: Number(dashboard?.real ?? 0) >= Number(dashboard?.meta ?? 0) ? 'ok' : 'warn',
        chip: Number(dashboard?.real ?? 0) >= Number(dashboard?.meta ?? 0) ? 'Acima' : 'Atencao',
        footLeft: `Meta ${formatNumber(Number(dashboard?.meta ?? 0))}`,
        footRight: `Forecast ${formatNumber(Math.round(Number(dashboard?.previsao ?? 0)))}`,
      },
      {
        key: 'prontos',
        label: 'Prontos Repasse',
        value: Number(dashboard?.conformidade_ok ?? 0),
        items: phaseMap.conformidade_ok || [],
        note: 'Fluxos prontos para empurrar contrato.',
        tone: 'ok' as Tone,
        chip: 'Pronto',
        footLeft: `Media dia ${formatDecimal(Number(dashboard?.media_necessaria_dia ?? 0))}`,
        footRight: `${formatNumber(rows.filter((row) => row.prontoRepasse).length)} filtrados`,
      },
      {
        key: 'risco',
        label: 'Em Risco',
        value: Number(dashboard?.provaveis_cair ?? 0),
        items: phaseMap.passiveis_cair || [],
        note: `Carteira acima de ${formatNumber(Number(dashboard?.dias_estimativa_queda ?? FALL_RISK_DAYS))} dias.`,
        tone: Number(dashboard?.provaveis_cair ?? 0) > 0 ? 'danger' : 'ok',
        chip: Number(dashboard?.provaveis_cair ?? 0) > 0 ? 'Critico' : 'Sob controle',
        footLeft: `SLA comercial ${formatNumber(Number(dashboard?.sla_medio_comercial_horas ?? 0))}h`,
        footRight: `${formatNumber(rows.filter((row) => row.emRisco).length)} no recorte`,
      },
      {
        key: 'perdas',
        label: 'Perdas no Mes',
        value: Number(dashboard?.perdas_mes ?? 0),
        items: phaseMap.perdas || phaseMap.com_pendencias || [],
        note: 'Saidas do mes ja consumidas pela operacao.',
        tone: Number(dashboard?.perdas_mes ?? 0) > 0 ? 'danger' : 'neutral',
        chip: Number(dashboard?.perdas_mes ?? 0) > 0 ? 'Atencao' : 'Estavel',
        footLeft: `Excluidos ${formatNumber(Number(dashboard?.nao_contar_mes ?? 0))}`,
        footRight: `Proj. ${formatNumber(Number(dashboard?.projecao_chegadas_30_dias ?? 0))}`,
      },
    ]

    return cardSource.map((card) => {
      const currentCount = countItemsInRange(card.items, monthCardRange.chartStart, monthCardRange.chartEnd)
      const previousCount = countItemsInRange(card.items, monthCardRange.previousStart || monthCardRange.chartStart, monthCardRange.previousEnd || monthCardRange.chartEnd)
      return {
        ...card,
        delta: diffPercent(currentCount, previousCount),
        series: buildItemSeries(card.items, 7, now),
      }
    })
  }, [dashboard, monthCardRange, now, rows])

  const onFilterChange = (key: keyof FiltersState, value: string) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    })
  }

  const onLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const primaryTitle =
    filters.focus === 'propostas' ? 'Progressao Temporal - Propostas' : filters.focus === 'ipc' ? 'Eficiencia de Vendas e Volume' : 'Mapa Executivo da Carteira'

  return (
    <main className="dashboard-shell gestorx-shell">
      <header className="dashboard-top gestorx-top">
        <div className="gestorx-hero-copy">
          <span className="gestorx-kicker">Modo de analise</span>
          <h1>Dashboards do Gestor</h1>
          <p>Layout novo inspirado nas referencias e conectado aos dados reais da operacao.</p>
        </div>

        <div className="top-actions gestorx-actions">
          <span className="badge">Auto refresh: {refreshTick}s</span>
          <span className="badge">Atualizado: {lastUpdated ? lastUpdated.toLocaleTimeString('pt-BR') : '--:--:--'}</span>
          <button type="button" onClick={() => loadData()}>
            Atualizar base
          </button>
          <button type="button" className="danger" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel gestorx-brief-strip">
        <SummaryBlock label="Meta mensal" value={formatNumber(Number(dashboard?.meta ?? 0))} note={dashboard?.meta_fonte || 'Meta do periodo'} tone="neutral" />
        <SummaryBlock label="Realizado" value={formatNumber(Number(dashboard?.real ?? 0))} note="Assinados do periodo" tone="ok" />
        <SummaryBlock label="Forecast" value={formatDecimal(Number(dashboard?.previsao ?? 0))} note="Projecao da base ativa" tone="warn" />
        <SummaryBlock label="Meta semanal" value={formatNumber(Number(dashboard?.meta_semanal ?? 0))} note="Recorte util da semana" tone="neutral" />
        <SummaryBlock label="Media necessaria" value={`${formatDecimal(Number(dashboard?.media_necessaria_dia ?? 0))}/dia`} note="Para bater o mensal" tone="warn" />
      </section>

      <section className="panel gestorx-filters">
        <div className="gestorx-focus-tabs" role="tablist" aria-label="Modos do dashboard">
          {[
            ['geral', 'Geral'],
            ['propostas', 'Propostas'],
            ['ipc', 'IPC Corretor'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filters.focus === value ? 'active' : ''}
              onClick={() => onFilterChange('focus', value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="gestorx-filter-grid">
          <label>
            Periodo
            <select value={filters.period} onChange={(event) => onFilterChange('period', event.target.value)}>
              <option value="mes">Mes atual</option>
              <option value="30d">Ultimos 30 dias</option>
              <option value="7d">Ultimos 7 dias</option>
              <option value="carteira">Carteira total</option>
            </select>
          </label>

          <label>
            Busca
            <input value={filters.search} onChange={(event) => onFilterChange('search', event.target.value)} placeholder="Cliente, obra, corretor..." />
          </label>

          <label>
            Empreendimento
            <select value={filters.obra} onChange={(event) => onFilterChange('obra', event.target.value)}>
              <option value="">Todos</option>
              {options.obras.map((obra) => (
                <option key={obra} value={obra}>
                  {obra}
                </option>
              ))}
            </select>
          </label>

          <label>
            Corretor
            <select value={filters.corretor} onChange={(event) => onFilterChange('corretor', event.target.value)}>
              <option value="">Todos</option>
              {options.corretores.map((corretor) => (
                <option key={corretor} value={corretor}>
                  {corretor}
                </option>
              ))}
            </select>
          </label>

          <label>
            Imobiliaria
            <select value={filters.imobiliaria} onChange={(event) => onFilterChange('imobiliaria', event.target.value)}>
              <option value="">Todas</option>
              {options.imobiliarias.map((imobiliaria) => (
                <option key={imobiliaria} value={imobiliaria}>
                  {imobiliaria}
                </option>
              ))}
            </select>
          </label>

          <label>
            Coordenacao / CCA
            <select value={filters.cca} onChange={(event) => onFilterChange('cca', event.target.value)}>
              <option value="">Todos</option>
              {options.ccas.map((cca) => (
                <option key={cca} value={cca}>
                  {cca}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="gestorx-metrics-grid">
        {executiveCards.map((card) => (
          <MetricCard key={card.key} card={card} />
        ))}
      </section>

      <div className="gestorx-main-grid">
        <aside className="panel gestorx-rail">
          <span className="gestorx-kicker">Visao lateral</span>
          <h2>{filters.focus === 'propostas' ? 'Propostas' : filters.focus === 'ipc' ? 'IPC Corretor' : 'Carteira Filtrada'}</h2>
          <p>{primaryTitle}</p>

          <div className="gestorx-rail-pill">{periodInfo.label}</div>
          <div className="gestorx-rail-pill muted">Comparacao: {periodInfo.compareLabel}</div>

          {filters.focus === 'propostas' ? (
            <div className="gestorx-rail-metrics">
              <SummaryBlock label="Meta" value={formatNumber(Math.round(proposalAnalytics.meta))} tone="neutral" />
              <SummaryBlock label="Forecast" value={formatDecimal(proposalAnalytics.forecast)} tone="warn" />
              <SummaryBlock label="Atingimento" value={formatPercent(proposalAnalytics.attainment)} tone={proposalAnalytics.attainment >= 100 ? 'ok' : 'warn'} />
              <SummaryBlock label="Gap" value={proposalAnalytics.gap >= 0 ? `+${formatNumber(proposalAnalytics.gap)}` : `${formatNumber(proposalAnalytics.gap)}`} tone={proposalAnalytics.gap >= 0 ? 'ok' : 'danger'} />
              <SummaryBlock label="Media util/dia" value={formatDecimal(proposalAnalytics.avgPerDay)} note={proposalAnalytics.periodUsed} tone="neutral" />
            </div>
          ) : null}

          {filters.focus === 'ipc' ? (
            <div className="gestorx-rail-metrics">
              <SummaryBlock label="IPC Corretor" value={formatDecimal(ipcAnalytics.ipcCorretor)} note={compactPercent(ipcAnalytics.comparePercent)} tone="warn" />
              <SummaryBlock label="IPC Imobiliaria" value={formatDecimal(ipcAnalytics.ipcImobiliaria)} note="Base do recorte" tone="ok" />
              <SummaryBlock label="Repasses" value={formatNumber(ipcAnalytics.repasses)} tone="neutral" />
              <SummaryBlock label="Corretores ativos" value={formatNumber(ipcAnalytics.corretoresAtivos)} tone="neutral" />
              <SummaryBlock label="Imobiliarias ativas" value={formatNumber(ipcAnalytics.imobiliariasAtivas)} tone="neutral" />
            </div>
          ) : null}

          {filters.focus === 'geral' ? (
            <div className="gestorx-rail-metrics">
              <SummaryBlock label="Carteira no recorte" value={formatNumber(currentRows.length)} note={`${filteredUniverse.length} apos filtros`} tone="neutral" />
              <SummaryBlock label="Prontos repasse" value={formatNumber(currentRows.filter((row) => row.prontoRepasse).length)} tone="ok" />
              <SummaryBlock label="Em risco" value={formatNumber(currentRows.filter((row) => row.emRisco).length)} tone="danger" />
              <SummaryBlock label="Docs pendentes" value={formatNumber(currentRows.filter((row) => row.docsPendentes > 0).length)} tone="warn" />
            </div>
          ) : null}

          <div className="gestorx-rail-links">
            <a href="/app/analista">Dashboard da equipe</a>
            <a href="/app/cca/analise">Detalhamento</a>
          </div>

          <p className="gestorx-rail-note">Series temporais usam a data de cadastro/origem da carteira para manter o dashboard alinhado ao dado real hoje disponivel no app.</p>
        </aside>

        <section className="gestorx-stage">
          {loading && !dashboard ? <div className="panel gestorx-loading">Carregando dashboards...</div> : null}

          {!loading && filters.focus === 'geral' ? (
            <div className="gestorx-detail-grid">
              <section className="gestorx-detail-card">
                <header className="gestorx-section-head">
                  <div>
                    <span className="gestorx-kicker">Visao analitica</span>
                    <h3>Pipeline da carteira filtrada</h3>
                    <p>Distribuicao por etapa comercial predominante.</p>
                  </div>
                </header>
                <div className="gestorx-bar-list">
                  {generalView.stages.map((stage) => (
                    <article key={stage.label} className="gestorx-bar-item">
                      <span>{stage.label}</span>
                      <div>
                        <i style={{ width: `${Math.max(10, (stage.count / safeSeriesMax(generalView.stages.map((item) => item.count))) * 100)}%` }} />
                      </div>
                      <strong>{formatNumber(stage.count)}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <section className="gestorx-detail-card">
                <header className="gestorx-section-head">
                  <div>
                    <span className="gestorx-kicker">Visao analitica</span>
                    <h3>Radar de pendencias</h3>
                    <p>Leitura rapida dos pontos que travam a operacao.</p>
                  </div>
                </header>
                <div className="gestorx-bar-list">
                  {generalView.blockers.map((blocker) => (
                    <article key={blocker.label} className="gestorx-bar-item alt">
                      <span>{blocker.label}</span>
                      <div>
                        <i style={{ width: `${Math.max(10, (blocker.count / safeSeriesMax(generalView.blockers.map((item) => item.count))) * 100)}%` }} />
                      </div>
                      <strong>{formatNumber(blocker.count)}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <RankingList title="Visao por Imobiliaria" subtitle="Base ativa por parceiro e potencial de fechamento." rows={generalView.rankingImob} accent="amber" />

              <section className="gestorx-detail-card">
                <header className="gestorx-section-head">
                  <div>
                    <span className="gestorx-kicker">Fila de atencao</span>
                    <h3>Clientes que pedem acao agora</h3>
                    <p>Ordenados por risco, atraso e pendencias abertas.</p>
                  </div>
                </header>
                <div className="gestorx-attention-list">
                  {generalView.attention.map((row) => (
                    <article key={row.processoId} className="gestorx-attention-item">
                      <div>
                        <strong>{row.cliente}</strong>
                        <span>
                          {row.obra} | {row.corretor} | {row.cca}
                        </span>
                      </div>
                      <div>
                        <b>{row.status}</b>
                        <span>{row.note}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {!loading && filters.focus === 'propostas' ? (
            <div className="gestorx-detail-grid gestorx-detail-grid-propostas">
              <section className="gestorx-detail-card wide">
                <header className="gestorx-section-head">
                  <div>
                    <span className="gestorx-kicker">Visao analitica</span>
                    <h3>{primaryTitle}</h3>
                    <p>Evolucao acumulada por status da carteira filtrada.</p>
                  </div>
                  <Legend
                    items={[
                      { label: 'Aprovadas', color: '#4f8cff' },
                      { label: 'Condicionadas', color: '#f59e0b' },
                      { label: 'Reprovadas', color: '#ef4444' },
                      { label: 'Total', color: '#14b8a6' },
                      { label: 'Meta', color: '#64748b', dashed: true },
                      { label: 'Forecast', color: '#22c55e', dashed: true },
                    ]}
                  />
                </header>

                <ComposedChart
                  labels={proposalAnalytics.labels}
                  lineSeries={[
                    { label: 'Aprovadas', color: '#4f8cff', data: proposalAnalytics.cumulativeApproved },
                    { label: 'Condicionadas', color: '#f59e0b', data: proposalAnalytics.cumulativeConditioned },
                    { label: 'Reprovadas', color: '#ef4444', data: proposalAnalytics.cumulativeRejected },
                    { label: 'Total', color: '#14b8a6', data: proposalAnalytics.cumulativeTotal },
                    { label: 'Meta', color: '#64748b', data: proposalAnalytics.cumulativeMeta, dashed: true },
                    { label: 'Forecast', color: '#22c55e', data: proposalAnalytics.cumulativeForecast, dashed: true },
                  ]}
                />
              </section>

              <section className="gestorx-detail-card wide">
                <header className="gestorx-section-head">
                  <div>
                    <h3>Propostas no dia por situacao</h3>
                    <p>Volume diario e linha de meta util no recorte.</p>
                  </div>
                  <Legend
                    items={[
                      { label: 'Aprovadas', color: '#4f8cff' },
                      { label: 'Condicionadas', color: '#f59e0b' },
                      { label: 'Reprovadas', color: '#ef4444' },
                      { label: 'Total', color: '#14b8a6' },
                      { label: 'Meta dia', color: '#94a3b8', dashed: true },
                    ]}
                  />
                </header>

                <ComposedChart
                  labels={proposalAnalytics.labels}
                  barSeries={[
                    { label: 'Aprovadas', color: '#4f8cff', data: proposalAnalytics.dailyApproved },
                    { label: 'Condicionadas', color: '#f59e0b', data: proposalAnalytics.dailyConditioned },
                    { label: 'Reprovadas', color: '#ef4444', data: proposalAnalytics.dailyRejected },
                  ]}
                  lineSeries={[
                    { label: 'Total', color: '#14b8a6', data: proposalAnalytics.dailyTotal },
                    { label: 'Meta dia', color: '#94a3b8', data: proposalAnalytics.metaDay, dashed: true },
                  ]}
                />
              </section>

              <div className="gestorx-stat-row">
                <SummaryBlock label="Aprovadas" value={formatNumber(proposalAnalytics.approved)} tone="neutral" />
                <SummaryBlock label="Condicionadas" value={formatNumber(proposalAnalytics.conditioned)} tone="warn" />
                <SummaryBlock label="Reprovadas" value={formatNumber(proposalAnalytics.rejected)} tone="danger" />
                <SummaryBlock label="Com resposta" value={formatNumber(proposalAnalytics.responded)} note="Soma das decisoes no recorte" tone="neutral" />
                <SummaryBlock label="Aprovacao" value={formatPercent(proposalAnalytics.approvalRate)} tone={proposalAnalytics.approvalRate >= 40 ? 'ok' : 'warn'} />
              </div>
            </div>
          ) : null}

          {!loading && filters.focus === 'ipc' ? (
            <div className="gestorx-detail-grid gestorx-detail-grid-ipc">
              <section className="gestorx-detail-card wide">
                <header className="gestorx-section-head">
                  <div>
                    <span className="gestorx-kicker">Visao analitica</span>
                    <h3>{primaryTitle}</h3>
                    <p>Repasses acumulados e eficiencia relativa da carteira filtrada.</p>
                  </div>
                  <Legend
                    items={[
                      { label: 'IPC Corretor', color: '#4f8cff' },
                      { label: 'IPC Imobiliaria', color: '#14b8a6' },
                      { label: 'IPC Corretor anterior', color: '#64748b', dashed: true },
                      { label: 'IPC Imobiliaria anterior', color: '#94a3b8', dashed: true },
                      { label: 'Volume acumulado', color: '#cbd5e1' },
                    ]}
                  />
                </header>

                <ComposedChart
                  labels={ipcAnalytics.labels}
                  barSeries={[{ label: 'Volume acumulado', color: '#cbd5e1', data: ipcAnalytics.cumulativeSigned }]}
                  lineSeries={[
                    { label: 'IPC Corretor', color: '#4f8cff', data: ipcAnalytics.cumulativeIpcCorretor },
                    { label: 'IPC Imobiliaria', color: '#14b8a6', data: ipcAnalytics.cumulativeIpcImobiliaria },
                    { label: 'IPC Corretor anterior', color: '#64748b', data: ipcAnalytics.previousIpcCorretor, dashed: true },
                    { label: 'IPC Imobiliaria anterior', color: '#94a3b8', data: ipcAnalytics.previousIpcImobiliaria, dashed: true },
                  ]}
                />
              </section>

              <section className="gestorx-detail-card wide">
                <header className="gestorx-section-head">
                  <div>
                    <h3>Analise de repasses e base ativa por dia</h3>
                    <p>Leitura de entrada diaria e eficiencia media por corretor.</p>
                  </div>
                  <Legend
                    items={[
                      { label: 'Volume do dia', color: '#cbd5e1' },
                      { label: 'Repasses do dia', color: '#4f8cff' },
                      { label: 'IPC do dia', color: '#4f8cff' },
                      { label: 'Meta IPC', color: '#14b8a6', dashed: true },
                    ]}
                  />
                </header>

                <ComposedChart
                  labels={ipcAnalytics.labels}
                  barSeries={[
                    { label: 'Volume do dia', color: '#cbd5e1', data: ipcAnalytics.dailyVolume },
                    { label: 'Repasses do dia', color: '#4f8cff', data: ipcAnalytics.dailySigned },
                  ]}
                  lineSeries={[
                    { label: 'IPC do dia', color: '#4f8cff', data: ipcAnalytics.dailyIpc },
                    { label: 'Meta IPC', color: '#14b8a6', data: ipcAnalytics.metaIpc, dashed: true },
                  ]}
                />
              </section>

              <div className="gestorx-stat-row">
                <SummaryBlock label="Total de repasses" value={formatNumber(ipcAnalytics.repasses)} tone="neutral" />
                <SummaryBlock label="Corretores ativos" value={formatNumber(ipcAnalytics.corretoresAtivos)} tone="neutral" />
                <SummaryBlock label="Imobiliarias ativas" value={formatNumber(ipcAnalytics.imobiliariasAtivas)} tone="neutral" />
                <SummaryBlock label="IPC Corretor" value={formatDecimal(ipcAnalytics.ipcCorretor)} note={compactPercent(ipcAnalytics.comparePercent)} tone="warn" />
                <SummaryBlock label="IPC Imobiliaria" value={formatDecimal(ipcAnalytics.ipcImobiliaria)} tone="ok" />
              </div>

              <RankingList title="Visao por Corretor" subtitle="Repasses e eficiencia por corretor ativo." rows={ipcAnalytics.rankingCorretores} accent="blue" />
              <RankingList title="Visao por Imobiliaria" subtitle="Repasses e IPC por imobiliaria ativa." rows={ipcAnalytics.rankingImobiliarias} accent="amber" />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
