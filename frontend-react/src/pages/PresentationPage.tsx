import { useEffect, useState } from 'react'
import { fetchSession, logout } from '../lib/api'
import vilaGirassolBanner from '../assets/vila-girassol-banner.svg'

type UnitType = 'TIPO/MOTO' | 'TIPO/CARRO' | 'GARDEN FIT' | 'GARDEN' | 'SUPER GARDEN'
type Empreendimento = 'VILA GIRASSOL' | 'VILA MARGARIDA' | 'VILA DAS ROSAS'

const UNIT_TYPES: UnitType[] = ['TIPO/MOTO', 'TIPO/CARRO', 'GARDEN FIT', 'GARDEN', 'SUPER GARDEN']
const EMPREENDIMENTOS: Array<{ label: Empreendimento; chequeMoradia: number }> = [
  { label: 'VILA GIRASSOL', chequeMoradia: 45800 },
  { label: 'VILA MARGARIDA', chequeMoradia: 45800 },
  { label: 'VILA DAS ROSAS', chequeMoradia: 47400 },
]

const DEFAULT_FORM_VALUES = {
  empreendimento: 'VILA GIRASSOL' as Empreendimento,
  unitType: 'GARDEN' as UnitType,
  precoUnidade: 220000,
  financiamento: 150000,
  subsidio: 40000,
  prosoluto: 25000,
  sinal: 45000,
}

const MAX_PARCELAS = 80
const MIN_VALOR_PARCELA = 125
const MIN_PROSOLUTO = 8000

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const formatCurrencyFieldValue = (value: number) => {
  if (!Number.isFinite(value)) return '0,00'
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const parseCurrencyInput = (value: string) => {
  const raw = value.replace(/[^\d,.-]/g, '').trim()
  if (!raw) return 0

  const signal = raw.startsWith('-') ? -1 : 1
  const unsigned = raw.replace(/-/g, '')
  const lastComma = unsigned.lastIndexOf(',')
  const lastDot = unsigned.lastIndexOf('.')
  const decimalIndex = Math.max(lastComma, lastDot)

  let normalized = unsigned.replace(/[^\d]/g, '')
  if (decimalIndex >= 0) {
    const integerPart = unsigned.slice(0, decimalIndex).replace(/[^\d]/g, '')
    const fractionPart = unsigned.slice(decimalIndex + 1).replace(/[^\d]/g, '')
    normalized =
      fractionPart.length > 0 && fractionPart.length <= 2 ? `${integerPart || '0'}.${fractionPart}` : integerPart || '0'
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return 0
  return parsed * signal
}

type CurrencyFieldProps = {
  label: string
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
  helperText?: string
  wrapperClassName?: string
}

function CurrencyField({
  label,
  value,
  onChange,
  readOnly = false,
  helperText,
  wrapperClassName = '',
}: CurrencyFieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [draft, setDraft] = useState(() => formatCurrencyFieldValue(value))

  useEffect(() => {
    if (!isFocused) {
      setDraft(formatCurrencyFieldValue(value))
    }
  }, [isFocused, value])

  return (
    <label className={`space-y-2 text-sm ${wrapperClassName}`.trim()}>
      <span>{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-cyan-100/90">
          R$
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={isFocused && !readOnly ? draft : formatCurrencyFieldValue(value)}
          onFocus={() => {
            if (readOnly) return
            setIsFocused(true)
            setDraft(formatCurrencyFieldValue(value))
          }}
          onBlur={() => {
            setIsFocused(false)
            setDraft(formatCurrencyFieldValue(value))
          }}
          onChange={(event) => {
            if (readOnly) return
            const nextValue = event.target.value
            setDraft(nextValue)
            onChange?.(parseCurrencyInput(nextValue))
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            }
          }}
          readOnly={readOnly}
          className={[
            'w-full rounded-2xl border px-4 py-3 pl-12 text-white outline-none transition',
            readOnly
              ? 'border-emerald-300/20 bg-emerald-500/10 text-emerald-50/95'
              : 'border-white/20 bg-slate-950/70 focus:border-cyan-400',
          ].join(' ')}
        />
      </div>
      {helperText ? <span className="block text-xs text-slate-300">{helperText}</span> : null}
    </label>
  )
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
  const [empreendimento, setEmpreendimento] = useState<Empreendimento>(DEFAULT_FORM_VALUES.empreendimento)
  const [unitType, setUnitType] = useState<UnitType>(DEFAULT_FORM_VALUES.unitType)
  const [precoUnidade, setPrecoUnidade] = useState(DEFAULT_FORM_VALUES.precoUnidade)
  const [financiamento, setFinanciamento] = useState(DEFAULT_FORM_VALUES.financiamento)
  const [subsidio, setSubsidio] = useState(DEFAULT_FORM_VALUES.subsidio)
  const [sinal, setSinal] = useState(DEFAULT_FORM_VALUES.sinal)
  const [mostrarResumo, setMostrarResumo] = useState(false)
  const [parcelas, setParcelas] = useState(24)

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

  const chequeMoradia = EMPREENDIMENTOS.find((item) => item.label === empreendimento)?.chequeMoradia ?? 0
  const garantido = financiamento + subsidio + sinal
  const totalObtido = garantido + chequeMoradia
  const precoAjustado =
    precoUnidade < totalObtido ? totalObtido + MIN_PROSOLUTO : Math.max(precoUnidade, totalObtido + MIN_PROSOLUTO)
  const prosolutoEfetivo = Math.max(MIN_PROSOLUTO, precoAjustado - totalObtido)
  const maxParcelasPermitidas =
    prosolutoEfetivo >= MIN_VALOR_PARCELA ? Math.min(MAX_PARCELAS, Math.floor(prosolutoEfetivo / MIN_VALOR_PARCELA)) : 1
  const parcelasHabilitadas = prosolutoEfetivo >= MIN_VALOR_PARCELA
  const parcelasNormalizadas = Math.min(Math.max(parcelas, 1), maxParcelasPermitidas)
  const valorParcela = parcelasHabilitadas ? prosolutoEfetivo / parcelasNormalizadas : prosolutoEfetivo
  const aporteInicial = sinal + valorParcela
  const showGirassolBanner = empreendimento === 'VILA GIRASSOL'

  useEffect(() => {
    if (parcelas > maxParcelasPermitidas) {
      setParcelas(maxParcelasPermitidas || 1)
    }
    if (parcelas < 1) {
      setParcelas(1)
    }
  }, [parcelas, maxParcelasPermitidas])

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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#0b1c48_0%,#0b1530_55%,#050918_100%)] p-4 text-white md:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-400/10 blur-[120px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-6 rounded-[28px] border border-white/15 bg-white/10 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {showGirassolBanner ? (
              <div className="overflow-hidden rounded-[24px] border border-white/25 bg-white/95 shadow-lg">
                <img
                  src={vilaGirassolBanner}
                  alt="Marca do empreendimento Vila Girassol Residencial"
                  className="h-16 w-[250px] object-cover sm:h-20 sm:w-[320px]"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-600 text-lg font-black text-slate-950 shadow-lg">
                {buildBadge(empreendimento)}
              </div>
            )}
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

        <main className="grid gap-6">
          <section className="space-y-5 rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-800/65 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Simulador</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Painel comercial interativo</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-200">
                  Monte a proposta, veja o garantido + cheque e apresente o parcelamento em tempo real.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-right sm:text-left lg:text-right"></div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  Empreendimento
                  <select
                    value={empreendimento}
                    onChange={(event) => setEmpreendimento(event.target.value as Empreendimento)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                >
                  {EMPREENDIMENTOS.map((item) => (
                    <option key={item.label} value={item.label}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <span className="block text-xs text-slate-300">
                  Cheque moradia preenchido automaticamente conforme o empreendimento.
                </span>
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
              <CurrencyField label="Preco da unidade" value={precoUnidade} onChange={setPrecoUnidade} />
              <CurrencyField label="Financiamento" value={financiamento} onChange={setFinanciamento} />
              <CurrencyField label="Subsidio" value={subsidio} onChange={setSubsidio} />
              <CurrencyField
                label="Garantido"
                value={garantido}
                readOnly
                helperText="Financiamento + subsidio + sinal."
              />
              <CurrencyField label="Sinal" value={sinal} onChange={setSinal} />
              <CurrencyField label="Prosoluto" value={prosolutoEfetivo} readOnly helperText="Calculado automaticamente." />
              <CurrencyField
                label="Cheque moradia"
                value={chequeMoradia}
                readOnly
                helperText="Valor fixo por empreendimento. O corretor nao pode alterar."
                wrapperClassName="sm:col-span-2"
              />
              <label className="space-y-2 text-sm sm:col-span-2">
                Parcelamento do prosoluto
                <div className="flex flex-col gap-2 rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-100">
                    <span>Parcelas</span>
                    <span className="font-semibold text-cyan-100">{parcelasNormalizadas}x</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, maxParcelasPermitidas)}
                    value={parcelasNormalizadas}
                    onChange={(event) => setParcelas(Number(event.target.value))}
                    disabled={!parcelasHabilitadas}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-300">
                    <span>Parcela estimada</span>
                    <span className="font-semibold text-white">{formatCurrency(valorParcela)}</span>
                  </div>
                    {!parcelasHabilitadas ? (
                      <p className="text-xs text-amber-200">
                        Prosoluto abaixo do minimo para parcelar (R$ {MIN_VALOR_PARCELA}). Cobrar à vista ou ajustar valores.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-300">
                        Max {MAX_PARCELAS}x | Parcela minima {formatCurrency(MIN_VALOR_PARCELA)}.
                      </p>
                    )}
                </div>
              </label>
            </div>

              <div className="space-y-4 rounded-[24px] border border-white/15 bg-slate-950/80 p-4 shadow-[0_12px_45px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <span className="font-semibold text-white">Resumo de negócio</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
                    Apresentacao
                  </span>
                </div>
                <div className="grid gap-2 text-sm text-slate-200">
                  <div className="flex justify-between">
                    <span>Valor do imovel (ajustado)</span>
                    <strong>{formatCurrency(precoAjustado)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor obtido</span>
                    <strong>{formatCurrency(totalObtido)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Prosoluto</span>
                    <strong>{formatCurrency(prosolutoEfetivo)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Parcelamento</span>
                    <strong>
                      {parcelasHabilitadas
                        ? `${parcelasNormalizadas}x de ${formatCurrency(valorParcela)}`
                        : formatCurrency(valorParcela)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Aporte inicial (sinal + 1a)</span>
                    <span>{formatCurrency(aporteInicial)}</span>
                  </div>
                </div>
              </div>
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
                  setEmpreendimento(DEFAULT_FORM_VALUES.empreendimento)
                  setUnitType(DEFAULT_FORM_VALUES.unitType)
                  setPrecoUnidade(DEFAULT_FORM_VALUES.precoUnidade)
                  setFinanciamento(DEFAULT_FORM_VALUES.financiamento)
                  setSubsidio(DEFAULT_FORM_VALUES.subsidio)
                  setSinal(DEFAULT_FORM_VALUES.sinal)
                  setParcelas(24)
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
                    Preco unidade: <strong>{formatCurrency(precoAjustado)}</strong>
                  </p>
                  <p>
                    Garantido: <strong>{formatCurrency(garantido)}</strong>
                  </p>
                  <p>
                    Cheque moradia: <strong>{formatCurrency(chequeMoradia)}</strong>
                  </p>
                  <p>
                    Prosoluto: <strong>{formatCurrency(prosolutoEfetivo)}</strong>
                  </p>
                  <p>
                    Parcelas: <strong>{parcelasNormalizadas}x de {formatCurrency(valorParcela)}</strong>
                  </p>
                  <p>
                    Aporte inicial: <strong>{formatCurrency(aporteInicial)}</strong>
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
                  <span>Garantido + sinal</span>
                  <span>{formatCurrency(garantido)}</span>
                </div>
                <div className="mb-2 flex justify-between text-sm text-slate-300">
                  <span>Total obtido (garantido + cheque)</span>
                  <span>{formatCurrency(totalObtido)}</span>
                </div>
                <div className="mb-2 flex justify-between text-sm text-slate-300">
                  <span>Prosoluto</span>
                  <span>{formatCurrency(prosolutoEfetivo)}</span>
                </div>
                <div className="mb-2 flex justify-between text-sm text-slate-300">
                  <span>Parcelamento</span>
                  <span>{parcelasHabilitadas ? `${parcelasNormalizadas}x de ${formatCurrency(valorParcela)}` : formatCurrency(valorParcela)}</span>
                </div>
                <p className="text-xs text-slate-300">Aporte inicial: {formatCurrency(aporteInicial)}</p>
                <p className="text-xs text-slate-300">Max {MAX_PARCELAS}x | Parcela minima {formatCurrency(MIN_VALOR_PARCELA)}</p>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}
