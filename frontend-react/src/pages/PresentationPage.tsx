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
  sinal: 0,
}

const MAX_PARCELAS = 80
const MIN_VALOR_PARCELA = 125
const MIN_PROSOLUTO = 8000
const PCT_PROSOLUTO_GARANTIDOR = 0.05

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
  const [clienteNome, setClienteNome] = useState('')
  const [precoUnidade, setPrecoUnidade] = useState(DEFAULT_FORM_VALUES.precoUnidade)
  const [financiamento, setFinanciamento] = useState(DEFAULT_FORM_VALUES.financiamento)
  const [subsidio, setSubsidio] = useState(DEFAULT_FORM_VALUES.subsidio)
  const [sinal, setSinal] = useState(DEFAULT_FORM_VALUES.sinal)
  const [parcelaCaixa, setParcelaCaixa] = useState(0)
  const [mostrarResumo, setMostrarResumo] = useState(false)
  const [mostrarTabelaParcelas, setMostrarTabelaParcelas] = useState(false)
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
  const precisaGarantidor = prosolutoEfetivo > precoAjustado * PCT_PROSOLUTO_GARANTIDOR
  const parcelasProgressivas = Array.from({ length: parcelasNormalizadas }, (_, i) => {
    const fator = Math.pow(1.01, i) // 1% ao mes
    const valor = parcelasHabilitadas ? valorParcela * fator : valorParcela
    return { numero: i + 1, valor }
  })
  const quickStats = [
    { label: 'Imovel ajustado', value: formatCurrency(precoAjustado) },
    { label: 'Prosoluto', value: formatCurrency(prosolutoEfetivo) },
    {
      label: 'Parcelamento',
      value: parcelasHabilitadas
        ? `${parcelasNormalizadas}x de ${formatCurrency(valorParcela)}`
        : formatCurrency(valorParcela),
    },
    { label: 'Aporte inicial', value: formatCurrency(aporteInicial) },
  ]

  useEffect(() => {
    const minimoParaPreco = totalObtido + MIN_PROSOLUTO
    if (precoUnidade < minimoParaPreco) {
      setPrecoUnidade(minimoParaPreco)
    }
  }, [totalObtido, precoUnidade])
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
    <div className="presentation-bg min-h-screen p-4 text-white md:p-8">
      <div className="relative z-10 mx-auto max-w-[1380px] space-y-5">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-white/5 p-5 shadow-[0_14px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {showGirassolBanner ? (
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-white shadow-lg">
                <img
                  src={vilaGirassolBanner}
                  alt="Marca do empreendimento Vila Girassol Residencial"
                  className="h-14 w-[220px] object-cover sm:h-16 sm:w-[260px]"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-300 via-cyan-400 to-blue-600 text-lg font-black text-slate-950 shadow-lg">
                {buildBadge(empreendimento)}
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-cyan-200">Apresentacao Comercial</p>
              <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">Fluxo de proposta para o cliente</h1>
              <p className="mt-1 text-sm text-slate-200">Tela de apoio para conduzir a conversa com clareza.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/12 bg-slate-950/50 px-4 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">Corretor</p>
              <p className="text-sm font-semibold text-white">{corretorNome}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-slate-950/50 px-4 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">Empreendimento</p>
              <p className="text-sm font-semibold text-white">{empreendimento}</p>
              <p className="text-xs text-slate-300">{unitType}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={saindo}
              className="rounded-2xl border border-white/14 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-200/60 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saindo ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </header>

        <section className="summary-bar">
          {quickStats.map((item) => (
            <div key={item.label} className="stat-card text-left">
              <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/80">{item.label}</p>
              <p className="text-xl font-extrabold text-white">{item.value}</p>
            </div>
          ))}
        </section>

        <main className="grid gap-5 items-start xl:grid-cols-[1.65fr_1fr]">
          <section className="space-y-5 rounded-3xl border border-white/8 bg-slate-900/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2 text-sm sm:col-span-2">
                  Nome do cliente
                  <input
                    type="text"
                    value={clienteNome}
                    onChange={(event) => setClienteNome(event.target.value)}
                    className="w-full rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                    placeholder="Digite o nome"
                  />
                </label>
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
              <CurrencyField
                label="Parcela Caixa"
                value={parcelaCaixa}
                onChange={setParcelaCaixa}
                helperText="Informe a parcela projetada pela Caixa (se aplicavel)."
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
              onClick={() => setMostrarTabelaParcelas((previous) => !previous)}
              className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              {mostrarTabelaParcelas ? 'Ocultar tabela de parcelas' : 'Ver tabela com 1% a.m.'}
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
                setMostrarTabelaParcelas(false)
              }}
              className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Resetar valores
            </button>
          </div>

          </section>

          <aside className="space-y-4 xl:sticky xl:top-4">
            <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-2xl backdrop-blur-xl card-lift glass-edge">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Leitura executiva</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-white">Resumo rapido</h2>
                  <p className="mt-2 text-sm text-slate-200">
                    Destaques que ficam fixos enquanto voce preenche a simulacao. Ajuda o cliente a acompanhar os numeros.
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
                  Sempre visivel
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {quickStats.map((item) => (
                  <div
                    key={`aside-${item.label}`}
                    className="rounded-2xl border border-white/12 bg-slate-950/60 p-3 shadow-sm"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200">{item.label}</p>
                    <p className="text-lg font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            </div>

            <div className="space-y-4 rounded-[24px] border border-white/12 bg-slate-950/75 p-5 shadow-[0_12px_45px_rgba(0,0,0,0.4)] card-lift glass-edge">
              <div className="flex items-center justify-between text-sm text-slate-200">
                <span className="font-semibold text-white">Resumo de negocio</span>
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
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Parcela Caixa</span>
                  <span>{formatCurrency(parcelaCaixa)}</span>
                </div>
              </div>
              <div
                className={[
                  'rounded-2xl border px-4 py-3 text-sm',
                  precisaGarantidor
                    ? 'border-amber-300/60 bg-amber-500/20 text-amber-50 shadow-[0_0_25px_rgba(251,191,36,0.25)]'
                    : 'border-emerald-300/40 bg-emerald-500/10 text-emerald-50',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Garantidor</span>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em]">
                    {precisaGarantidor ? 'Necessario' : 'Dispensavel'}
                  </span>
                </div>
                <p className="mt-1 text-xs">
                  {precisaGarantidor
                    ? 'Prosoluto acima de 5% do valor do imovel. Acionar garantidor.'
                    : 'Prosoluto dentro do limite de 5%. Garantidor opcional.'}
                </p>
              </div>
            </div>

            {mostrarTabelaParcelas && parcelasHabilitadas ? (
              <div className="rounded-[24px] border border-white/12 bg-slate-950/70 p-5 shadow-[0_12px_45px_rgba(0,0,0,0.4)] card-lift glass-edge">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200">Tabela de parcelas</p>
                    <h3 className="text-lg font-bold text-white">Correção de 1% ao mês</h3>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
                    {parcelasNormalizadas}x
                  </span>
                </div>
                <div className="max-h-72 overflow-auto rounded-2xl border border-white/10">
                  <table className="w-full text-sm text-slate-200">
                    <thead className="bg-white/5 text-xs uppercase tracking-[0.15em] text-cyan-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Parcela</th>
                        <th className="px-3 py-2 text-right">Valor corrigido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcelasProgressivas.map((parcela) => (
                        <tr key={parcela.numero} className="odd:bg-white/5 even:bg-white/0">
                          <td className="px-3 py-2 font-semibold text-white">#{parcela.numero}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(parcela.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="rounded-[24px] border border-white/10 bg-white/8 p-5 shadow-2xl backdrop-blur-xl card-lift glass-edge">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Indicadores financeiros</p>
                  <h3 className="text-lg font-bold text-white">Composicao da proposta</h3>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
                  Detalhe
                </span>
              </div>
              <div className="space-y-3 text-sm text-slate-200">
                <div className="flex justify-between">
                  <span>Garantido + sinal</span>
                  <strong>{formatCurrency(garantido)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total obtido (garantido + cheque)</span>
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
              </div>
              <p className="mt-3 text-xs text-slate-300">
                Aporte inicial: {formatCurrency(aporteInicial)} | Max {MAX_PARCELAS}x | Parcela minima{' '}
                {formatCurrency(MIN_VALOR_PARCELA)}
              </p>
            </div>

            {mostrarResumo ? (
              <div className="rounded-[24px] border border-cyan-200/20 bg-gradient-to-br from-cyan-950/40 to-indigo-950/30 p-5 shadow-2xl">
                <h3 className="mb-3 text-lg font-bold tracking-tight text-white">Resumo comercial</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <p>
                    Empreendimento: <strong>{empreendimento}</strong>
                  </p>
                  <p>
                    Tipo de unidade: <strong>{unitType}</strong>
                  </p>
                  <p>
                    Cliente: <strong>{clienteNome || '-'}</strong>
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
                  <p>
                    Parcela Caixa: <strong>{formatCurrency(parcelaCaixa)}</strong>
                  </p>
                </div>
              </div>
            ) : null}
          </aside>
        </main>
      </div>
    </div>
  )
}
