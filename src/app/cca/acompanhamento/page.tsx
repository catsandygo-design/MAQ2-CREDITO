import Link from 'next/link';

const processosCca = [
  ['458712', 'Matheus Alves de Melo', 'Bianca Moura', 'Ag. 3884 - Caixa Sul', 'aguardando documentos'],
  ['458713', 'Ana Paula Ribeiro', 'Douglas Silva', 'Ag. 2710 - Caixa Centro', 'emitir formularios'],
  ['458714', 'Carlos Henrique Souza', 'Patricia Nunes', 'Ag. 4201 - Caixa Norte', 'formularios emitidos'],
  ['458715', 'Joao Pedro Martins', 'CCA Central', 'Ag. 1562 - Caixa Oeste', 'formularios assinados'],
  ['458716', 'Mariana Costa Lima', 'Bianca Moura', 'Ag. 3884 - Caixa Sul', 'pendencia documental'],
  ['458717', 'Renato Gomes Paiva', 'Douglas Silva', 'Ag. 2710 - Caixa Centro', 'agendado para 22/05 - 14h'],
];

const alertasCca = [
  ['critico', 'MATHEUS ALVES', 'Pendencia critica: extrato FGTS e comprovante de renda', 'Hoje 17:00'],
  ['medio', 'CARLOS HENRIQUE', 'Revisar renda informal e declaracao complementar', '24h'],
  ['ok', 'ANA PAULA', 'Kit pronto para emissao de formularios Caixa', '12h'],
  ['medio', 'JOAO PEDRO', 'Aguardando retorno de biometria para assinatura', '48h'],
];

const taxaRetrabalho = 2.6;

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

function badge(status: string) {
  const s = status.toLowerCase();
  if (momentosComAlerta.includes(s)) return 'cor-badge cor-badge-danger cca-alert-badge';
  if (s.includes('pend') || s.includes('critica') || s.includes('revisao')) return 'cor-badge cor-badge-danger';
  if (s.includes('ok') || s.includes('pronto') || s.includes('finalizado') || s.includes('enviada')) return 'cor-badge cor-badge-ok';
  if (s.includes('aguardando') || s.includes('agendado') || s.includes('agendamento') || s.includes('validacao') || s.includes('solicitada')) return 'cor-badge cor-badge-warn';
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
              {processosCca.map(([reserva, nome, gestor, agencia, momento]) => (
                <tr key={reserva}>
                  <td><strong>{reserva}</strong></td>
                  <td><Link className="cor-link" href={`/painel/checklist-documentos?id=${reserva}`}>{nome}</Link></td>
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
