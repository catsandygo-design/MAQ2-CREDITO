const pendenciasAnalista = [
  ['critico', 'MATHEUS ALVES', 'Extrato FGTS pendente de retorno do corretor', 'Hoje 17:00'],
  ['medio', 'ANA PAULA', 'Documento enviado aguardando abertura do analista', '12h'],
  ['medio', 'CARLOS HENRIQUE', 'Renda informal exige declaracao complementar', '24h'],
  ['ok', 'JOAO AMORIN', 'Kit documental aprovado para envio ao CCA', 'OK'],
];

const telemetria = [
  ['458712', 'Matheus Alves de Melo', 'Bianca Moura', 'Em Processo', 'Pendencia documental', '24h'],
  ['458713', 'Ana Paula Ribeiro', 'Douglas Silva', 'Em Processo', 'Em analise documental', '12h'],
  ['458714', 'Carlos Henrique Souza', 'Patricia Nunes', 'Pendencia', 'Renda em revisao', '36h'],
  ['458715', 'Joao Amorin', 'CCA Central', 'Finalizado', 'Enviado ao CCA', 'OK'],
  ['458716', 'Mariana Costa Lima', 'Bianca Moura', 'Em Processo', 'Aguardando documentos', '18h'],
];

const resumoCarteira = [
  ['Clientes em reserva', '42', 'processos ativos na carteira'],
  ['Finalizados', '18', 'kits aprovados ou enviados ao CCA'],
  ['Em pendencia', '9', 'dependem de ajuste documental'],
];

function badge(status: string) {
  const s = status.toLowerCase();
  if (s.includes('pend')) return 'cor-badge cor-badge-danger';
  if (s.includes('finalizado') || s.includes('aprovado') || s.includes('ok')) return 'cor-badge cor-badge-ok';
  if (s.includes('analise') || s.includes('aguardando') || s.includes('revisao')) return 'cor-badge cor-badge-warn';
  return 'cor-badge cor-badge-info';
}

export default function AppAnalistaPage() {
  return (
    <main className="cor-page cor-page-premium" data-layout-version="analista-dashboards-v1">
      <header className="cor-premium-top">
        <div className="cor-premium-title">
          <span className="cor-chart-icon">↗</span>
          <div>
            <h1>Painel do Analista</h1>
            <p>Gestao documental, pendencias de credito, SLA da carteira e telemetria dos processos em reserva.</p>
          </div>
        </div>
        <div className="cor-premium-actions cor-actions-no-primary">
          <button>↻ Atualizar</button>
          <button>↪ Sair</button>
        </div>
      </header>

      <section className="cor-dash-grid cor-dash-premium">
        <article className="cor-card cor-panel-alerts">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 1 — Pendencias acompanhadas</small>
              <p>Clientes e documentos que precisam de acao do analista ou retorno do corretor.</p>
            </div>
            <strong className="cor-urgent-pill">3 atencoes</strong>
          </div>
          <div className="cor-alert-list">
            {pendenciasAnalista.map(([tone, nome, desc, prazo]) => (
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
                <small>Dashboard 2 — Carteira em reserva</small>
                <p>Quantidade de clientes em reserva, finalizados e em pendencia documental.</p>
              </div>
            </div>
            <div className="cca-flow-metrics">
              {resumoCarteira.map(([label, total, desc]) => (
                <div key={label}>
                  <span>{label}</span>
                  <b>{total}</b>
                  <small>{desc}</small>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="cor-card cor-panel-conversion">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 3 — SLA</small>
              <p>Tempo medio da carteira do analista comparado ao melhor SLA operacional.</p>
            </div>
          </div>
          <div className="cor-speed-premium">
            <div className="cor-speed-arc" />
            <div className="cor-speed-needle" />
            <span />
          </div>
          <div className="cor-sla-lines">
            <div><span>Melhor SLA documental</span><small>Referencia da operacao</small><b className="green">3h</b></div>
            <div><span>SLA atual do analista</span><small>Media de resposta da carteira</small><b className="orange">11h</b></div>
          </div>
        </article>
      </section>

      <section className="cor-table-card">
        <h2>Telemetria da carteira do analista</h2>
        <div className="cor-table-scroll">
          <table className="cor-table">
            <thead>
              <tr>
                <th>Reserva</th>
                <th>Cliente</th>
                <th>Responsavel</th>
                <th>Momento</th>
                <th>Status documental</th>
                <th>SLA</th>
              </tr>
            </thead>
            <tbody>
              {telemetria.map(([reserva, cliente, corretor, momento, status, sla]) => (
                <tr key={reserva}>
                  <td><strong>{reserva}</strong></td>
                  <td><a className="cor-link" href={`/analista/checklist?cliente=${encodeURIComponent(cliente)}&reserva=${reserva}`}>{cliente}</a></td>
                  <td>{corretor}</td>
                  <td>{momento}</td>
                  <td><span className={badge(status)}>{status}</span></td>
                  <td><span className={badge(sla)}>{sla}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
