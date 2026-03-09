function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

export interface TimelineStep {
  key: string
  label: string
}

interface TimelineLaneProps {
  title?: string
  steps: TimelineStep[]
  currentKey?: string
  doneKeys?: string[]
  height?: number
  showArrow?: boolean
  hideTitle?: boolean
  titleWidth?: number
  stepTooltips?: Record<string, string>
  className?: string
}

export function TimelineLane({
  title = '',
  steps,
  currentKey,
  doneKeys = [],
  height = 56,
  showArrow = true,
  hideTitle = false,
  titleWidth = 140,
  stepTooltips = {},
  className = '',
}: TimelineLaneProps) {
  const W = 980
  const paddingX = 24
  const lineY = Math.round(height / 2)
  const startX = paddingX + (hideTitle ? 0 : titleWidth)
  const endX = W - paddingX

  const n = steps.length
  if (n === 0) {
    return null
  }

  const gap = n > 1 ? (endX - startX) / (n - 1) : 0

  const currentIndex = steps.findIndex((s) => s.key === currentKey)
  const hasCurrent = currentIndex >= 0
  const ci = hasCurrent ? clamp(currentIndex, 0, n - 1) : 0
  const currentX = startX + ci * gap
  const progressEndX = hasCurrent ? currentX : startX

  const points = steps.map((s, i) => {
    const state: 'done' | 'current' | 'future' = doneKeys.includes(s.key)
      ? 'done'
      : s.key === currentKey
      ? 'current'
      : 'future'
    return {
      ...s,
      x: startX + i * gap,
      y: lineY,
      state,
    }
  })

  const colorFor = (state: 'done' | 'current' | 'future') => {
    if (state === 'done') return '#34d399'
    if (state === 'current') return '#ffffff'
    return '#e2e8f0'
  }

  const strokeFor = (state: 'done' | 'current' | 'future') => {
    if (state === 'done') return '#10b981'
    if (state === 'current') return '#06b6d4'
    return '#cbd5e1'
  }

  const textFor = (state: 'done' | 'current' | 'future') => {
    if (state === 'done') return '#0f766e'
    if (state === 'current') return '#0f172a'
    return '#64748b'
  }

  const arrowTip = clamp(progressEndX + 10, startX + 2, endX + 10)

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <svg className="h-auto min-w-[980px] w-full" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMinYMid meet">
        {!hideTitle ? (
          <text x={paddingX} y={lineY + 5} fill="#334155" fontSize="12" fontWeight="600">
            {title}
          </text>
        ) : null}

        <line x1={startX} y1={lineY} x2={endX} y2={lineY} stroke="#99f6e4" strokeWidth="2" strokeLinecap="round" />

        <line
          x1={startX}
          y1={lineY}
          x2={progressEndX}
          y2={lineY}
          stroke="#2dd4bf"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {showArrow && hasCurrent ? (
          <polygon
            points={`${arrowTip},${lineY} ${arrowTip - 8},${lineY - 5} ${arrowTip - 8},${lineY + 5}`}
            fill="#2dd4bf"
            opacity="0.9"
          />
        ) : null}

        {points.map((p) => (
          <g key={p.key}>
            <title>{stepTooltips[p.key] || p.label}</title>
            <text
              x={p.x}
              y={lineY - 14}
              fill={textFor(p.state)}
              fontSize="11"
              textAnchor="middle"
              fontWeight={p.state === 'current' ? '700' : '500'}
            >
              {p.label}
            </text>

            <circle
              cx={p.x}
              cy={p.y}
              r={p.state === 'current' ? 7 : 6}
              fill={colorFor(p.state)}
              stroke={strokeFor(p.state)}
              strokeWidth={p.state === 'future' ? 2 : 0}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
