import { calcularAderenciaCaixa, MAC_PESOS } from '../lib/aderenciaCaixa'
import type { AderenciaCaixaInput, AderenciaCaixaResultado } from '../lib/aderenciaCaixa'

interface MetricaAderenciaCaixaProps {
  input: AderenciaCaixaInput
  title?: string
}

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function statusTone(texto: string, resultado?: AderenciaCaixaResultado): string {
  const normalizado = normalizarTexto(texto)
  if (resultado?.bloqueioCritico || normalizado.includes('critico')) return 'critical'
  if (normalizado.includes('alto')) return 'high'
  if (normalizado.includes('moderado') || normalizado.includes('recuperavel')) return 'medium'
  if (normalizado.includes('boa')) return 'good'
  return 'excellent'
}

function simNao(valor: boolean): string {
  return valor ? 'Sim' : 'Nao'
}

export function MetricaAderenciaCaixa({ input, title = 'Metrica de Aderencia Caixa' }: MetricaAderenciaCaixaProps) {
  const resultado = calcularAderenciaCaixa(input)
  const tone = statusTone(resultado.statusGeral, resultado)
  const statusIsTone = statusTone(resultado.statusIS)
  const alertas = resultado.alertas.length ? resultado.alertas : ['Sem alertas para a MAC no momento.']
  const recomendacoes = resultado.recomendacoes.length
    ? resultado.recomendacoes
    : ['Cliente aderente aos pontos principais. Manter conferencia documental.']

  return (
    <section className="mac-react" aria-label="Metrica de Aderencia Caixa">
      <div className="mac-react-head">
        <div>
          <span>MAC</span>
          <h3>{title}</h3>
          <p>Leitura operacional de IS, portabilidade, PIX CPF Caixa e Open Finance.</p>
        </div>
        <strong className={`mac-react-pill mac-react-pill-${tone}`}>{resultado.statusGeral}</strong>
      </div>

      <div className="mac-react-grid">
        <article className={`mac-react-card mac-react-card-${tone}`}>
          <span>Score final</span>
          <strong>{resultado.score}%</strong>
          <div className="mac-react-progress" aria-hidden="true">
            <div style={{ width: `${resultado.score}%` }} />
          </div>
          <small>
            Pesos: portabilidade {MAC_PESOS.portabilidadeSalario}%, PIX {MAC_PESOS.pixCpfCaixa}%, Open Finance{' '}
            {MAC_PESOS.openFinance}%.
          </small>
        </article>
        <article className={`mac-react-card mac-react-card-${statusIsTone}`}>
          <span>Status do IS</span>
          <strong>{resultado.statusIS}</strong>
          <small>IS atual: {input.isPercentual.toFixed(2).replace('.', ',')}%.</small>
        </article>
        <article className={`mac-react-card ${input.fezPortabilidadeSalario ? 'mac-react-card-excellent' : 'mac-react-card-critical'}`}>
          <span>Portabilidade salario</span>
          <strong>{simNao(input.fezPortabilidadeSalario)}</strong>
          <small>Peso {MAC_PESOS.portabilidadeSalario}%.</small>
        </article>
        <article className={`mac-react-card ${input.fezPixCpfCaixa ? 'mac-react-card-excellent' : 'mac-react-card-high'}`}>
          <span>PIX CPF Caixa</span>
          <strong>{simNao(input.fezPixCpfCaixa)}</strong>
          <small>Peso {MAC_PESOS.pixCpfCaixa}%.</small>
        </article>
        <article className={`mac-react-card ${input.fezOpenFinance ? 'mac-react-card-excellent' : 'mac-react-card-medium'}`}>
          <span>Open Finance</span>
          <strong>{simNao(input.fezOpenFinance)}</strong>
          <small>Peso {MAC_PESOS.openFinance}%.</small>
        </article>
      </div>

      <div className="mac-react-lists">
        <div>
          <h4>Alertas individuais</h4>
          <ul>
            {alertas.map((alerta) => (
              <li key={alerta}>{alerta}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Recomendacoes automaticas</h4>
          <ul>
            {recomendacoes.map((recomendacao) => (
              <li key={recomendacao}>{recomendacao}</li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="mac-react-footer">
        <p>
          {resultado.bloqueioCritico
            ? 'Existe bloqueio critico ou risco alto. Corrija relacionamento Caixa e/ou renda antes de avancar.'
            : resultado.recuperavel
              ? 'Cliente recuperavel. Avance somente com justificativa documentada e pontos de relacionamento ajustados.'
              : 'Cliente aderente aos criterios principais da Caixa para continuidade operacional.'}
        </p>
        <strong className={`mac-react-pill mac-react-pill-${resultado.recuperavel ? 'good' : tone}`}>
          Recuperavel: {simNao(resultado.recuperavel)}
        </strong>
      </footer>
    </section>
  )
}
