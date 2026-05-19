const processosCca = [
  ['458712', 'PP', 'Matheus Alves de Melo', 'Bianca Moura', 'Ag. 3884 - Caixa Sul', 'DOC PENDENCIADO CCA'],
  ['458713', 'PN', 'Ana Paula Ribeiro', 'Douglas Silva', 'Ag. 2710 - Caixa Centro', 'EMITIR FORMULÁRIOS'],
  ['458714', 'PA', 'Carlos Henrique Souza', 'Patricia Nunes', 'Ag. 4201 - Caixa Norte', 'AGUARDANDO FORMULÁRIOS'],
  ['458715', 'PP', 'Joao Amorin', 'CCA Central', 'Ag. 1562 - Caixa Oeste', 'FORMULÁRIOS ASSINADOS'],
  ['458716', 'PN', 'Mariana Costa Lima', 'Bianca Moura', 'Ag. 3884 - Caixa Sul', 'DOC PENDENCIADO CCA'],
  ['458717', 'PA', 'Renato Gomes Paiva', 'Douglas Silva', 'Ag. 2710 - Caixa Centro', 'PROCESSO FINALIZADO'],
];

const alertasCca = [
  ['critico', 'ANA PAULA', 'Pendente emissão de formulário Caixa', 'Aguardando'],
  ['medio', 'MATHEUS ALVES', 'Aguardando documentos para iniciar análise CCA', '24h'],
  ['ok', 'CARLOS HENRIQUE', 'Formulário emitido e em conferência', '12h'],
  ['medio', 'JOAO PEDRO', 'Aguardando validação da assinatura', '18h'],
];

function badge(momento: string) {
  if (momento.includes('PENDENCIADO')) return 'cor-badge cor-badge-danger';
  if (momento.includes('EMITIR') || momento.includes('AGUARDANDO')) return 'cor-badge cor-badge-warning';
  if (momento.includes('ASSINADOS') || momento.includes('FINALIZADO')) return 'cor-badge cor-badge-success';
  return 'cor-badge cor-badge-info';
}

import Link from 'next/link';

export default function CcaDashboard() {
  return (
    <main className="cor-main-layout">
      <section className="cor-grid-2">
        <article className="cor-table-card alert-card-height">
          <div className="cor-card-header">
            <h2>Alertas de Monitoramento CCA</h2>
          </div>
          <div className="cor-alert-list">
            {alertasCca.map(([nivel, proponente, detalhe, tempo], i) => (
              <div key={i} className={`cor-alert-item ${nivel}`}>
                <div>
                  <strong>{proponente}</strong>
                  <span>{detalhe}</span>
                </div>
                <div>{tempo}</div>
              </div>
            ))}
          </div>
        </article>

        <article className="cor-table-card info-gradient-card">
          <div className="cor-card-header">
            <h2>Métricas do Fluxo de Correspondente</h2>
          </div>
          <div className="cca-flow-metrics">
            <div><span>Com o CCA</span><b>31</b><small>processos ativos</small></div>
            <div><span>Para conformidade</span><b>18</b><small>encaminhados</small></div>
            <div><span>Assinados</span><b>9</b><small>minutas assinadas</small></div>
          </div>
        </article>
      </section>

      <section className="cor-table-card cca-table-card">
        <h2>Fila CCA de análise e conformidade</h2>
        <div className="cor-table-scroll">
          <table className="cor-table">
            <thead>
              <tr>
                <th>Reserva</th><th>Cliente</th><th>Gestor</th><th>Agência</th><th>Momento do cliente</th>
              </tr>
            </thead>
            <tbody>
              {processosCca.map(([reserva, produto, nome, gestor, agencia, momento]) => (
                <tr key={reserva}>
                  <td><strong>{reserva}</strong></td>
                  <td>
                    <Link className="cor-link" href={`/analista/checklist?cliente=${encodeURIComponent(nome)}&reserva=${reserva}`}>
                      ({produto}) {nome}
                    </Link>
                  </td>
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