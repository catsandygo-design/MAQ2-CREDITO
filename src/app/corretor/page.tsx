const agenda = [
  { time: '09:00', title: 'Retorno documental - Ana Ribeiro', meta: 'Documento de renda | hoje' },
  { time: '11:30', title: 'Conferir pendencia - Marcos Lima', meta: 'Comprovante residencial | hoje' },
  { time: '15:00', title: 'Follow-up assinatura - Carla Souza', meta: 'Sinal e fiador | hoje' },
];

const tasks = {
  now: ['Enviar documento pendente de Ana Ribeiro', 'Responder retorno de CCA para Carla Souza'],
  urgent: ['Regularizar comprovante de renda', 'Validar dados de contato do cliente'],
  today: ['Fechar pendencias documentais do dia', 'Atualizar status dos clientes em atendimento'],
  week: ['Revisar carteira sem movimentacao', 'Confirmar agenda de assinaturas', 'Atualizar previsao dos clientes em analise'],
};

const pendencias = [
  { cliente: 'Ana Ribeiro', documento: 'Comprovante de renda atualizado', prazo: 'Resolver hoje', tone: 'danger' },
  { cliente: 'Marcos Lima', documento: 'Comprovante de residencia', prazo: 'Ate 24h', tone: 'warn' },
  { cliente: 'Carla Souza', documento: 'Documento do fiador', prazo: 'Acompanhar', tone: 'neutral' },
];

const clientes = [
  { cliente: 'Ana Ribeiro', etapa: 'Credito', caixa: 'Pendente Credito', agehab: 'Analise Credito', prazo: '48h', acao: 'Enviar renda' },
  { cliente: 'Marcos Lima', etapa: 'Em Processo', caixa: 'Analise CCA', agehab: 'Pendente Agehab', prazo: '24h', acao: 'Corrigir residencia' },
  { cliente: 'Carla Souza', etapa: 'Repasse', caixa: 'Condicionado', agehab: 'Validado', prazo: '12h', acao: 'Confirmar fiador' },
  { cliente: 'Beatriz Nunes', etapa: 'Assinatura', caixa: 'Conforme', agehab: 'Validado', prazo: 'OK', acao: 'Acompanhar assinatura' },
];

function TaskBox({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <article className={`task-box ${tone}`}>
      <div className="task-head">
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export default function CorretorPage() {
  return (
    <main className="broker-page">
      <style>{`
        .broker-page {
          min-height: 100vh;
          background: #eef3f8;
          color: #0f172a;
          padding: 24px;
          font-family: Arial, Helvetica, sans-serif;
        }
        .broker-shell { max-width: 1440px; margin: 0 auto; display: grid; gap: 16px; }
        .broker-top { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
        .broker-brand { display: flex; align-items: center; gap: 12px; }
        .broker-mark { width: 42px; height: 42px; border-radius: 10px; display: grid; place-items: center; background: #0f766e; color: white; font-weight: 900; }
        h1, h2, h3, p { margin: 0; }
        h1 { font-size: 24px; }
        .muted { color: #64748b; font-size: 13px; margin-top: 4px; }
        .top-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn { border: 1px solid #cbd5e1; background: white; border-radius: 8px; padding: 10px 12px; font-weight: 700; color: #0f172a; text-decoration: none; }
        .btn.primary { background: #16a34a; border-color: #16a34a; color: white; }
        .grid-top { display: grid; grid-template-columns: 1fr 1.45fr; gap: 16px; }
        .panel { background: white; border: 1px solid #dbe4ef; border-radius: 8px; padding: 16px; box-shadow: 0 10px 22px rgba(15,23,42,.05); }
        .panel-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
        .count { background: #e2e8f0; border-radius: 999px; padding: 5px 9px; font-size: 12px; font-weight: 800; }
        .agenda-list { display: grid; gap: 8px; }
        .agenda-item { display: grid; grid-template-columns: 56px 1fr; gap: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
        .agenda-time { font-weight: 900; color: #0f766e; }
        .agenda-title { font-weight: 800; }
        .task-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .task-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc; }
        .task-box.now { border-color: #ef4444; }
        .task-box.urgent { border-color: #f59e0b; }
        .task-box.today { border-color: #0284c7; }
        .task-box.week { border-color: #16a34a; }
        .task-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .task-head span { min-width: 24px; height: 24px; border-radius: 999px; background: #e2e8f0; display: grid; place-items: center; font-weight: 900; }
        ul { margin: 0; padding-left: 18px; color: #334155; display: grid; gap: 6px; }
        .docs-table, .client-table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding: 10px; }
        td { border-bottom: 1px solid #edf2f7; padding: 11px 10px; font-size: 14px; }
        .deadline { font-weight: 900; }
        .deadline.danger { color: #dc2626; }
        .deadline.warn { color: #d97706; }
        .filters { display: grid; grid-template-columns: 1.4fr repeat(4, 1fr); gap: 10px; }
        .filter { display: grid; gap: 6px; }
        .filter label { font-size: 12px; color: #64748b; font-weight: 700; }
        .filter input, .filter select { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: white; }
        .pill { display: inline-flex; border-radius: 999px; padding: 5px 8px; background: #e2e8f0; font-weight: 800; font-size: 12px; }
        .pill.bad { background: #fee2e2; color: #991b1b; }
        .pill.warn { background: #fef3c7; color: #92400e; }
        .pill.ok { background: #dcfce7; color: #166534; }
        @media (max-width: 900px) { .grid-top, .task-grid, .filters { grid-template-columns: 1fr; } .broker-top { align-items: flex-start; flex-direction: column; } }
      `}</style>

      <div className="broker-shell">
        <header className="broker-top">
          <div className="broker-brand">
            <div className="broker-mark">M2</div>
            <div>
              <h1>Corretor</h1>
              <p className="muted">Agenda, prioridades, pendencias documentais e carteira vinculada.</p>
            </div>
          </div>
          <nav className="top-actions" aria-label="Acoes do corretor">
            <a className="btn" href="/login">Sair</a>
            <a className="btn" href="/corretor">Atualizar</a>
            <a className="btn primary" href="/corretor">Novo pre-cadastro</a>
          </nav>
        </header>

        <section className="grid-top">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Agenda</h2>
                <p className="muted">Compromissos do dia.</p>
              </div>
              <span className="count">{agenda.length}</span>
            </div>
            <div className="agenda-list">
              {agenda.map((item) => (
                <article className="agenda-item" key={item.title}>
                  <span className="agenda-time">{item.time}</span>
                  <div>
                    <p className="agenda-title">{item.title}</p>
                    <p className="muted">{item.meta}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Prioridades</h2>
                <p className="muted">O que fazer agora, hoje e nesta semana.</p>
              </div>
              <span className="count">{tasks.week.length} semanais</span>
            </div>
            <div className="task-grid">
              <TaskBox title="Fazer agora" items={tasks.now} tone="now" />
              <TaskBox title="Urgentes" items={tasks.urgent} tone="urgent" />
              <TaskBox title="Nao finalizar o dia sem cumprir" items={tasks.today} tone="today" />
              <TaskBox title="Tarefas semanais" items={tasks.week} tone="week" />
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Pendencias documentais</h2>
              <p className="muted">Cliente, documento pendente e prazo de resolucao.</p>
            </div>
            <span className="count">{pendencias.length}</span>
          </div>
          <table className="docs-table">
            <thead><tr><th>Cliente</th><th>Documento pendente</th><th>Prazo</th></tr></thead>
            <tbody>
              {pendencias.map((item) => (
                <tr key={item.cliente}><td>{item.cliente}</td><td>{item.documento}</td><td><span className={`deadline ${item.tone}`}>{item.prazo}</span></td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Filtros</h2>
              <p className="muted">A lista abaixo segue a mesma prioridade operacional da tela do analista.</p>
            </div>
          </div>
          <div className="filters">
            <div className="filter"><label>Buscar</label><input placeholder="Cliente, empreendimento ou status" /></div>
            <div className="filter"><label>Empreendimento</label><select><option>Todos</option></select></div>
            <div className="filter"><label>Status Caixa</label><select><option>Todos</option></select></div>
            <div className="filter"><label>Agehab</label><select><option>Todos</option></select></div>
            <div className="filter"><label>Prazo</label><select><option>Mais criticos primeiro</option></select></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Clientes</h2>
              <p className="muted">Carteira vinculada ao corretor, ordenada por pendencia, SLA e criticidade.</p>
            </div>
            <span className="count">{clientes.length} clientes</span>
          </div>
          <table className="client-table">
            <thead><tr><th>Cliente</th><th>Etapa</th><th>Caixa</th><th>Agehab</th><th>Prazo</th><th>Proxima acao</th></tr></thead>
            <tbody>
              {clientes.map((cliente, index) => (
                <tr key={cliente.cliente}>
                  <td><strong>{cliente.cliente}</strong></td>
                  <td>{cliente.etapa}</td>
                  <td><span className={`pill ${index === 0 ? 'bad' : index === 1 ? 'warn' : 'ok'}`}>{cliente.caixa}</span></td>
                  <td>{cliente.agehab}</td>
                  <td>{cliente.prazo}</td>
                  <td>{cliente.acao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
