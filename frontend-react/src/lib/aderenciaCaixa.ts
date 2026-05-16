export const MAC_PESOS = {
  portabilidadeSalario: 20,
  pixCpfCaixa: 30,
  openFinance: 50,
} as const

export const MAC_LIMITES = {
  isMaximoOk: 40,
  scoreExcelente: 100,
  scoreBomMinimo: 80,
  scoreModeradoMinimo: 50,
} as const

export interface AderenciaCaixaInput {
  isPercentual: number
  possuiRendaSuporte: boolean
  fezPortabilidadeSalario: boolean
  fezPixCpfCaixa: boolean
  fezOpenFinance: boolean
}

export interface AderenciaCaixaResultado {
  score: number
  statusGeral: string
  statusIS: string
  alertas: string[]
  recomendacoes: string[]
  recuperavel: boolean
  bloqueioCritico: boolean
}

function normalizarPercentual(valor: number): number {
  return Number.isFinite(valor) && valor > 0 ? Number(valor.toFixed(2)) : 0
}

export function calcularAderenciaCaixa({
  isPercentual,
  possuiRendaSuporte,
  fezPortabilidadeSalario,
  fezPixCpfCaixa,
  fezOpenFinance,
}: AderenciaCaixaInput): AderenciaCaixaResultado {
  const isAtual = normalizarPercentual(isPercentual)
  const alertas: string[] = []
  const recomendacoes: string[] = []

  let statusIS = 'OK - IS dentro da regra Caixa'
  if (isAtual > MAC_LIMITES.isMaximoOk && possuiRendaSuporte) {
    statusIS = 'Recuperavel - IS acima de 40% com renda suporte'
    recomendacoes.push('Validar renda suporte e documentar justificativa antes de prosseguir.')
  } else if (isAtual > MAC_LIMITES.isMaximoOk) {
    statusIS = 'Critico - IS acima de 40% sem renda suporte'
    recomendacoes.push('Reavaliar capacidade de pagamento antes de avancar.')
  }

  let score = 0
  if (fezPortabilidadeSalario) {
    score += MAC_PESOS.portabilidadeSalario
    if (fezPixCpfCaixa) score += MAC_PESOS.pixCpfCaixa
    if (fezOpenFinance) score += MAC_PESOS.openFinance
  } else {
    alertas.push('Critico - sem portabilidade, alto risco de nao liberacao.')
    recomendacoes.push('Priorizar portabilidade antes de seguir com o processo.')
  }

  if (!fezPixCpfCaixa) {
    alertas.push('Problema grave: ausencia de PIX CPF na Caixa.')
    recomendacoes.push('Regularizar portabilidade do CPF para PIX Caixa, pois este ponto compromete fortemente a aderencia.')
  }

  if (!fezOpenFinance) {
    alertas.push('Risco relevante: Open Finance nao realizado.')
    recomendacoes.push('Solicitar Open Finance para fortalecer relacionamento e leitura de renda.')
  }

  if (isAtual > MAC_LIMITES.isMaximoOk) {
    alertas.push(possuiRendaSuporte ? 'IS acima de 40%, mas com renda suporte informada.' : 'IS acima de 40% sem renda suporte.')
  }

  let statusGeral = 'Alto risco'
  if (!fezPortabilidadeSalario) {
    statusGeral = 'Critico - sem portabilidade, alto risco de nao liberacao'
    score = 0
  } else if (score === MAC_LIMITES.scoreExcelente) {
    statusGeral = 'Excelente aderencia'
  } else if (score >= MAC_LIMITES.scoreBomMinimo) {
    statusGeral = 'Boa aderencia'
  } else if (score >= MAC_LIMITES.scoreModeradoMinimo) {
    statusGeral = 'Risco moderado'
  }

  const bloqueioCritico = !fezPortabilidadeSalario || (isAtual > MAC_LIMITES.isMaximoOk && !possuiRendaSuporte)
  const recuperavel = !bloqueioCritico && (score >= MAC_LIMITES.scoreModeradoMinimo || possuiRendaSuporte)

  return {
    score,
    statusGeral,
    statusIS,
    alertas,
    recomendacoes,
    recuperavel,
    bloqueioCritico,
  }
}
