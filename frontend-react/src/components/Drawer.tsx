import Chips from './Chips'
import type { CockpitProcess } from '../data/mockProcesses'

const drawerTabs = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'evidencias', label: 'Evidencias' },
  { id: 'timeline', label: 'Linha do tempo' },
] as const

export type DrawerTab = (typeof drawerTabs)[number]['id']

const ownerLabel: Record<CockpitProcess['nextOwner'], string> = {
  corretor: 'Corretor',
  cliente: 'Cliente',
  credito: 'Credito',
  conformidade: 'Conformidade',
}

interface DrawerProps {
  open: boolean
  process: CockpitProcess | null
  tab: DrawerTab
  onTabChange: (tab: DrawerTab) => void
  onClose: () => void
  onAddEvidence: () => void
  onChangeOwner: () => void
  onResolve: () => void
}

export default function Drawer({
  open,
  process,
  tab,
  onTabChange,
  onClose,
  onAddEvidence,
  onChangeOwner,
  onResolve,
}: DrawerProps) {
  if (!open || !process) {
    return null
  }

  const slaBreached = process.slaHours <= 0

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Fechar drawer"
        className="absolute inset-0 bg-slate-900/35"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-[460px] overflow-y-auto border-l border-slate-200 bg-cockpit-panel p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Processo</p>
            <h2 className="text-lg font-bold text-cockpit-ink">{process.id}</h2>
            <p className="text-sm text-slate-600">{process.title}</p>
          </div>
          <button type="button" className="cp-btn cp-btn-ghost px-3 py-1.5" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          <Chips tone={slaBreached ? 'danger' : 'info'}>
            {slaBreached ? 'SLA estourado' : `SLA ${process.slaHours}h`}
          </Chips>
          <Chips tone={process.severity === 'alta' ? 'danger' : 'warn'}>Sev {process.severity}</Chips>
          <Chips tone="neutral">Aging {process.agingHours}h</Chips>
          <Chips tone="success">Dono: {ownerLabel[process.nextOwner]}</Chips>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" className="cp-btn cp-btn-secondary text-xs" onClick={onAddEvidence}>
            Registrar evidencia
          </button>
          <button type="button" className="cp-btn cp-btn-secondary text-xs" onClick={onChangeOwner}>
            Trocar dono
          </button>
          <button type="button" className="cp-btn cp-btn-primary text-xs" onClick={onResolve}>
            Marcar resolvido
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {drawerTabs.map((drawerTab) => (
            <button
              key={drawerTab.id}
              type="button"
              className={`cp-tab ${tab === drawerTab.id ? 'cp-tab-active' : ''}`}
              onClick={() => onTabChange(drawerTab.id)}
            >
              {drawerTab.label}
            </button>
          ))}
        </div>

        {tab === 'resumo' && (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">Cliente:</span> {process.cliente}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Imobiliaria:</span> {process.imobiliaria}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Etapa:</span> {process.stage}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Causa:</span> {process.cause}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Retrabalho proxy:</span>{' '}
              {process.reworkScore}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Status:</span>{' '}
              {process.resolved ? 'Resolvido' : 'Em aberto'}
            </p>
          </div>
        )}

        {tab === 'evidencias' && (
          <div className="space-y-2">
            {process.evidencias.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                Nenhuma evidencia registrada.
              </div>
            )}
            {process.evidencias.map((evidence) => (
              <div key={evidence.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                <p className="mb-1 text-xs text-slate-500">{evidence.at}</p>
                <p className="text-slate-700">{evidence.text}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'timeline' && (
          <div className="space-y-2">
            {process.timeline.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                Sem eventos na linha do tempo.
              </div>
            )}
            {process.timeline.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                <p className="mb-1 text-xs text-slate-500">{entry.at}</p>
                <p className="text-slate-700">{entry.text}</p>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}
