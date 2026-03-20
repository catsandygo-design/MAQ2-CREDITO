import { useEffect, useState } from 'react'
import { fetchSession, logout } from '../lib/api'

type UnitType = 'TIPO/MOTO' | 'TIPO/CARRO' | 'GARDEN FIT' | 'GARDEN' | 'SUPER GARDEN'

const UNIT_TYPES: UnitType[] = ['TIPO/MOTO', 'TIPO/CARRO', 'GARDEN FIT', 'GARDEN', 'SUPER GARDEN']

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const parseCurrencyInput = (value: string) => {
  const raw = value.trim()
  if (!raw) return 0

  let normalized = raw.replace(/\s+/g, '')
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const buildBadge = (value: string) => {
  const initials = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')

  return initials || 'SC'
}

export function PresentationPage() {
  const [authReady, setAuthReady] = useState(false)
  const [corretorNome, setCorretorNome] = useState('')
  const [saindo, setSaindo] = useState(false)
  const [empreendimento, setEmpreendimento] = useState('Residencial Soho Prime')
  const [unitType, setUnitType] = useState<UnitType>('GARDEN')
  const [precoUnidade, setPrecoUnidade] = useState('645000')
  const [financiamento, setFinanciamento] = useState('460000')
  const [subsidio, setSubsidio] = useState('160000')
  const [prosoluto, setProsoluto] = useState('25000')
  const [sinal, setSinal] = useState('45000')
  const [chequeMoradia, setChequeMoradia] = useState('20000')
  const [mostrarResumo, setMostrarResumo] = useState(false)

  useEffect(() => {
    let cancelled = false

    const validateAccess = async () => {
      try {
        const session = await fetchSession()
        if (cancelled) return

        if (session.must_change_password) {
          window.location.href = session.home || '/app/trocar-senha'
          return
        }

        const role = String(session.role || '').toLowerCase()
        if (role !== 'corretor') {
          window.location.href = session.home || '/app'
          return
        }

        setCorretorNome(session.username || 'Corretor')
        setAuthReady(true)
      } catch {
        window.location.href = '/login'
      }
    }

    void validateAccess()

    return () => {
      cancelled = true
    }
  }, [])

  const parsedFinanciamento = parseCurrencyInput(financiamento)
  const parsedSubsidio = parseCurrencyInput(subsidio)
  const parsedPreco = parseCurrencyInput(precoUnidade)
  const parsedProsoluto = parseCurrencyInput(prosoluto)
  const parsedSinal = parseCurrencyInput(sinal)
  const parsedChequeMoradia = parseCurrencyInput(chequeMoradia)

  const garantido = parsedFinanciamento + parsedSubsidio
  const saldo = Math.max(
    0,
    parsedPreco - (parsedFinanciamento + parsedSubsidio + parsedSinal + parsedProsoluto + parsedChequeMoradia),
  )

  const pctFinanciamento = parsedPreco > 0 ? (parsedFinanciamento / parsedPreco) * 100 : 0
  const pctSubsidio = parsedPreco > 0 ? (parsedSubsidio / parsedPreco) * 100 : 0

  const getProgressBarStyle = (value: number) => ({ width: `${Math.min(100, Math.max(0, value))}%` })

  const handleLogout = async () => {
    if (saindo) return

    setSaindo(true)
    try {
      await logout()
    } catch {
      // Redirect anyway so the corretor is not stranded in the presentation page.
    } finally {
      window.location.href = '/login'
    }
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#0f172a_55%,#020617_100%)] p-4 text-white md:p-8">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="w-full rounded-[28px] border border-white/15 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">SioCred Showcase</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Validando acesso</h1>
            <p className="mt-3 text-sm text-slate-200">
              Conferindo a sessao do corretor para liberar a apresentacao comercial.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a_0%,#0f172a_55%,#020617_100%)] p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-[28px] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl md:flex md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-600 text-lg font-black text-slate-950 shadow-lg">
              {buildBadge(empreendimento)}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Apresentacao Comercial</p>
              <h1 className="text-2xl font-black tracking-tight text-white">Fluxo de proposta para o cliente</h1>
              <p className="mt-1 text-sm text-slate-200">Tela paralela de apoio para o corretor conduzir a conversa.</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 md:mt-0 md:justify-end">
            <div className="rounded-2xl border border-white/15 bg-slate-950/35 px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">Corretor</p>
              <p className="text-sm font-semibold text-white">{corretorNome}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-slate-950/35 px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">Empreendimento</p>
              <p className="text-sm font-semibold text-white">{empreendimento}</p>
              <p className="text-xs text-slate-300">{unitType}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={saindo}
              className="rounded-2xl border border-rose-300/30 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saindo ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="space-y-5 rounded-[28px] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Simulador</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Painel comercial interativo</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-200">
                  Ajuste as variaveis para apresentar composicao da proposta, folga de entrada e margem de fechamento.
                </p>
              </div>
              <div className="hidden rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-right lg:block">
                <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-200">Saldo restante</p>
                <p className="mt-1 text-xl font-black text-white">{formatCurrency(saldo)}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                Empreendimento
                <input
                  type="text"
                  value={empreendimento}
                  onChange={(event) => setEmpreendimento(event.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>
              <label className="space-y-2 text-sm">
                Tipo de unidade
                <select
                  value={unitType}
                  onChange={(event) => setUnitType(event.target.value as UnitType)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                >
                  {UNIT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                Preco da unidade
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={precoUnidade}
                  onChange={(event) => setPrecoUnidade(event.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>
              <label className="space-y-2 text-sm">
                Financiamento
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={financiamento}
                  onChange={(event) => setFinanciamento(event.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>
              <label className="space-y-2 text-sm">
                Subsidio
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={subsidio}
                  onChange={(event) => setSubsidio(event.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>
              <label className="space-y-2 text-sm">
                Prosoluto
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={prosoluto}
                  onChange={(event) => setProsoluto(event.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>
              <label className="space-y-2 text-sm">
                Sinal
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={sinal}
                  onChange={(event) => setSinal(event.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>
              <label className="space-y-2 text-sm">
                Cheque moradia
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={chequeMoradia}
                  onChange={(event) => setChequeMoradia(event.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setMostrarResumo((previous) => !previous)}
                className="rounded-2xl border border-cyan-300/40 bg-cyan-500/20 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35"
              >
                {mostrarResumo ? 'Ocultar resumo da proposta' : 'Exibir resumo da proposta'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmpreendimento('Residencial Soho Prime')
                  setUnitType('GARDEN')
                  setPrecoUnidade('645000')
                  setFinanciamento('460000')
                  setSubsidio('160000')
                  setProsoluto('25000')
                  setSinal('45000')
                  setChequeMoradia('20000')
                  setMostrarResumo(false)
                }}
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Resetar valores
              </button>
            </div>

            {mostrarResumo ? (
              <div className="rounded-[24px] border border-cyan-200/20 bg-gradient-to-br from-cyan-950/40 to-indigo-950/30 p-5">
                <h3 className="mb-3 text-lg font-bold tracking-tight">Resumo comercial</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <p>
                    Empreendimento: <strong>{empreendimento}</strong>
                  </p>
                  <p>
                    Tipo de unidade: <strong>{unitType}</strong>
                  </p>
                  <p>
                    Preco unidade: <strong>{formatCurrency(parsedPreco)}</strong>
                  </p>
                  <p>
                    Garantido: <strong>{formatCurrency(garantido)}</strong>
                  </p>
                  <p>
                    Cheque moradia: <strong>{formatCurrency(parsedChequeMoradia)}</strong>
                  </p>
                  <p>
                    Saldo restante: <strong>{formatCurrency(saldo)}</strong>
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="space-y-5 rounded-[28px] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Leitura executiva</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Indicadores financeiros</h2>
              <p className="mt-2 text-sm text-slate-200">
                Use os blocos laterais para explicar composicao, cobertura garantida e esforco imediato do cliente.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] bg-slate-950/60 p-4">
                <div className="mb-2 flex justify-between text-sm text-slate-300">
                  <span>Financiamento ({pctFinanciamento.toFixed(1)}%)</span>
                  <span>{formatCurrency(parsedFinanciamento)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-400 transition" style={getProgressBarStyle(pctFinanciamento)} />
                </div>
              </div>

              <div className="rounded-[24px] bg-slate-950/60 p-4">
                <div className="mb-2 flex justify-between text-sm text-slate-300">
                  <span>Subsidio ({pctSubsidio.toFixed(1)}%)</span>
                  <span>{formatCurrency(parsedSubsidio)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-400 transition" style={getProgressBarStyle(pctSubsidio)} />
                </div>
              </div>

              <div className="rounded-[24px] bg-slate-950/60 p-4">
                <div className="mb-2 flex justify-between text-sm text-slate-300">
                  <span>Garantido</span>
                  <span>{formatCurrency(garantido)}</span>
                </div>
                <p className="text-xs text-slate-300">Financiamento + subsidio</p>
              </div>

              <div className="rounded-[24px] bg-slate-950/60 p-4">
                <div className="mb-2 flex justify-between text-sm text-slate-300">
                  <span>Sinal + prosoluto + cheque moradia</span>
                  <span>{formatCurrency(parsedSinal + parsedProsoluto + parsedChequeMoradia)}</span>
                </div>
                <p className="text-xs text-slate-300">Aporte imediato para destravar a operacao</p>
              </div>

              <div className="rounded-[24px] border border-amber-300/20 bg-amber-500/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-amber-200">Narrativa sugerida</p>
                <p className="mt-2 text-sm text-amber-50">
                  Mostre primeiro o valor garantido, depois o saldo e feche com o esforco inicial. A conversa fica mais clara para o cliente.
                </p>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}
