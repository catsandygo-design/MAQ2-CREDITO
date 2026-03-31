import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchSession, logout, uploadTabelaPrecos, fetchTabelaPrecos, fetchRecomendacao, enviarFeedbackRecomendacao } from '../lib/api'
import type { TabelaPrecoRow } from '../types'
import { ScreenControls } from '../components/ScreenControls'
import tipoPlanta from '../assets/TIPO.jpg'
import gardenFitPlanta from '../assets/GARDENFIT.jpg'
import superGardenPlanta from '../assets/SUPERGARDEN.jpg'
import bgGarden from '../assets/GARDENFIT.jpg'
import bgSuperGarden from '../assets/SUPERGARDEN.jpg'
import bgTipo from '../assets/TIPO.jpg'
import bgVaranda from '../assets/TIPOVARANDA.jpg'
import logoGirassol from '../assets/vila-girassol-banner.svg'

type UnitType = 'TIPO/MOTO' | 'TIPO/CARRO' | 'GARDEN FIT' | 'GARDEN' | 'SUPER GARDEN'
type Empreendimento = 'VILA GIRASSOL' | 'VILA MARGARIDA' | 'VILA DAS ROSAS'

const UNIT_TYPES: UnitType[] = ['TIPO/MOTO', 'TIPO/CARRO', 'GARDEN FIT', 'GARDEN', 'SUPER GARDEN']
const UNIT_IMAGES: Record<UnitType, string> = {
  'TIPO/MOTO': tipoPlanta,
  'TIPO/CARRO': tipoPlanta,
  'GARDEN FIT': gardenFitPlanta,
  GARDEN: gardenFitPlanta,
  'SUPER GARDEN': superGardenPlanta,
}
const BACKGROUND_IMAGES = [bgGarden, bgSuperGarden, bgTipo, bgVaranda]
const PUBLIC_BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`
const publicImage = (file: string) => `${PUBLIC_BASE}imagens/${encodeURIComponent(file)}`

const BG_BY_EMPREENDIMENTO: Record<Empreendimento, string[]> = {
  'VILA GIRASSOL': [
    publicImage('entrada girassol.jpeg'),
    publicImage('sala girassol.jpeg'),
    publicImage('cozinha girassol.jpeg'),
    publicImage('casal girassol.jpeg'),
    publicImage('banheiro girassol.jpeg'),
    publicImage('parquinho girassol.jpeg'),
    publicImage('pet girassol.jpeg'),
    publicImage('piscina girassol.jpeg'),
    publicImage('implantacao girassol.jpeg'),
  ],
  'VILA MARGARIDA': [
    publicImage('entrada margarida.jpeg'),
    publicImage('sala margarida.jpeg'),
    publicImage('cozinha margarida.jpeg'),
    publicImage('casal margarida.jpeg'),
    publicImage('banheiro margarida.jpeg'),
    publicImage('currasqueira margarida.jpeg'),
    publicImage('parquinho margarida.jpeg'),
    publicImage('pet margarida.jpeg'),
    publicImage('implantacao margarida.jpeg'),
    publicImage('lateral margarida.jpeg'),
  ],
  'VILA DAS ROSAS': [
    publicImage('entrada rosas.jpeg'),
    publicImage('sala das rosas.jpeg'),
    publicImage('cozinha das rosas.jpeg'),
    publicImage('casal das rosas.jpeg'),
    publicImage('banheiro das rosas.jpeg'),
    publicImage('parquinho rosas.jpeg'),
    publicImage('pet rosas.jpeg'),
    publicImage('piscina e churrasqueira rosas.jpeg'),
    publicImage('lateral vila das rosas.jpeg'),
  ],
}
const LOGOS: Partial<Record<Empreendimento, string>> = {
  'VILA GIRASSOL': logoGirassol,
  'VILA MARGARIDA': publicImage('logo margarida.jpeg'),
  'VILA DAS ROSAS': publicImage('logo vila das rosas.jpeg'),
}

const THEME_BY_EMPREENDIMENTO: Record<
  Empreendimento,
  { primary: string; headerBg: string; rowOdd: string; rowEven: string; border: string; badgeBg: string }
> = {
  'VILA GIRASSOL': {
    primary: '#f8c63d',
    headerBg: 'rgba(248,198,61,0.35)',
    rowOdd: 'rgba(248,198,61,0.18)',
    rowEven: 'rgba(255,255,255,0.08)',
    border: 'rgba(248,198,61,0.45)',
    badgeBg: 'rgba(248,198,61,0.28)',
  },
  'VILA MARGARIDA': {
    primary: '#3ad0a1',
    headerBg: 'rgba(58,208,161,0.35)',
    rowOdd: 'rgba(58,208,161,0.18)',
    rowEven: 'rgba(255,255,255,0.08)',
    border: 'rgba(58,208,161,0.45)',
    badgeBg: 'rgba(58,208,161,0.28)',
  },
  'VILA DAS ROSAS': {
    primary: '#f36a9a',
    headerBg: 'rgba(243,106,154,0.35)',
    rowOdd: 'rgba(243,106,154,0.18)',
    rowEven: 'rgba(255,255,255,0.08)',
    border: 'rgba(243,106,154,0.45)',
    badgeBg: 'rgba(243,106,154,0.28)',
  },
}
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
  onBlurValue?: (value: number) => void
  readOnly?: boolean
  helperText?: string
  wrapperClassName?: string
}

function CurrencyField({
  label,
  value,
  onChange,
  onBlurValue,
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
            onBlurValue?.(value)
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
  const [precoTabela, setPrecoTabela] = useState(DEFAULT_FORM_VALUES.precoUnidade)
  const [sobreprecoMinimo, setSobreprecoMinimo] = useState(0)
  const [precoDigitadoCorretor, setPrecoDigitadoCorretor] = useState(DEFAULT_FORM_VALUES.precoUnidade)
  const [financiamento, setFinanciamento] = useState(DEFAULT_FORM_VALUES.financiamento)
  const [subsidio, setSubsidio] = useState(DEFAULT_FORM_VALUES.subsidio)
  const [sinal, setSinal] = useState(DEFAULT_FORM_VALUES.sinal)
  const [rendaBruta, setRendaBruta] = useState(0)
  const [percConstrucao, setPercConstrucao] = useState(70)
  const [sinalProduto, setSinalProduto] = useState(0)
  const [parcelaCaixa, setParcelaCaixa] = useState(0)
  const [mostrarResumo, setMostrarResumo] = useState(false)
  const [mostrarTabelaParcelas, setMostrarTabelaParcelas] = useState(false)
  const [parcelas, setParcelas] = useState(24)
  const [bgIndex, setBgIndex] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [uploadErro, setUploadErro] = useState<string | null>(null)
  const [salvarStatus, setSalvarStatus] = useState<string | null>(null)
  const [salvarErro, setSalvarErro] = useState<string | null>(null)
  const [precoErro, setPrecoErro] = useState<string | null>(null)
  const inputUploadRef = useRef<HTMLInputElement | null>(null)
  const [tabelaPrecos, setTabelaPrecos] = useState<TabelaPrecoRow[] | null>(null)
  const [loadingTabela, setLoadingTabela] = useState(false)
  const [erroTabela, setErroTabela] = useState<string | null>(null)
  const [mostrarTabelaPrecos, setMostrarTabelaPrecos] = useState(false)
  const [iaSugestao, setIaSugestao] = useState<{
    preco_sugerido: number
    status_ia: string
    risco_exposicao: string
    confianca: number
    motivo: string
  } | null>(null)
  const [iaLoading, setIaLoading] = useState(false)
  const [iaErro, setIaErro] = useState<string | null>(null)
  const [iaAviso, setIaAviso] = useState<string | null>(null)
  const backgroundImages = useMemo<string[]>(() => {
    const selected = BG_BY_EMPREENDIMENTO[empreendimento] ?? BACKGROUND_IMAGES
    return selected.map((path) => (path.startsWith('/imagens/') ? encodeURI(path) : path))
  }, [empreendimento])
  const yvyFrameRef = useRef<HTMLIFrameElement | null>(null)

  const sendYvyMood = (payload: { type: 'yvy:mood'; mood: string; energy?: number }) => {
    const win = yvyFrameRef.current?.contentWindow
    if (win) {
      win.postMessage(payload, window.location.origin)
    }
  }
  const logoAtual = LOGOS[empreendimento]
  const theme = THEME_BY_EMPREENDIMENTO[empreendimento]
  const processarUpload = async (file: File) => {
    setUploadErro(null)
    setUploadStatus(`Enviando ${file.name}...`)
    try {
      await uploadTabelaPrecos(file)
      const rows = await fetchTabelaPrecos()
      setTabelaPrecos(rows)
      setUploadStatus(`Planilha enviada: ${file.name}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar planilha.'
      setUploadErro(message)
      setUploadStatus(null)
    }
  }

  const salvarAnalise = async () => {
    setSalvarErro(null)
    setSalvarStatus('Salvando análise...')
    try {
      const payload = {
        empreendimento,
        unidade: unitType,
        preco_imovel: pricing.precoFinalImovel,
        valor_obtido: pricing.valorObtido,
        prosoluto_calculado: pricing.entradaBruta,
        prosoluto_liquido: pricing.entradaLiquida,
        sinal,
        sinal_produto: sinalProduto,
        financiamento,
        subsidio,
        cheque_moradia: chequeMoradia,
        renda_bruta: rendaBruta,
        perc_construcao: percConstrucao,
        is_agora: isAgora,
        is_pos_chaves: isPosChaves,
        tabela_referencia: tabelaPrecos || [],
        data_referencia: new Date().toISOString(),
      }
      const res = await fetch('/app/api/analises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail || 'Falha ao salvar análise')
      }
      setSalvarStatus('Análise salva.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar análise.'
      setSalvarErro(message)
      setSalvarStatus(null)
    }
  }

  const abrirTabelaPrecos = async () => {
    setErroTabela(null)
    setMostrarTabelaPrecos(true)
    if (tabelaPrecos !== null) return
    try {
      setLoadingTabela(true)
      const rows = await fetchTabelaPrecos()
      setTabelaPrecos(rows)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar tabela de preÃ§os.'
      setErroTabela(message)
    } finally {
      setLoadingTabela(false)
    }
  }

  useEffect(() => {
    // Garantir que, ao trocar de empreendimento, o carrossel reinicie na primeira imagem do novo conjunto.
    setBgIndex(0)
  }, [empreendimento])

  useEffect(() => {
    if (!backgroundImages.length) return undefined
    setBgIndex((current) => (current >= backgroundImages.length ? 0 : current))
    const interval = window.setInterval(() => {
      setBgIndex((previous) => (previous + 1) % backgroundImages.length)
    }, 5500)

    return () => window.clearInterval(interval)
  }, [backgroundImages])

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

        const nome = (session.username || 'Corretor').toUpperCase()
        setCorretorNome(nome)
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
  const tabelaMatch = useMemo(() => {
    if (!tabelaPrecos) return null
    const normalize = (value: string) => value.trim().toUpperCase()
    return tabelaPrecos.find(
      (row) =>
        normalize(row.empreendimento) === normalize(empreendimento) && normalize(row.unidade) === normalize(unitType),
    )
  }, [empreendimento, tabelaPrecos, unitType])
  useEffect(() => {
    if (tabelaMatch) {
      const precoPlanilha = tabelaMatch.preco ?? 0
      const sobreprecoPlanilha = tabelaMatch.sobrepreco ?? 0
      setPrecoTabela(precoPlanilha)
      setSobreprecoMinimo(sobreprecoPlanilha)
      setPrecoDigitadoCorretor(precoPlanilha + sobreprecoPlanilha)
    } else {
      setSobreprecoMinimo(0)
    }
    setIaSugestao(null)
  }, [tabelaMatch])
  const pricing = useMemo(() => {
    const precoTabelaVal = Number(precoTabela) || 0
    const sobreprecoVal = Number(sobreprecoMinimo) || 0
    const precoBaseEmpresa = precoTabelaVal + sobreprecoVal
    const garantidoVal = financiamento + subsidio + sinal
    const valorObtidoVal = garantidoVal + chequeMoradia
    const precoMinimoPermitido = Math.max(precoBaseEmpresa, valorObtidoVal)
    const precoCorretor = Number(precoDigitadoCorretor) || 0
      const precoFinalImovel = Math.max(precoCorretor, precoMinimoPermitido)
      const entradaBruta = Math.max(precoFinalImovel - valorObtidoVal, 0)
      const entradaLiquida = Math.max(entradaBruta - sinalProduto, 0)

      return {
      precoTabela: precoTabelaVal,
      sobreprecoMinimo: sobreprecoVal,
      precoBaseEmpresa,
      garantido: garantidoVal,
      valorObtido: valorObtidoVal,
      precoMinimoPermitido,
      precoDigitadoCorretor: precoCorretor,
      precoFinalImovel,
      entradaBruta,
      entradaLiquida,
    }
  }, [
    chequeMoradia,
    financiamento,
    precoDigitadoCorretor,
    precoTabela,
    sinal,
    sinalProduto,
    sobreprecoMinimo,
    subsidio,
  ])
  const exibirBlocoInterno = false

  const maxParcelasPermitidas =
    pricing.entradaLiquida >= MIN_VALOR_PARCELA
      ? Math.min(MAX_PARCELAS, Math.floor(pricing.entradaLiquida / MIN_VALOR_PARCELA))
      : 1
  const parcelasHabilitadas = pricing.entradaLiquida >= MIN_VALOR_PARCELA
  const parcelasNormalizadas = Math.min(Math.max(parcelas, 1), maxParcelasPermitidas)
  const valorParcela = parcelasHabilitadas ? pricing.entradaLiquida / parcelasNormalizadas : pricing.entradaLiquida
  const aporteInicial = sinal + valorParcela
  const precisaGarantidor = pricing.entradaLiquida > pricing.precoFinalImovel * PCT_PROSOLUTO_GARANTIDOR
  const entradaParceladaAtual = parcelasHabilitadas ? valorParcela : 0
  const isAgora =
    rendaBruta > 0 ? (percConstrucao / 100) * (parcelaCaixa + entradaParceladaAtual) / rendaBruta : 0
  const isPosChaves = rendaBruta > 0 ? (parcelaCaixa + entradaParceladaAtual) / rendaBruta : 0
  const parcelasProgressivas = Array.from({ length: parcelasNormalizadas }, (_, i) => {
    const fator = Math.pow(1.01, i) // 1% ao mes
    const valor = parcelasHabilitadas ? valorParcela * fator : valorParcela
    return { numero: i + 1, valor }
  })
  const plantaImagem = UNIT_IMAGES[unitType]
  const totalDescontos = subsidio + chequeMoradia
  const valorFinanciado = Math.max(pricing.precoFinalImovel - totalDescontos, 0)

  const quickStats = [
    { label: 'Valor do imóvel', value: formatCurrency(pricing.precoFinalImovel) },
    { label: 'Valor obtido', value: formatCurrency(pricing.valorObtido) },
    { label: 'Entrada', value: formatCurrency(pricing.entradaLiquida) },
    { label: 'Sinal', value: formatCurrency(sinal) },
  ]

  const gerarRecomendacaoIA = async () => {
    setIaErro(null)
    setIaAviso(null)
    if (!rendaBruta || rendaBruta <= 0) {
      setIaErro('Informe renda bruta maior que zero para gerar sugestao.')
      return
    }
    setIaLoading(true)
    try {
      const payload = {
        renda_bruta: rendaBruta || 0,
        valor_tabela: pricing.precoTabela,
        sobrepreco_vila: sobreprecoMinimo,
        valor_obtido: pricing.valorObtido,
        parcela_caixa: parcelaCaixa || 0,
        preco_digitado_corretor: precoDigitadoCorretor > 0 ? precoDigitadoCorretor : undefined,
      }
      const rec = await fetchRecomendacao(payload)
      setIaSugestao(rec)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao obter recomendação.'
      setIaErro(message)
    } finally {
      setIaLoading(false)
    }
  }

  const aplicarRecomendacaoIA = async (aceitou: boolean) => {
    if (!iaSugestao) return
    if (aceitou) {
      setPrecoDigitadoCorretor(iaSugestao.preco_sugerido)
      setIaAviso('Preço ajustado para a recomendação.')
    } else {
      setIaAviso('Recomendação recusada.')
    }
    try {
      await enviarFeedbackRecomendacao({
        aceitou,
        preco_sugerido: iaSugestao.preco_sugerido,
        contexto: {
          risco_exposicao: iaSugestao.risco_exposicao,
          status_ia: iaSugestao.status_ia,
          confianca: iaSugestao.confianca,
        },
      })
    } catch (error) {
      console.warn('Falha ao enviar feedback IA', error)
    }
  }

  useEffect(() => {
    if (tabelaPrecos !== null || loadingTabela) return
    setLoadingTabela(true)
    fetchTabelaPrecos()
      .then(setTabelaPrecos)
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Falha ao carregar tabela de preços.'
        setErroTabela(message)
      })
      .finally(() => setLoadingTabela(false))
  }, [loadingTabela, tabelaPrecos])
  useEffect(() => {
    if (parcelas > maxParcelasPermitidas) {
      setParcelas(maxParcelasPermitidas || 1)
    }
    if (parcelas < 1) {
      setParcelas(1)
    }
  }, [parcelas, maxParcelasPermitidas])
  useEffect(() => {
    if (precoDigitadoCorretor >= pricing.precoMinimoPermitido) {
      setPrecoErro(null)
    }
  }, [precoDigitadoCorretor, pricing.precoMinimoPermitido])

  useEffect(() => {
    const eye = document.getElementById('yvy-eye')
    if (eye) eye.remove()
  }, [])

  useEffect(() => {
    const container = document.querySelector('.presentation-shell')
    if (!container) return
    let debounce: number | null = null
    const handler = () => {
      if (debounce) window.clearTimeout(debounce)
      debounce = window.setTimeout(() => {
        sendYvyMood({ type: 'yvy:mood', mood: 'aprendendo', energy: 0.35 })
      }, 120)
    }
    container.addEventListener('input', handler, true)
    return () => {
      container.removeEventListener('input', handler, true)
      if (debounce) window.clearTimeout(debounce)
    }
  }, [])

  useEffect(() => {
    if (precoErro) {
      sendYvyMood({ type: 'yvy:mood', mood: 'alerta', energy: 0.7 })
    }
  }, [precoErro])

  useEffect(() => {
    if (iaErro) {
      sendYvyMood({ type: 'yvy:mood', mood: 'alerta', energy: 0.6 })
    }
  }, [iaErro])

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
    <>
      <ScreenControls />
      <div className="bg-carousel">
        {backgroundImages.map((image, index) => (
          <img
            key={image}
            src={image}
            aria-hidden
            className={['bg-carousel__image', index === bgIndex ? 'opacity-90' : 'opacity-0'].join(' ')}
          />
        ))}
        <div className="bg-carousel__overlay" />
      </div>

      <div className="presentation-shell relative z-10 min-h-screen p-4 text-white md:p-8">
        <div className="mx-auto max-w-[1380px] space-y-5">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-white/5 p-5 shadow-[0_14px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {logoAtual ? (
              <div className="brand-frame">
                <img
                  src={logoAtual}
                  alt={`Marca do empreendimento ${empreendimento}`}
                  className="brand-logo"
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
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/90">{item.label}</p>
                  <p className="text-xl font-extrabold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">{item.value}</p>
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

                  {exibirBlocoInterno ? (
                    <div className="sm:col-span-3 grid gap-3 rounded-2xl border border-white/12 bg-slate-950/60 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Base da unidade</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <CurrencyField
                          label="Preço de tabela"
                          value={pricing.precoTabela}
                          onChange={setPrecoTabela}
                          readOnly={Boolean(tabelaMatch)}
                          helperText={tabelaMatch ? 'Vem da tabela (excel).' : 'Informe quando não houver planilha.'}
                        />
                        <CurrencyField
                          label="Sobrepreço mínimo"
                          value={sobreprecoMinimo}
                          onChange={setSobreprecoMinimo}
                          readOnly={Boolean(tabelaMatch)}
                          helperText="Vem do campo sobrepreco da planilha."
                        />
                        <CurrencyField label="Preço base da empresa" value={pricing.precoBaseEmpresa} readOnly />
                      </div>
                    </div>
                  ) : null}

                    <div className="sm:col-span-3 grid gap-3 rounded-2xl border border-white/12 bg-slate-950/60 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Capacidade do cliente</p>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <CurrencyField label="Financiamento" value={financiamento} onChange={setFinanciamento} />
                      <CurrencyField label="Subsidio" value={subsidio} onChange={setSubsidio} />
                      <CurrencyField label="Sinal" value={sinal} onChange={setSinal} />
                      <CurrencyField label="Cheque moradia" value={chequeMoradia} readOnly />
                      <CurrencyField label="Garantido" value={pricing.garantido} readOnly helperText="Financiamento + subsídio + sinal." />
                      <CurrencyField label="Valor obtido" value={pricing.valorObtido} readOnly helperText="Garantido + cheque moradia." />
                      <CurrencyField label="Renda bruta" value={rendaBruta} onChange={setRendaBruta} />
                      <CurrencyField
                        label="Sinal produto"
                        value={sinalProduto}
                        onChange={setSinalProduto}
                        helperText="Deduz da entrada, não soma no garantido."
                      />
                      <label className="space-y-2 text-sm">
                        % obra (para IS pré-chaves)
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={percConstrucao}
                          onChange={(event) => setPercConstrucao(Number(event.target.value))}
                          className="w-full rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                        />
                        <span className="block text-xs text-slate-300">Ex.: 70 significa 70% de avanço de obra.</span>
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-3 grid gap-3 rounded-2xl border border-white/12 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Formacao do preco</p>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <CurrencyField label="Preco minimo permitido (somente corretor)" value={pricing.precoMinimoPermitido} readOnly />
                      <CurrencyField
                        label="Preco digitado (corretor)"
                        value={precoDigitadoCorretor}
                        onChange={(value) => {
                          setPrecoDigitadoCorretor(value)
                          setPrecoErro(value < pricing.precoMinimoPermitido ? 'O preco nao pode ser menor que o minimo permitido.' : null)
                        }}
                        onBlurValue={(value) => {
                          if (value < pricing.precoMinimoPermitido) {
                            setPrecoDigitadoCorretor(pricing.precoMinimoPermitido)
                            setPrecoErro('Valor ajustado para o minimo permitido.')
                          }
                        }}
                        helperText={precoErro || 'Pode ser maior que o minimo permitido.'}
                      />
                      <CurrencyField label="Preco final do imovel" value={pricing.precoFinalImovel} readOnly />
                      <CurrencyField label="Entrada bruta" value={pricing.entradaBruta} readOnly />
                      <CurrencyField label="Entrada (apos sinal produto)" value={pricing.entradaLiquida} readOnly />
                    </div>
                  </div>

                  <div className="sm:col-span-3 grid gap-3 rounded-2xl border border-white/12 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Assistente IA (somente corretor)</p>
                        <p className="text-sm text-slate-200">Sugere preco minimo seguro. Voce decide aplicar.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex items-center gap-2 rounded-full border border-cyan-200/30 bg-gradient-to-r from-cyan-500/15 via-indigo-500/10 to-emerald-400/15 px-3 py-2 shadow-[0_0_28px_rgba(56,189,248,0.35)]">
                          <span className="absolute left-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-cyan-200 opacity-80" />
                          <span className="absolute left-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-cyan-300 animate-ping" />
                          <span className="pl-4 text-[11px] uppercase tracking-[0.24em] text-cyan-100">YVY residente</span>
                        </div>
                        <a
                          href="/assets/yvy.html"
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-cyan-300/60 bg-cyan-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white hover:bg-cyan-500/40 shadow-[0_0_22px_rgba(56,189,248,0.45)]"
                          aria-label="Abrir YVY Core"
                        >
                          Abrir YVY
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={gerarRecomendacaoIA}
                          className="rounded-xl border border-cyan-300/50 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/30"
                          disabled={iaLoading}
                        >
                          {iaLoading ? 'Gerando...' : 'Gerar sugestão'}
                        </button>
                        <button
                          type="button"
                          onClick={() => aplicarRecomendacaoIA(true)}
                          disabled={!iaSugestao}
                          className="rounded-xl border border-emerald-300/50 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          Aplicar
                        </button>
                        <button
                          type="button"
                          onClick={() => aplicarRecomendacaoIA(false)}
                          disabled={!iaSugestao}
                          className="rounded-xl border border-amber-300/50 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-50 hover:bg-amber-500/30 disabled:opacity-50"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                    <div className="yvy-embed-wrap">
                      <iframe
                        ref={yvyFrameRef}
                        title="YVY Core"
                        src="/assets/yvy.html"
                        className="yvy-embed"
                        loading="lazy"
                      />
                    </div>
                    {iaErro ? <div className="ia-tooltip ia-warning">{iaErro}</div> : null}
                    {iaAviso ? <div className="ia-tooltip">{iaAviso}</div> : null}
                    {iaSugestao ? (
                      <div className="grid gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-100">
                        <div className="flex justify-between">
                          <span>Preço sugerido</span>
                          <strong>{formatCurrency(iaSugestao.preco_sugerido)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Status IA</span>
                          <span>{iaSugestao.status_ia}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Risco / Exposição</span>
                          <span>{iaSugestao.risco_exposicao}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Confiança</span>
                          <span>{(iaSugestao.confianca * 100).toFixed(0)}%</span>
                        </div>
                        {iaSugestao.motivo ? <p className="text-xs text-slate-300">Motivo: {iaSugestao.motivo}</p> : null}
                      </div>
                    ) : null}
                  </div>

                  <CurrencyField
                    label="Parcela Caixa"
                    value={parcelaCaixa}
                    onChange={setParcelaCaixa}
                    helperText="Informe a parcela projetada pela Caixa (se aplicavel)."
                    wrapperClassName="sm:col-span-3"
                  />
                  <label className="space-y-2 text-sm sm:col-span-3">
                    Parcelamento da entrada
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
                            Entrada abaixo do minimo para parcelar (R$ {MIN_VALOR_PARCELA}). Cobrar Ã  vista ou ajustar valores.
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
            <input
              ref={inputUploadRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void processarUpload(file)
                }
                event.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => inputUploadRef.current?.click()}
              className="rounded-2xl border border-cyan-300/50 bg-cyan-500/20 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35"
            >
              Upload Excel (preços)
            </button>
            <button
              type="button"
              onClick={() => void abrirTabelaPrecos()}
              className="rounded-2xl border border-emerald-300/50 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/35"
            >
              Tabela de preços
            </button>
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
              onClick={() => void salvarAnalise()}
              className="rounded-2xl border border-emerald-300/50 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/35"
            >
              Salvar análise
            </button>
            <button
              type="button"
              onClick={() => {
                setEmpreendimento(DEFAULT_FORM_VALUES.empreendimento)
                setUnitType(DEFAULT_FORM_VALUES.unitType)
                setPrecoTabela(DEFAULT_FORM_VALUES.precoUnidade)
                setPrecoDigitadoCorretor(DEFAULT_FORM_VALUES.precoUnidade)
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
          {(uploadStatus || uploadErro) && (
            <div className="text-xs text-slate-200">
              {uploadStatus ? <span>{uploadStatus}</span> : null}
              {uploadErro ? <span className="text-amber-200"> {uploadErro}</span> : null}
            </div>
          )}
          {(salvarStatus || salvarErro) && (
            <div className="text-xs text-slate-200">
              {salvarStatus ? <span>{salvarStatus}</span> : null}
              {salvarErro ? <span className="text-amber-200"> {salvarErro}</span> : null}
            </div>
          )}

          </section>

          <aside className="space-y-4 xl:sticky xl:top-4">
            <div className="rounded-[28px] border border-white/10 bg-white/8 p-4 shadow-2xl backdrop-blur-xl card-lift glass-edge">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">Planta selecionada</p>
                  <h3 className="text-lg font-bold text-white">{unitType}</h3>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
                  Visual
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 shadow-inner">
                <img src={plantaImagem} alt={`Planta ${unitType}`} className="block h-auto w-full object-cover" />
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-white/8 p-4 shadow-xl backdrop-blur-xl card-lift glass-edge">
              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200">Resumo da unidade</p>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                <div className="flex justify-between">
                  <span>Empreendimento</span>
                  <strong>{empreendimento}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Unidade</span>
                  <strong>{unitType}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Garagem</span>
                  <strong>{unitType === 'TIPO/MOTO' ? 'Moto' : 'Carro'}</strong>
                </div>
              </div>
            </div>

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
                  <strong>{formatCurrency(pricing.precoFinalImovel)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Valor obtido</span>
                  <strong>{formatCurrency(pricing.valorObtido)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total de descontos (subsídio + cheque)</span>
                  <strong>{formatCurrency(totalDescontos)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Valor a ser financiado</span>
                  <strong>{formatCurrency(valorFinanciado)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Entrada bruta</span>
                  <strong>{formatCurrency(pricing.entradaBruta)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Entrada (após sinal produto)</span>
                  <strong>{formatCurrency(pricing.entradaLiquida)}</strong>
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
                <div className="flex justify-between text-xs text-slate-300">
                  <span>IS pré-chaves</span>
                  <span>{(isAgora * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>IS pós-chaves</span>
                  <span>{(isPosChaves * 100).toFixed(2)}%</span>
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
              <div
                className="rounded-[24px] border bg-slate-950/90 p-5 shadow-[0_12px_45px_rgba(0,0,0,0.4)] backdrop-blur-xl card-lift glass-edge"
                style={{ borderColor: theme.border }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/90">Tabela de parcelas</p>
                    <h3 className="text-lg font-bold text-white">Correção de 1% ao mês</h3>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white shadow-[0_0_12px_rgba(0,0,0,0.35)]"
                    style={{ backgroundColor: theme.badgeBg, border: `1px solid ${theme.border}` }}
                  >
                    {parcelasNormalizadas}x
                  </span>
                </div>
              <div
                className="w-full max-w-full max-h-72 overflow-y-auto overflow-x-hidden rounded-2xl border bg-slate-900/85 shadow-inner"
                style={{ borderColor: theme.border }}
              >
                <table className="min-w-full table-fixed text-sm text-white">
                    <thead
                      className="text-xs uppercase tracking-[0.12em]"
                      style={{ backgroundColor: theme.headerBg, color: theme.primary }}
                    >
                      <tr>
                        <th className="w-1/2 px-3 py-2 text-left">Parcela</th>
                        <th className="w-1/2 px-3 py-2 text-right">Valor corrigido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcelasProgressivas.map((parcela) => (
                        <tr
                          key={parcela.numero}
                          style={{ backgroundColor: parcela.numero % 2 === 0 ? theme.rowEven : theme.rowOdd }}
                        >
                          <td className="px-3 py-2 font-semibold text-white">#{parcela.numero}</td>
                          <td className="px-3 py-2 text-right" style={{ color: theme.primary }}>
                            {formatCurrency(parcela.valor)}
                          </td>
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
                  <strong>{formatCurrency(pricing.garantido)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total obtido (garantido + cheque)</span>
                  <strong>{formatCurrency(pricing.valorObtido)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Entrada bruta</span>
                  <strong>{formatCurrency(pricing.entradaBruta)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Entrada (após sinal produto)</span>
                  <strong>{formatCurrency(pricing.entradaLiquida)}</strong>
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
                     Preco final do imovel: <strong>{formatCurrency(pricing.precoFinalImovel)}</strong>
                  </p>
                  <p>
                    Garantido: <strong>{formatCurrency(pricing.garantido)}</strong>
                  </p>
                  <p>
                    Cheque moradia: <strong>{formatCurrency(chequeMoradia)}</strong>
                  </p>
                  <p>
                    Total descontos: <strong>{formatCurrency(totalDescontos)}</strong>
                  </p>
                  <p>
                    Valor a financiar: <strong>{formatCurrency(valorFinanciado)}</strong>
                  </p>
                  <p>
                    Entrada bruta: <strong>{formatCurrency(pricing.entradaBruta)}</strong>
                  </p>
                  <p>
                    Entrada (após sinal produto): <strong>{formatCurrency(pricing.entradaLiquida)}</strong>
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

      {mostrarTabelaPrecos ? (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setMostrarTabelaPrecos(false)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-[28px] border bg-slate-950/95 shadow-2xl"
            style={{ borderColor: theme.border }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ backgroundColor: theme.headerBg || 'rgba(148,163,184,0.12)' }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-100">Tabela de preços</p>
                <h3 className="text-lg font-bold text-white">Preços e limites por unidade</h3>
                <p className="text-xs text-slate-300">Fonte: planilha enviada (excel/csv).</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
                  onClick={() => {
                    setTabelaPrecos(null)
                    void abrirTabelaPrecos()
                  }}
                >
                  Recarregar
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
                  onClick={() => setMostrarTabelaPrecos(false)}
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto bg-slate-950/85">
              {loadingTabela ? (
                <div className="p-5 text-sm text-slate-200">Carregando tabela...</div>
              ) : null}
              {erroTabela ? (
                <div className="p-5 text-sm text-amber-200">Erro: {erroTabela}</div>
              ) : null}
              {!loadingTabela && !erroTabela ? (
                <table className="min-w-full table-fixed text-sm text-white">
                  <thead
                    className="text-xs uppercase tracking-[0.14em]"
                    style={{ backgroundColor: theme.headerBg, color: theme.primary }}
                  >
                    <tr>
                      <th className="px-3 py-2 text-left">Empreendimento</th>
                      <th className="px-3 py-2 text-left">Unidade</th>
                      <th className="px-3 py-2 text-right">Garantido mínimo</th>
                      <th className="px-3 py-2 text-right">Preço</th>
                      <th className="px-3 py-2 text-right">Sobrepreço mínimo</th>
                      <th className="px-3 py-2 text-right">Prosoluto mínimo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tabelaPrecos || []).map((row, index) => (
                      <tr
                        key={`${row.empreendimento}-${row.unidade}-${index}`}
                        style={{ backgroundColor: index % 2 === 0 ? theme.rowOdd : theme.rowEven }}
                      >
                        <td className="px-3 py-2">{row.empreendimento}</td>
                        <td className="px-3 py-2">{row.unidade}</td>
                        <td className="px-3 py-2 text-right" style={{ color: theme.primary }}>
                          {formatCurrency(row.garantido_minimo)}
                        </td>
                        <td className="px-3 py-2 text-right text-white">{formatCurrency(row.preco)}</td>
                        <td className="px-3 py-2 text-right text-white">{formatCurrency(row.sobrepreco)}</td>
                        <td className="px-3 py-2 text-right text-white">{formatCurrency(row.prosoluto_minimo)}</td>
                      </tr>
                    ))}
                    {(tabelaPrecos || []).length === 0 && !loadingTabela ? (
                      <tr>
                        <td className="px-3 py-4 text-center text-slate-300" colSpan={6}>
                          Nenhuma linha encontrada. Envie a planilha para popular a tabela.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

