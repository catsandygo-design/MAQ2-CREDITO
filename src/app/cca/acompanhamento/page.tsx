const processosCca = [
  ['458712', 'PP', 'Matheus Alves de Melo', 'Bianca Moura', 'Ag. 3884 - Caixa Sul', 'aguardando documentos'],
  ['458713', 'PN', 'Ana Paula Ribeiro', 'Douglas Silva', 'Ag. 2710 - Caixa Centro', 'emitir formularios'],
  ['458714', 'PA', 'Carlos Henrique Souza', 'Patricia Nunes', 'Ag. 4201 - Caixa Norte', 'formularios emitidos'],
  ['458715', 'PP', 'Joao Amorin', 'CCA Central', 'Ag. 1562 - Caixa Oeste', 'formularios assinados'],
  ['458716', 'PN', 'Mariana Costa Lima', 'Bianca Moura', 'Ag. 3884 - Caixa Sul', 'pendencia documental'],
  ['458717', 'PA', 'Renato Gomes Paiva', 'Douglas Silva', 'Ag. 2710 - Caixa Centro', 'agendado para 22/05 - 14h'],
];

const alertasCca = [
  ['critico', 'MATHEUS ALVES', 'Pendencia critica: extrato FGTS e comprovante de renda', 'Hoje 17:00'],
  ['medio', 'CARLOS HENRIQUE', 'Revisar renda informal e declaracao complementar', '24h'],
  ['ok', 'ANA PAULA', 'Kit pronto para emissao de formularios Caixa', '12h'],
  ['medio', 'JOAO PEDRO', 'Aguardando retorno de biometria para assinatura', '48h'],
];

const momentosCliente = [
  'aguardando documentos',
  'analise credito',
  'emitir formularios',
  'formularios emitidos',
  'formularios assinados',
  'pendencia documental',
  'aguardando conformidade',
  'em agendamento',
  'agendado para data - horas abrevidadas',
  'minuta assinada',
  'processo finalizado',
];

const momentosComAlerta = ['emitir formularios', 'formularios assinados'];

const clientesPorAgencia = [
  ['Ag. 3884 - Caixa Sul', '2'],
  ['Ag. 2710 - Caixa Centro', '2'],
  ['Ag. 4201 - Caixa Norte', '1'],
  ['Ag. 1562 - Caixa Oeste', '1'],
];

function badge(status: string) {
  const s = status.toLowerCase();
  if (momentosComAlerta.includes(s)) return 'cor-badge cor-badge-danger cca-alert-badge';
  if (s.includes('pend') || s.includes('critica') || s.includes('revisao')) return 'cor-badge cor-badge-danger';
  if (s.includes('ok') || s.includes('pronto') || s.includes('finalizado') || s.includes('enviada')) return 'cor-badge cor-badge-ok';
  if (s.includes('aguardando') || s.includes('agendado') || s.includes('agendamento') || s.includes('validacao') || s.includes('solicitada')) return 'cor-badge cor-badge-warn';
  return 'cor-badge cor-badge-info';
}

export default function CcaAcompanhamentoPage() {
  return (
    <main className="cor-page cor-page-premium" data-layout-version="cca-dashboards-agencias-v3">
      <header className="cor-premium-top">
        <div className="cor-premium-title">
          <span className="cor-chart-icon">↗</span>
          <div>
            <h1>Painel CCA</h1>
            <p>Esteira de analise, conformidade documental, pendencias Caixa e preparacao para assinatura.</p>
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
                <small>Dashboard 2 — Clientes por agencia Caixa</small>
                <p>Distribuicao dos processos CCA por agencia Caixa responsavel.</p>
              </div>
            </div>
            <div className="cca-agency-list">
              {clientesPorAgencia.map(([agencia, total]) => (
                <div className="cca-agency-row" key={agencia}>
                  <span>{agencia}</span>
                  <b>{total}</b>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="cor-card cor-panel-conversion">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 3 — Resumo operacional CCA</small>
              <p>Volume atual com CCA, encaminhados para conformidade e contratos ja assinados.</p>
            </div>
          </div>
          <div className="cca-flow-metrics">
            <div><span>Com o CCA</span><b>31</b><small>processos ativos</small></div>
            <div><span>Para conformidade</span><b>18</b><small>encaminhados</small></div>
            <div><span>Assinados</span><b>9</b><small>minutas assinadas</small></div>
          </div>
        </article>
      </section>

      <section className="cor-table-card">
        <h2>Fila CCA de analise e conformidade</h2>
        <div className="cca-moment-strip">
          {momentosCliente.map((momento) => (
            <span className={momentosComAlerta.includes(momento) ? 'cca-moment-chip cca-moment-chip-alert' : 'cca-moment-chip'} key={momento}>
              {momento}
            </span>
          ))}
        </div>
        <div className="cor-table-scroll">
          <table className="cor-table">
            <thead>
              <tr>
                <th>Reserva</th><th>Cliente</th><th>Gestor</th><th>Agencia</th><th>Momento do cliente</th>
              </tr>
            </thead>
            <tbody>
              {processosCca.map(([reserva, produto, nome, gestor, agencia, momento]) => (
                <tr key={reserva}>
                  <td><strong>{reserva}</strong></td>
                  <td><a className="cor-link" href={`/checklist_documentos_upload_com_formulario.html?cliente=${encodeURIComponent(nome)}&reserva=${reserva}`}>({produto}) {nome}</a></td>
                  <td>{gestor}</td>
                  <td><span className="cor-badge cor-badge-info">{agencia}</span></td>
                  <td><span className={badge(momento)}>{momento}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
