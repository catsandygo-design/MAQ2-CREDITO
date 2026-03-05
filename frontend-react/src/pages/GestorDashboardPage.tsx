import { useMemo, useState } from 'react'
import Card from '../components/Card'
import Drawer, { type DrawerTab } from '../components/Drawer'
import Metrics from '../components/Metrics'
import Progress from '../components/Progress'
import { PHASES } from '../config/phases'
import { OWNER_OPTIONS, STAGES } from '../config/stages'
import type { CockpitProcess } from '../data/mockProcesses'
import { MOCK_PROCESSES } from '../data/mockProcesses'

const TABS = ['AGORA', 'Kanban', 'Etapas', 'Causas', 'Relatorio'] as const
type MainTab = (typeof TABS)[number]
type ChecklistState = Record<string, Record<string, boolean>>

const severityRank: Record<CockpitProcess['severity'], number> = {
  alta: 0,
  media: 1,
  baixa: 2,
}

const phaseById = Object.fromEntries(PHASES.map((phase) => [phase.id, phase]))

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const formatDateTime = (date = new Date()): string =>
  date.toLocaleString('pt-BR', {
    hour12: false,
  })

const cloneProcess = (process: CockpitProcess): CockpitProcess => ({
  ...process,
  evidencias: [...process.evidencias],
  timeline: [...process.timeline],
})

const buildInitialChecklistState = (): ChecklistState =>
  PHASES.reduce<ChecklistState>((acc, phase) => {
    acc[phase.id] = phase.checklist.reduce<Record<string, boolean>>((phaseItems, item) => {
      phaseItems[item.id] = false
      return phaseItems
    }, {})
    return acc
  }, {})

const prioritySort = (a: CockpitProcess, b: CockpitProcess): number => {
  const aBreached = a.slaHours <= 0
  const bBreached = b.slaHours <= 0

  if (aBreached !== bBreached) {
    return aBreached ? -1 : 1
  }

  const sevDiff = severityRank[a.severity] - severityRank[b.severity]
  if (sevDiff !== 0) {
    return sevDiff
  }

  return b.agingHours - a.agingHours
}

export function GestorDashboardPage() {
  const [processes, setProcesses] = useState<CockpitProcess[]>(() => MOCK_PROCESSES.map(cloneProcess))
  const [activePhaseId, setActivePhaseId] = useState<string>(PHASES[0]?.id || '09:00')
  const [activeTab, setActiveTab] = useState<MainTab>('AGORA')
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('resumo')
  const [showRail, setShowRail] = useState(true)
  const [morningSnapshot, setMorningSnapshot] = useState('')
  const [daySnapshot, setDaySnapshot] = useState('')
  const [closeLogs, setCloseLogs] = useState<string[]>([])
  const [checklistByPhase, setChecklistByPhase] = useState<ChecklistState>(buildInitialChecklistState)

  const activePhase = phaseById[activePhaseId] ?? PHASES[0]
  const activeChecklistState = checklistByPhase[activePhase.id] || {}

  const openProcesses = useMemo(
    () => processes.filter((process) => !process.resolved),
    [processes],
  )

  const nowProcesses = useMemo(
    () => openProcesses.filter(activePhase.focus).sort(prioritySort),
    [openProcesses, activePhase],
  )

  const selectedProcess = useMemo(
    () => processes.find((process) => process.id === selectedProcessId) || null,
    [processes, selectedProcessId],
  )

  const metrics = useMemo(() => {
    const slaBreached = openProcesses.filter((process) => process.slaHours <= 0).length
    const sevHigh = openProcesses.filter((process) => process.severity === 'alta').length
    const reworkProxy = openProcesses.filter((process) => process.reworkScore > 0).length
    return {
      openCount: openProcesses.length,
      slaBreached,
      sevHigh,
      reworkProxy,
    }
  }, [openProcesses])

  const stageRows = useMemo(() => {
    const total = Math.max(openProcesses.length, 1)
    return STAGES.map((stage) => {
      const count = openProcesses.filter((process) => process.stage === stage.id).length
      return {
        ...stage,
        count,
        percent: Math.round((count / total) * 100),
      }
    })
  }, [openProcesses])

  const causeRows = useMemo(() => {
    const totals: Record<string, number> = {}
    openProcesses.forEach((process) => {
      totals[process.cause] = (totals[process.cause] || 0) + 1
    })
    const max = Math.max(...Object.values(totals), 1)
    return Object.entries(totals)
      .map(([cause, count]) => ({
        cause,
        count,
        percent: Math.round((count / max) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }, [openProcesses])

  const reportText = useMemo(() => {
    const lines = []
    lines.push('Cockpit Operacional do Credito (09:00 -> 17:00)')
    lines.push(`Gerado em: ${formatDateTime()}`)
    lines.push('')
    lines.push(morningSnapshot || 'Foto da manha: nao registrada.')
    lines.push('')
    lines.push(daySnapshot || 'Foto do dia: nao registrada.')
    lines.push('')
    lines.push('Fechamentos de fase:')

    if (closeLogs.length === 0) {
      lines.push('- Nenhum fechamento registrado.')
    } else {
      closeLogs.forEach((entry) => lines.push(`- ${entry}`))
    }

    return lines.join('\n')
  }, [morningSnapshot, daySnapshot, closeLogs])

  const runSnapshot = (label: 'Foto da manha' | 'Foto do dia') => {
    const text = [
      `${label} (${formatDateTime()})`,
      `Em aberto: ${metrics.openCount}`,
      `SLA estourado: ${metrics.slaBreached}`,
      `Sev alta: ${metrics.sevHigh}`,
      `Retrabalho proxy: ${metrics.reworkProxy}`,
      `Em foco (${activePhase.id}): ${nowProcesses.length}`,
    ].join('\n')

    if (label === 'Foto da manha') {
      setMorningSnapshot(text)
      return
    }
    setDaySnapshot(text)
  }

  const updateProcess = (processId: string, updater: (process: CockpitProcess) => CockpitProcess) => {
    setProcesses((prev) =>
      prev.map((process) => (process.id === processId ? updater(process) : process)),
    )
  }

  const addTimelineEntry = (process: CockpitProcess, message: string): CockpitProcess => ({
    ...process,
    timeline: [
      {
        id: createId(),
        at: formatDateTime(),
        text: message,
      },
      ...process.timeline,
    ],
  })

  const handlePhaseClick = (phaseId: string) => {
    setActivePhaseId(phaseId)
    setActiveTab('AGORA')
  }

  const handleChecklistToggle = (itemId: string) => {
    setChecklistByPhase((prev) => ({
      ...prev,
      [activePhase.id]: {
        ...(prev[activePhase.id] || {}),
        [itemId]: !(prev[activePhase.id] || {})[itemId],
      },
    }))
  }

  const handleClosePhase = () => {
    const checklistState = checklistByPhase[activePhase.id] || {}
    const pending = Object.values(checklistState).filter((value) => !value).length
    const logLine = `${formatDateTime()} | ${activePhase.id} ${activePhase.name} | checklist pendente: ${pending} | processos em foco: ${nowProcesses.length}`
    setCloseLogs((prev) => [...prev, logLine])
  }

  const handleSelectProcess = (processId: string) => {
    setSelectedProcessId(processId)
    setDrawerTab('resumo')
  }

  const handleAddEvidence = (processId: string) => {
    const evidenceText = window.prompt('Registrar evidencia:')
    if (!evidenceText || !evidenceText.trim()) {
      return
    }

    updateProcess(processId, (process) => {
      const evidence = {
        id: createId(),
        at: formatDateTime(),
        text: evidenceText.trim(),
      }
      const withEvidence: CockpitProcess = {
        ...process,
        evidencias: [evidence, ...process.evidencias],
      }
      return addTimelineEntry(withEvidence, `Evidencia registrada: ${evidenceText.trim()}`)
    })
  }

  const handleChangeOwner = (processId: string) => {
    const currentOwner = processes.find((process) => process.id === processId)?.nextOwner || ''
    const owner = window.prompt(
      `Trocar dono da proxima acao (${OWNER_OPTIONS.join('/')})`,
      currentOwner,
    )
    if (!owner) {
      return
    }

    const normalizedOwner = owner.trim().toLowerCase()
    const isValid = OWNER_OPTIONS.some((option) => option === normalizedOwner)
    if (!isValid) {
      window.alert(`Dono invalido. Use: ${OWNER_OPTIONS.join(', ')}`)
      return
    }

    updateProcess(processId, (process) =>
      addTimelineEntry(
        {
          ...process,
          nextOwner: normalizedOwner as CockpitProcess['nextOwner'],
        },
        `Dono da proxima acao alterado para ${normalizedOwner}`,
      ),
    )
  }

  const handleResolve = (processId: string) => {
    updateProcess(processId, (process) =>
      addTimelineEntry(
        {
          ...process,
          resolved: true,
        },
        'Processo marcado como resolvido',
      ),
    )
  }

  return (
    <div className="min-h-screen bg-cockpit-bg">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-cockpit-panel/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-4 py-3 lg:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Cockpit Operacional do Credito
              </p>
              <h1 className="text-xl font-bold text-cockpit-ink">09:00 -&gt; 17:00</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="cp-btn cp-btn-secondary" onClick={() => runSnapshot('Foto da manha')}>
                Foto da manha
              </button>
              <button className="cp-btn cp-btn-secondary" onClick={() => runSnapshot('Foto do dia')}>
                Foto do dia
              </button>
              <button className="cp-btn cp-btn-primary" onClick={handleClosePhase}>
                Fechar fase
              </button>
              <button className="cp-btn cp-btn-ghost" onClick={() => setShowRail((prev) => !prev)}>
                {showRail ? 'Ocultar trilho' : 'Mostrar trilho'}
              </button>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <Metrics label="Em aberto" value={metrics.openCount} tone="info" />
            <Metrics label="SLA estourado" value={metrics.slaBreached} tone="danger" />
            <Metrics label="Sev alta" value={metrics.sevHigh} tone="warn" />
            <Metrics label="Retrabalho proxy" value={metrics.reworkProxy} tone="neutral" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-4 px-4 py-4 lg:px-6">
        {showRail && (
          <aside className="cp-panel sticky top-28 hidden h-[calc(100vh-7.6rem)] w-[300px] shrink-0 overflow-y-auto p-4 lg:block">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Trilho do dia
            </h2>
            <div className="space-y-2">
              {PHASES.map((phase) => {
                const isActive = phase.id === activePhase.id
                return (
                  <button
                    key={phase.id}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      isActive
                        ? 'border-cockpit-ink bg-cockpit-ink text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                    onClick={() => handlePhaseClick(phase.id)}
                  >
                    <p className="text-sm font-semibold">
                      {phase.id} - {phase.name}
                    </p>
                    <p className={`text-xs ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {phase.goal}
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-cockpit-ink">
                Checklist de saida ({activePhase.id})
              </p>
              <div className="space-y-2">
                {activePhase.checklist.map((item) => (
                  <label key={item.id} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cockpit-accent focus:ring-cockpit-accent"
                      checked={Boolean(activeChecklistState[item.id])}
                      onChange={() => handleChecklistToggle(item.id)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>
        )}

        <main className="min-w-0 flex-1 space-y-4">
          {showRail && (
            <div className="cp-panel p-3 lg:hidden">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Trilho do dia (mobile)
              </h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {PHASES.map((phase) => (
                  <button
                    key={phase.id}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold ${
                      phase.id === activePhase.id
                        ? 'border-cockpit-ink bg-cockpit-ink text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                    onClick={() => handlePhaseClick(phase.id)}
                  >
                    {phase.id}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="cp-panel p-2">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  className={`cp-tab ${activeTab === tab ? 'cp-tab-active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'AGORA' && (
            <section className="space-y-4">
              <div className="cp-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-cockpit-ink">
                      AGORA - Foco {activePhase.id} ({activePhase.name})
                    </h2>
                    <p className="text-sm text-slate-600">{activePhase.goal}</p>
                  </div>
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                    {nowProcesses.length} processo(s) em foco
                  </span>
                </div>
              </div>

              {nowProcesses.length === 0 && (
                <div className="cp-panel p-6 text-sm text-slate-600">
                  Nenhum processo em foco nesta fase. Selecione outra fase no trilho para mudar o AGORA.
                </div>
              )}

              <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                {nowProcesses.map((process) => (
                  <Card key={process.id} process={process} onClick={() => handleSelectProcess(process.id)} />
                ))}
              </div>
            </section>
          )}

          {activeTab === 'Kanban' && (
            <section className="cp-panel p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-cockpit-ink">Kanban por etapa</h2>
                <span className="text-sm text-slate-500">{openProcesses.length} em aberto</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {STAGES.map((stage) => {
                  const stageProcesses = openProcesses.filter((process) => process.stage === stage.id)
                  return (
                    <div
                      key={stage.id}
                      className="min-h-[420px] min-w-[280px] flex-1 rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-semibold text-cockpit-ink">{stage.label}</h3>
                        <span className="text-xs text-slate-500">{stageProcesses.length}</span>
                      </div>
                      <div className="space-y-2">
                        {stageProcesses.map((process) => (
                          <Card
                            key={process.id}
                            process={process}
                            compact
                            onClick={() => handleSelectProcess(process.id)}
                          />
                        ))}
                        {stageProcesses.length === 0 && (
                          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
                            Sem itens nesta etapa.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {activeTab === 'Etapas' && (
            <section className="cp-panel space-y-3 p-4">
              <h2 className="text-lg font-semibold text-cockpit-ink">Etapas e distribuicao da fila</h2>
              {stageRows.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-cockpit-ink">{row.label}</span>
                    <span className="text-slate-500">{row.count} processo(s)</span>
                  </div>
                  <Progress value={row.percent} label={`${row.percent}% da fila em aberto`} />
                </div>
              ))}
            </section>
          )}

          {activeTab === 'Causas' && (
            <section className="cp-panel space-y-3 p-4">
              <h2 className="text-lg font-semibold text-cockpit-ink">Causas dominantes do dia</h2>
              {causeRows.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Sem causas em aberto.
                </div>
              )}
              {causeRows.map((row) => (
                <div key={row.cause} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-cockpit-ink">{row.cause}</span>
                    <span className="text-xs text-slate-500">{row.count} ocorrencia(s)</span>
                  </div>
                  <Progress value={row.percent} label={`${row.percent}% do pico de causa`} />
                </div>
              ))}
            </section>
          )}

          {activeTab === 'Relatorio' && (
            <section className="cp-panel p-4">
              <h2 className="mb-3 text-lg font-semibold text-cockpit-ink">Relatorio operacional</h2>
              <pre className="min-h-[360px] rounded-xl bg-slate-950 p-4 text-xs text-emerald-200 whitespace-pre-wrap">
                {reportText}
              </pre>
            </section>
          )}
        </main>
      </div>

      <Drawer
        open={Boolean(selectedProcess)}
        process={selectedProcess}
        tab={drawerTab}
        onTabChange={setDrawerTab}
        onClose={() => setSelectedProcessId(null)}
        onAddEvidence={() => selectedProcess && handleAddEvidence(selectedProcess.id)}
        onChangeOwner={() => selectedProcess && handleChangeOwner(selectedProcess.id)}
        onResolve={() => selectedProcess && handleResolve(selectedProcess.id)}
      />
    </div>
  )
}
