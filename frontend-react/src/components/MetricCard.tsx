interface MetricCardProps {
  label: string
  value: string | number
  subtitle: string
  tone?: 'neutral' | 'ok' | 'warn' | 'danger'
  active?: boolean
  onClick?: () => void
}

export function MetricCard({
  label,
  value,
  subtitle,
  tone = 'neutral',
  active = false,
  onClick,
}: MetricCardProps) {
  return (
    <button
      type="button"
      className={`metric-card tone-${tone} ${active ? 'active' : ''}`.trim()}
      onClick={onClick}
    >
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      <span className="metric-subtitle">{subtitle}</span>
    </button>
  )
}
