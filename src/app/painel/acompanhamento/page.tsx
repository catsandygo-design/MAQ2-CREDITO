import Link from 'next/link';

const clientes = [
  ['458712', 'Matheus Alves de Melo', 'pendencia documentacao', 'documentos pendenciados', 'pendente', 'nao tem', 'reserva ativa', '24h'],
  ['458713', 'Ana Paula Ribeiro', 'formularios disponiveis', 'ficha agehab liberada', 'pago', 'finalizado', 'aguardando envio', '12h'],
  ['458714', 'Carlos Henrique Souza', 'em validacao credito', 'em analise do credito', 'nao tem', 'nao tem', 'analise inicial', '36h'],
];

function badge(status: string) {
  const s = status.toLowerCase();
  if (s.includes('pend')) return 'cor-badge cor-badge-danger';
  if (s.includes('pago') || s.includes('finalizado') || s.includes('liberada')) return 'cor-badge cor-badge-ok';
  if (s.includes('analise') || s.includes('validacao') || s.includes('aguardando')) return 'cor-badge cor-badge-warn';
  return 'cor-badge cor-badge-info';
}

export default function AcompanhamentoCorretorPage() {
  return (
    <main className="cor-page">
      <header className="cor-header">
        <div>
          <span>Painel do Corretor</span>
          <h1>Acompanhamento de Clientes</h1>
          <p>Ao clicar no nome do cliente, abre o checklist de documentos e upload.</p>
        </div>
        <b>Tela inicial apos login</b>
      </header>

      <section className="cor-dash-grid">
        <article className="cor-card">
          <small>Dashboard 1</small>
          <h2>Alertas do analista</h2>
          <p>Cliente, documento pendente e prazo de entrega.</p>
          <strong>3 alertas ativos</strong>
        </article>
        <article className="cor-card">
          <small>Dashboard 2</small>
          <h2>SLA de documentos</h2>
          <div className="cor-speed"><span>82%</span></div>
          <p>Melhor SLA de entrega x SLA medio do corretor.</p>
        </article>
        <article className="cor-card">
          <small>Dashboard 3</small>
          <h2>Reservas x Repasses</h2>
          <p>421 clientes em reserva x 263 clientes repassados.</p>
          <strong>62% repassados</strong>
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
                  <td><Link className="cor-link" href={`/painel/checklist-documentos?id=${reserva}`}>{nome}</Link></td>
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
