type MetricTone = 'info' | 'danger' | 'warn' | 'neutral'

interface MetricsProps {
  label: string
  value: number
  tone?: MetricTone
}

const toneClass: Record<MetricTone, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  neutral: 'border-slate-200 bg-slate-50 text-slate-800',
}

export default function Metrics({ label, value, tone = 'neutral' }: MetricsProps) {
  return (
    <div className={`rounded-2xl border p-3 ${toneClass[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
