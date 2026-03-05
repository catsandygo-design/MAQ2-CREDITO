import Chips from './Chips'
import { STAGES } from '../config/stages'

const stageById = Object.fromEntries(STAGES.map((stage) => [stage.id, stage]))

const ownerLabel = {
  corretor: 'Corretor',
  cliente: 'Cliente',
  credito: 'Credito',
  conformidade: 'Conformidade',
}

function Card({ process, onClick, compact = false }) {
  const stage = stageById[process.stage]
  const slaBreached = process.slaHours <= 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-cockpit-ink">{process.id}</p>
        <div className="flex flex-wrap items-center gap-1">
          <Chips tone={stage?.chipTone || 'neutral'}>{stage?.label || process.stage}</Chips>
          <Chips tone={slaBreached ? 'danger' : 'info'}>
            {slaBreached ? 'SLA estourado' : `SLA ${process.slaHours}h`}
          </Chips>
          <Chips tone={process.severity === 'alta' ? 'danger' : 'warn'}>
            Sev {process.severity}
          </Chips>
        </div>
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold text-slate-800">{process.title}</h3>

      {!compact && (
        <div className="mt-3 grid gap-1 text-xs text-slate-600">
          <p>
            <span className="font-semibold text-slate-700">Cliente:</span> {process.cliente}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Imobiliaria:</span> {process.imobiliaria}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Aging:</span> {process.agingHours}h
          </p>
          <p>
            <span className="font-semibold text-slate-700">Proxima acao:</span>{' '}
            {ownerLabel[process.nextOwner] || process.nextOwner}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Causa:</span> {process.cause}
          </p>
        </div>
      )}
    </button>
  )
}

export default Card
