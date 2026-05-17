import Link from 'next/link';

const clientes = [
  ['458712', 'Matheus Alves de Melo', 'pendencia documentacao', 'documentos pendenciados', 'pendente', 'nao tem', 'reserva ativa', '24h'],
  ['458713', 'Ana Paula Ribeiro', 'formularios disponiveis', 'ficha agehab liberada', 'pago', 'finalizado', 'aguardando envio', '12h'],
  ['458714', 'Carlos Henrique Souza', 'em validacao credito', 'em analise do credito', 'nao tem', 'nao tem', 'analise inicial', '36h'],
];

const alertas = [
  ['critico', 'MATHEUS ALVES', 'Analista: Bianca • Documento pendente: Extrato FGTS', 'Hoje 17:00'],
  ['medio', 'ANA CLARA', 'Analista: Douglas • Documento pendente: Ficha Agehab', '24h'],
  ['ok', 'JOAO PEDRO', 'Analista: CCA Central • Documento pendente: Assinatura MO', '48h'],
];

const taxaRetrabalho = 3.2;

function badge(status: string) {
  const s = status.toLowerCase();
  if (s.includes('pend')) return 'cor-badge cor-badge-danger';
  if (s.includes('pago') || s.includes('finalizado') || s.includes('liberada')) return 'cor-badge cor-badge-ok';
  if (s.includes('analise') || s.includes('validacao') || s.includes('aguardando')) return 'cor-badge cor-badge-warn';
  return 'cor-badge cor-badge-info';
}

function retrabalhoClass(value: number) {
  if (value <= 2) return 'cor-rework cor-rework-ok';
  if (value <= 4) return 'cor-rework cor-rework-warn';
  return 'cor-rework cor-rework-danger';
}

export default function AcompanhamentoCorretorPage() {
  return (
    <main className="cor-page cor-page-premium" data-layout-version="dashboards-compactos-v2">
      <header className="cor-premium-top">
        <div className="cor-premium-title">
          <span className="cor-chart-icon">↗</span>
          <div>
            <h1>Acompanhamento do Corretor</h1>
            <p>Tela inicial do corretor com alertas, SLA de entrega de documentos e evolucao das reservas ate o repasse.</p>
          </div>
        </div>
        <div className="cor-premium-actions">
          <button>+ Nova reserva</button>
          <button>↻ Atualizar</button>
          <button>↪ Sair</button>
        </div>
      </header>

      <section className="cor-dash-grid cor-dash-premium">
        <article className="cor-card cor-panel-alerts">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 1 — Alertas</small>
              <p>Analista de credito, cliente, documento pendente e prazo de entrega.</p>
            </div>
            <strong className="cor-urgent-pill">3 urgentes</strong>
          </div>
          <div className="cor-alert-list">
            {alertas.map(([tone, nome, desc, prazo]) => (
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
              <small>Dashboard 2 — SLA</small>
              <p>Melhor SLA de entrega de documentos versus SLA atual do corretor.</p>
            </div>
          </div>
          <div className="cor-speed-premium">
            <div className="cor-speed-arc" />
            <div className="cor-speed-needle" />
            <span />
          </div>
          <div className="cor-sla-lines">
            <div><span>Melhor SLA de entrega</span><small>Referencia da carteira</small><b className="green">3h</b></div>
            <div><span>SLA atual do corretor</span><small>Media de resposta as pendencias</small><b className="orange">14h</b></div>
          </div>
        </article>
        <article className="cor-card cor-rework-card">
          <div className={retrabalhoClass(taxaRetrabalho)}>
            <span className="cor-rework-icon">🔨</span>
            <span>Taxa de retrabalho</span>
            <b>{taxaRetrabalho.toFixed(1).replace('.', ',')}%</b>
          </div>
        </article>
        </div>

        <article className="cor-card cor-panel-conversion">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 3 — Reservas x Repasses</small>
              <p>Quantidade de clientes em reserva comparada aos clientes repassados.</p>
            </div>
          </div>
          <div className="cor-mini-metrics">
            <div><span>Clientes em reserva</span><b>42</b><small>processos ativos</small></div>
            <div><span>Clientes repassados</span><b>18</b><small>vendas repassadas</small></div>
          </div>
          <div className="cor-conversion-bar"><span>Taxa de conversao</span><b>42,9%</b></div>
        </article>
      </section>

      <section className="cor-table-card">
        <h2>Fila de acompanhamento</h2>
        <div className="cor-table-scroll">
          <table className="cor-table">
            <thead>
              <tr>
                <th>Reserva</th><th>Nome do cliente</th><th>Status Caixa</th><th>Status Agehab</th><th>Sinal</th><th>Fiador</th><th>Momento da reserva</th><th>Prazo</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(([reserva, nome, caixa, agehab, sinal, fiador, momento, prazo]) => (
                <tr key={reserva}>
                  <td><strong>{reserva}</strong></td>
                  <td><Link className="cor-link" href={`/painel/checklist-documentos?cliente=${encodeURIComponent(nome)}&reserva=${reserva}`}>{nome}</Link></td>
                  <td><span className={badge(caixa)}>{caixa}</span></td>
                  <td><span className={badge(agehab)}>{agehab}</span></td>
                  <td><span className={badge(sinal)}>{sinal}</span></td>
                  <td><span className={badge(fiador)}>{fiador}</span></td>
                  <td>{momento}</td>
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
