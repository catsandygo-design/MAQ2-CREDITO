import { Link } from 'react-router-dom'
import { MetricaAderenciaCaixa } from '../components/MetricaAderenciaCaixa'
import { FINAL_MODULE_BY_KEY } from '../config/finalNavigation'
import type { AderenciaCaixaInput } from '../lib/aderenciaCaixa'

interface FinalWorkspacePageProps {
  moduleKey: string
}

const STATUS_COPY = {
  'react-ready': 'Modulo ja possui tela React com dados reais.',
  'react-structure': 'Modulo criado como estrutura React para orientar a implementacao final.',
  'legacy-bridge': 'Modulo ainda depende do HTML legado; a rota React documenta o corte de migracao.',
}

const MAC_PREVIEW_INPUT: AderenciaCaixaInput = {
  isPercentual: 38,
  possuiRendaSuporte: false,
  fezPortabilidadeSalario: true,
  fezPixCpfCaixa: false,
  fezOpenFinance: true,
}

// Pagina estrutural usada enquanto cada modulo ganha paridade real.
// Ela nao tenta esconder o legado: mostra o destino React e o que falta migrar.
export function FinalWorkspacePage({ moduleKey }: FinalWorkspacePageProps) {
  const module = FINAL_MODULE_BY_KEY[moduleKey]

  if (!module) {
    return (
      <div className="final-module-card">
        <span className="final-kicker">Modulo nao encontrado</span>
        <h2>Mapa de implementacao indisponivel</h2>
        <p>Revise a configuracao em `frontend-react/src/config/finalNavigation.ts`.</p>
      </div>
    )
  }

  return (
    <article className="final-module-card">
      <div className="final-module-head">
        <div>
          <span className="final-kicker">Modulo final</span>
          <h2>{module.label}</h2>
          <p>{module.purpose}</p>
        </div>
        <span className={`final-status final-status-${module.status}`}>{STATUS_COPY[module.status]}</span>
      </div>

      <div className="final-module-grid">
        <section>
          <h3>Valor para o usuario</h3>
          <p>{module.userValue}</p>
        </section>
        <section>
          <h3>Responsavel operacional</h3>
          <p>{module.owner}</p>
        </section>
      </div>

      <section className="final-implementation">
        <h3>Comentarios para implementacao final</h3>
        <ul>
          {module.implementationNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      {module.key === 'analise-cliente' ? <MetricaAderenciaCaixa input={MAC_PREVIEW_INPUT} /> : null}

      <div className="final-actions">
        {module.status === 'react-ready' ? <Link to={module.path}>Abrir modulo React</Link> : null}
        {module.legacyPath ? <a href={module.legacyPath}>Abrir legado operacional</a> : null}
      </div>
    </article>
  )
}
