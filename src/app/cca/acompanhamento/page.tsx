import Link from 'next/link';

const processosCca = [
  ['458712', 'Matheus Alves de Melo', 'credito em validacao', 'documento pendente', 'biometria pendente', 'sem fiador', 'analise inicial', 'Hoje 17:00'],
  ['458713', 'Ana Paula Ribeiro', 'formularios disponiveis', 'kit conformidade ok', 'biometria agendada', 'fiador finalizado', 'emissao de formularios', '12h'],
  ['458714', 'Carlos Henrique Souza', 'renda em revisao', 'pendencia FGTS', 'aguardando cliente', 'sem fiador', 'retorno corretor', '24h'],
  ['458715', 'Joao Pedro Martins', 'minuta solicitada', 'conformidade enviada', 'assinatura aguardando', 'sem fiador', 'pre-assinatura', '48h'],
];

const alertasCca = [
  ['critico', 'MATHEUS ALVES', 'Pendencia critica: extrato FGTS e comprovante de renda', 'Hoje 17:00'],
  ['medio', 'CARLOS HENRIQUE', 'Revisar renda informal e declaracao complementar', '24h'],
  ['ok', 'ANA PAULA', 'Kit pronto para emissao de formularios Caixa', '12h'],
  ['medio', 'JOAO PEDRO', 'Aguardando retorno de biometria para assinatura', '48h'],
];

const taxaRetrabalho = 2.6;

function badge(status: string) {
  const s = status.toLowerCase();
  if (s.includes('pend') || s.includes('critica') || s.includes('revisao')) return 'cor-badge cor-badge-danger';
  if (s.includes('ok') || s.includes('pronto') || s.includes('finalizado') || s.includes('enviada')) return 'cor-badge cor-badge-ok';
  if (s.includes('aguardando') || s.includes('agendada') || s.includes('validacao') || s.includes('solicitada')) return 'cor-badge cor-badge-warn';
  return 'cor-badge cor-badge-info';
}

function retrabalhoClass(value: number) {
  if (value <= 2) return 'cor-rework cor-rework-ok';
  if (value <= 4) return 'cor-rework cor-rework-warn';
  return 'cor-rework cor-rework-danger';
}

export default function CcaAcompanhamentoPage() {
  return (
    <main className="cor-page cor-page-premium" data-layout-version="cca-dashboards-v1">
      <header className="cor-premium-top">
        <div className="cor-premium-title">
          <span className="cor-chart-icon">↗</span>
          <div>
            <h1>Painel CCA</h1>
            <p>Esteira de analise, conformidade documental, pendencias Caixa e preparacao para assinatura.</p>
          </div>
        </div>
        <div className="cor-premium-actions">
          <button>+ Novo protocolo</button>
          <button>↻ Atualizar</button>
          <button>↪ Sair</button>
        </div>
      </header>

      <section className="cor-dash-grid cor-dash-premium">
        <article className="cor-card cor-panel-alerts">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 1 — Pendencias CCA</small>
              <p>Cliente, pendencia operacional, prioridade e prazo de resposta.</p>
            </div>
            <strong className="cor-urgent-pill">2 criticas</strong>
          </div>
          <div className="cor-alert-list">
            {alertasCca.map(([tone, nome, desc, prazo]) => (
              <div className={`cor-alert-item cor-alert-${tone}`} key={nome}>
                <i />
                <div>
                  <b>{nome}</b>
                  <span>{desc}</span>
                </div>
                <em><small>Prazo</small>{prazo}</em>
              </div>
            ))}
          </div>
        </article>

        <div className="cor-sla-stack">
          <article className="cor-card cor-panel-sla">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 2 — SLA CCA</small>
                <p>Tempo medio entre recebimento do kit, validacao e devolutiva operacional.</p>
              </div>
            </div>
            <div className="cor-speed-premium">
              <div className="cor-speed-arc" />
              <div className="cor-speed-needle" />
              <span />
            </div>
            <div className="cor-sla-lines">
              <div><span>Melhor SLA CCA</span><small>Carteira atual</small><b className="green">2h</b></div>
              <div><span>SLA medio da fila</span><small>Processos em tratamento</small><b className="orange">9h</b></div>
            </div>
          </article>
          <article className="cor-card cor-rework-card">
            <div className={retrabalhoClass(taxaRetrabalho)}>
              <span className="cor-rework-icon">🔨</span>
              <span>Retrabalho documental CCA</span>
              <b>{taxaRetrabalho.toFixed(1).replace('.', ',')}%</b>
            </div>
          </article>
        </div>

        <article className="cor-card cor-panel-conversion">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 3 — Analises x Assinaturas</small>
              <p>Quantidade de processos recebidos comparada aos processos liberados para assinatura.</p>
            </div>
          </div>
          <div className="cor-mini-metrics">
            <div><span>Em analise CCA</span><b>31</b><small>processos ativos</small></div>
            <div><span>Liberados assinatura</span><b>14</b><small>kits aprovados</small></div>
          </div>
          <div className="cor-conversion-bar"><span>Taxa de liberacao</span><b>45,1%</b></div>
        </article>
      </section>

      <section className="cor-table-card">
        <h2>Fila CCA de analise e conformidade</h2>
        <div className="cor-table-scroll">
          <table className="cor-table">
            <thead>
              <tr>
                <th>Reserva</th><th>Cliente</th><th>Status Credito</th><th>Status Documental</th><th>Biometria</th><th>Fiador</th><th>Momento CCA</th><th>Prazo</th>
              </tr>
            </thead>
            <tbody>
              {processosCca.map(([reserva, nome, credito, documental, biometria, fiador, momento, prazo]) => (
                <tr key={reserva}>
                  <td><strong>{reserva}</strong></td>
                  <td><Link className="cor-link" href={`/painel/checklist-documentos?id=${reserva}`}>{nome}</Link></td>
                  <td><span className={badge(credito)}>{credito}</span></td>
                  <td><span className={badge(documental)}>{documental}</span></td>
                  <td><span className={badge(biometria)}>{biometria}</span></td>
                  <td><span className={badge(fiador)}>{fiador}</span></td>
                  <td>{momento}</td>
                  <td><span className={badge(prazo)}>{prazo}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
