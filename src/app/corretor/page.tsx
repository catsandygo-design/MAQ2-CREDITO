const agenda = [
  { time: '08:30', title: 'Abrir carteira do dia', meta: 'Revisar prioridades e pendencias novas' },
  { time: '09:00', title: 'Retorno documental - Ana Ribeiro', meta: 'Documento de renda | fazer agora' },
  { time: '11:30', title: 'Conferir pendencia - Marcos Lima', meta: 'Comprovante residencial | urgente' },
  { time: '15:00', title: 'Follow-up assinatura - Carla Souza', meta: 'Sinal e fiador | fechamento do dia' },
];

const taskGroups = [
  {
    key: 'now',
    title: 'Preciso fazer agora',
    rule: 'Interrompe a fila. Se atrasar, trava cliente ou assinatura.',
    tone: 'now',
    items: ['Enviar documento pendente de Ana Ribeiro', 'Responder retorno de CCA para Carla Souza'],
  },
  {
    key: 'critical',
    title: 'Urgentes',
    rule: 'Prazo curto ou pendencia que ja esta impactando o fluxo.',
    tone: 'critical',
    items: ['Regularizar comprovante de renda', 'Validar dados de contato do cliente'],
  },
  {
    key: 'softUrgent',
    title: 'Urgentes, mas nao criticas',
    rule: 'Precisa entrar no radar hoje, mas pode vir depois do bloco critico.',
    tone: 'soft-urgent',
    items: ['Confirmar previsao de envio com cliente', 'Relembrar corretor parceiro sobre documento complementar'],
  },
  {
    key: 'dayClose',
    title: 'Nao finalizar o dia sem cumprir',
    rule: 'Fechamento operacional obrigatorio antes de sair.',
    tone: 'day-close',
    items: ['Fechar pendencias documentais do dia', 'Atualizar status dos clientes em atendimento'],
  },
  {
    key: 'week',
    title: 'Tarefas semanais',
    rule: 'Rotina de manutencao para evitar carteira parada.',
    tone: 'week',
    items: ['Revisar carteira sem movimentacao', 'Confirmar agenda de assinaturas', 'Atualizar previsao dos clientes em analise'],
  },
];

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

function TaskBox({ title, rule, items, tone }: { title: string; rule: string; items: string[]; tone: string }) {
  return (
    <article className={`task-box ${tone}`}>
      <div className="task-head">
        <div>
          <h3>{title}</h3>
          <p>{rule}</p>
        </div>
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
  const totalWeeklyTasks = taskGroups.find((group) => group.key === 'week')?.items.length ?? 0;

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
        .grid-top { display: grid; grid-template-columns: .9fr 1.6fr; gap: 16px; align-items: start; }
        .panel { background: white; border: 1px solid #dbe4ef; border-radius: 8px; padding: 16px; box-shadow: 0 10px 22px rgba(15,23,42,.05); }
        .panel-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
        .count { background: #e2e8f0; border-radius: 999px; padding: 5px 9px; font-size: 12px; font-weight: 800; white-space: nowrap; }
        .agenda-list { display: grid; gap: 8px; }
        .agenda-item { display: grid; grid-template-columns: 56px 1fr; gap: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
        .agenda-time { font-weight: 900; color: #0f766e; }
        .agenda-title { font-weight: 800; }
        .task-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
        .task-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc; min-width: 0; }
        .task-box.now { border-color: #dc2626; background: #fff7f7; }
        .task-box.critical { border-color: #f97316; background: #fff7ed; }
        .task-box.soft-urgent { border-color: #f59e0b; background: #fffbeb; }
        .task-box.day-close { border-color: #0284c7; background: #f0f9ff; }
        .task-box.week { border-color: #16a34a; background: #f0fdf4; }
        .task-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
        .task-head h3 { font-size: 14px; line-height: 1.2; }
        .task-head p { color: #64748b; font-size: 12px; margin-top: 5px; line-height: 1.25; }
        .task-head span { min-width: 24px; height: 24px; border-radius: 999px; background: #e2e8f0; display: grid; place-items: center; font-weight: 900; }
        ul { margin: 0; padding-left: 18px; color: #334155; display: grid; gap: 6px; }
        li { line-height: 1.3; }
        .method-strip { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
        .method-chip { border: 1px solid #dbe4ef; border-radius: 8px; padding: 10px; background: white; font-size: 12px; color: #475569; }
        .method-chip strong { display: block; color: #0f172a; margin-bottom: 3px; }
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
        @media (max-width: 1200px) { .task-grid, .method-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); } .grid-top { grid-template-columns: 1fr; } }
        @media (max-width: 900px) { .task-grid, .method-strip, .filters { grid-template-columns: 1fr; } .broker-top { align-items: flex-start; flex-direction: column; } }
      `}</style>

      <div className="broker-shell">
        <header className="broker-top">
          <div className="broker-brand">
            <div className="broker-mark">M2</div>
            <div>
              <h1>Corretor</h1>
              <p className="muted">Agenda organizada por tempo, urgencia, fechamento do dia e rotina semanal.</p>
            </div>
          </div>
          <nav className="top-actions" aria-label="Acoes do corretor">
            <a className="btn" href="/login">Sair</a>
            <a className="btn" href="/corretor">Atualizar</a>
            <a className="btn primary" href="/corretor">Novo pre-cadastro</a>
          </nav>
        </header>

        <section className="method-strip" aria-label="Metodo de organizacao do corretor">
          <div className="method-chip"><strong>Agora</strong>trava cliente ou assinatura</div>
          <div className="method-chip"><strong>Urgente</strong>prazo curto e impacto direto</div>
          <div className="method-chip"><strong>Urgente leve</strong>entra hoje, mas depois do critico</div>
          <div className="method-chip"><strong>Fechamento</strong>nao sair sem cumprir</div>
          <div className="method-chip"><strong>Semanal</strong>manutencao da carteira</div>
        </section>

        <section className="grid-top">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Agenda</h2>
                <p className="muted">Compromissos do dia em ordem de horario.</p>
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
                <h2>Mapa de tarefas</h2>
                <p className="muted">Priorize de cima para baixo: agora, urgente, urgente leve, fechamento e semanal.</p>
              </div>
              <span className="count">{totalWeeklyTasks} semanais</span>
            </div>
            <div className="task-grid">
              {taskGroups.map((group) => (
                <TaskBox key={group.key} title={group.title} rule={group.rule} items={group.items} tone={group.tone} />
              ))}
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
