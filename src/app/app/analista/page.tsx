const pendenciasAnalista = [
  ['critico', 'MATHEUS ALVES', 'Extrato FGTS pendente de retorno do corretor', 'Hoje 17:00'],
  ['medio', 'ANA PAULA', 'Documento enviado aguardando abertura do analista', '12h'],
  ['medio', 'CARLOS HENRIQUE', 'Renda informal exige declaracao complementar', '24h'],
  ['ok', 'JOAO AMORIN', 'Kit documental aprovado para envio ao CCA', 'OK'],
];

const filaViva = [
  {
    id: '458712',
    produto: 'RD',
    cliente: 'EVERSON LOURENCO PEREIRA DA SILVA',
    empreendimento: 'AGL030 - Vila Girassol',
    corretor: 'rebeca carvalho',
    cca: '-',
    prioridade: 'Prioridade alta',
    comercial: '76 dias',
    credito: '17 dias',
  },
  {
    id: '458713',
    produto: 'RD',
    cliente: 'KHETLLEN GERMANO DA SILVA',
    empreendimento: 'AGL032 - Vila Margarida - Receitas de Incorporacao',
    corretor: 'joao andrade',
    cca: '-',
    prioridade: 'Prioridade alta',
    comercial: '27 dias',
    credito: '8 dias',
  },
  {
    id: '458714',
    produto: 'RD',
    cliente: 'ELIEZIO ALVES DO CARMO',
    empreendimento: 'AGL030 - Vila Girassol',
    corretor: 'leticia brito',
    cca: '-',
    prioridade: 'Prioridade alta',
    comercial: '23 dias',
    credito: '5 dias',
  },
  {
    id: '458715',
    produto: 'RD',
    cliente: 'JOAO AMORIN',
    empreendimento: 'AGL030 - Vila Girassol',
    corretor: 'mariana costa',
    cca: '-',
    prioridade: 'Prioridade alta',
    comercial: '19 dias',
    credito: '4 dias',
  },
];

const resumoCarteira = [
  ['Clientes em reserva', '42', 'processos ativos na carteira'],
  ['Finalizados', '18', 'kits aprovados ou enviados ao CCA'],
  ['Em pendencia', '9', 'dependem de ajuste documental'],
];

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

      <section className="analyst-live-board">
        <header className="analyst-live-head">
          <div>
            <span>Fila viva</span>
            <h2>Fluxo do cliente</h2>
            <p>Cada card mostra etapa, travas e proxima acao sem repetir o mesmo resumo em varios blocos.</p>
          </div>
          <div className="analyst-live-actions">
            <strong>20 processo(s)</strong>
            <strong>17 aguardando docs</strong>
            <strong>20 prioridade alta</strong>
            <button>Abrir todos</button>
            <button>Fechar todos</button>
            <button>Fechar</button>
          </div>
        </header>

        <div className="analyst-live-list">
          {filaViva.map((cliente) => (
            <article className="analyst-live-card" key={cliente.id}>
              <div className="analyst-live-main">
                <div className="analyst-client-title">
                  <i />
                  <b>{cliente.produto}</b>
                  <h3>{cliente.cliente}</h3>
                </div>
                <p>{cliente.empreendimento}</p>
                <p>{cliente.corretor}</p>
                <div className="analyst-cca-line">
                  <span>CCA responsavel</span>
                  <em>{cliente.cca}</em>
                </div>
                <small>{cliente.prioridade}</small>
              </div>

              <div className="analyst-live-status">
                <div>
                  <span>Comercial {cliente.comercial}</span>
                  <span>Credito {cliente.credito}</span>
                </div>
                <a href={`/analista/checklist?cliente=${encodeURIComponent(cliente.cliente)}&reserva=${cliente.id}`}>Abrir detalhes</a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
