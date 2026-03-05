const tones = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warn: 'bg-amber-100 text-amber-800 border-amber-200',
  danger: 'bg-rose-100 text-rose-800 border-rose-200',
}

function Chips({ tone = 'neutral', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export default Chips
