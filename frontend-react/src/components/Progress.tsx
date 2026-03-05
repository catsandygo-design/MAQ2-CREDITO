interface ProgressProps {
  value: number
  label: string
}

export default function Progress({ value, label }: ProgressProps) {
  const normalized = Math.min(Math.max(value, 0), 100)

  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-cockpit-accent transition-all"
          style={{ width: `${normalized}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-600">{label}</p>
    </div>
  )
}
