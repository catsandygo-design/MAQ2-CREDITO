const pendenciasGestor = [
  ['critico', 'MATHEUS ALVES', 'Extrato FGTS pendente de retorno do corretor', 'Hoje 17:00'],
  ['medio', 'ANA PAULA', 'Documento enviado aguardando abertura do analista', '12h'],
  ['medio', 'CARLOS HENRIQUE', 'Renda informal exige declaracao complementar', '24h'],
  ['ok', 'JOAO AMORIN', 'Kit documental aprovado para envio ao CCA', 'OK'],
];

const produtividadeGestor = [
  ['Bianca Moura', '18', '8', '44,4%'],
  ['Douglas Silva', '14', '6', '42,9%'],
  ['Patricia Nunes', '10', '4', '40,0%'],
];

const totalProdutividade = ['Total', '42', '18', '42,9%'];

const telemetria = [
  ['458712', 'Matheus Alves de Melo', 'Bianca Moura', 'pendencia documentacao', 'documentos pendenciados', 'pendente', 'nao tem', 'reserva ativa', '18h', '24h'],
  ['458713', 'Ana Paula Ribeiro', 'Douglas Silva', 'formularios disponiveis', 'ficha agehab liberada', 'pago', 'finalizado', 'aguardando envio', '6h', '12h'],
  ['458714', 'Carlos Henrique Souza', 'Patricia Nunes', 'em validacao credito', 'em analise do credito', 'nao tem', 'nao tem', 'analise inicial', '22h', '36h'],
];

function badge(status: string) {
  const s = status.toLowerCase();
  if (s.includes('pend')) return 'cor-badge cor-badge-danger';
  if (s.includes('pago') || s.includes('finalizado') || s.includes('liberada') || s.includes('ok')) return 'cor-badge cor-badge-ok';
  if (s.includes('analise') || s.includes('validacao') || s.includes('aguardando')) return 'cor-badge cor-badge-warn';
  return 'cor-badge cor-badge-info';
}

export default function GestorTelemetriaPage() {
  return (
    <main className="cor-page cor-page-premium" data-layout-version="gestor-template-analista-v1">
      <header className="cor-premium-top">
        <div className="cor-premium-title">
          <span className="cor-chart-icon">↗</span>
          <div>
            <h1>Painel do Gestor</h1>
            <p>Visao executiva da carteira, produtividade por gestor, SLA operacional e telemetria dos processos.</p>
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
              <p>Clientes e documentos que precisam de acao do gestor ou retorno da operacao.</p>
            </div>
            <strong className="cor-urgent-pill">3 atencoes</strong>
          </div>
          <div className="cor-alert-list">
            {pendenciasGestor.map(([tone, nome, desc, prazo]) => (
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
                <small>Dashboard 2 — Produtividade por gestor</small>
                <p>Reservas, finalizados e percentual concluido por responsavel.</p>
              </div>
            </div>
            <div className="gestor-mini-table">
              <div className="gestor-mini-row gestor-mini-head">
                <span>Gestor</span>
                <span>QT reserva</span>
                <span>Finalizado</span>
                <span>%</span>
              </div>
              {produtividadeGestor.map(([gestor, reservas, finalizado, percentual]) => (
                <div className="gestor-mini-row" key={gestor}>
                  <strong>{gestor}</strong>
                  <b>{reservas}</b>
                  <b>{finalizado}</b>
                  <b>{percentual}</b>
                </div>
              ))}
              <div className="gestor-mini-row gestor-mini-total">
                <strong>{totalProdutividade[0]}</strong>
                <b>{totalProdutividade[1]}</b>
                <b>{totalProdutividade[2]}</b>
                <b>{totalProdutividade[3]}</b>
              </div>
            </div>
          </article>
        </div>

        <article className="cor-card cor-panel-conversion">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 3 — SLA</small>
              <p>Comparativo do melhor SLA, pior SLA e media da carteira.</p>
            </div>
          </div>
          <div className="cor-speed-premium">
            <div className="cor-speed-arc" />
            <div className="cor-speed-needle" />
            <span />
          </div>
          <div className="cor-sla-lines">
            <div><span>Melhor SLA</span><small>Processo mais eficiente</small><b className="green">3h</b></div>
            <div><span>Pior SLA</span><small>Maior tempo em aberto</small><b className="red">36h</b></div>
            <div><span>Media SLA</span><small>Carteira atual</small><b className="green">14h</b></div>
          </div>
        </article>
      </section>

      <section className="cor-table-card">
        <h2>Telemetria da carteira do gestor</h2>
        <div className="cor-table-scroll">
          <table className="cor-table">
            <thead>
              <tr>
                <th>Reserva</th>
                <th>Nome do cliente</th>
                <th>Responsavel</th>
                <th>Status Caixa</th>
                <th>Status Agehab</th>
                <th>Sinal</th>
                <th>Fiador</th>
                <th>Momento da reserva</th>
                <th>SLA Cliente</th>
                <th>Prazo</th>
              </tr>
            </thead>
            <tbody>
              {telemetria.map(([reserva, nome, responsavel, caixa, agehab, sinal, fiador, momento, slaCliente, prazo]) => (
                <tr key={reserva}>
                  <td><strong>{reserva}</strong></td>
                  <td><a className="cor-link" href={`/analista/checklist?cliente=${encodeURIComponent(nome)}&reserva=${reserva}`}>{nome}</a></td>
                  <td>{responsavel}</td>
                  <td><span className={badge(caixa)}>{caixa}</span></td>
                  <td><span className={badge(agehab)}>{agehab}</span></td>
                  <td><span className={badge(sinal)}>{sinal}</span></td>
                  <td><span className={badge(fiador)}>{fiador}</span></td>
                  <td>{momento}</td>
                  <td><span className={badge(slaCliente)}>{slaCliente}</span></td>
                  <td><span className="cor-badge cor-badge-info">{prazo}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
