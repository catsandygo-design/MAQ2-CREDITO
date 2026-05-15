'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileWarning,
  Filter,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

const agenda = [
  { time: '08:30', title: 'Abrir carteira do dia', meta: 'Revisar prioridades e pendencias novas', status: 'Rotina' },
  { time: '09:00', title: 'Retorno documental - Ana Ribeiro', meta: 'Documento de renda | fazer agora', status: 'Critico' },
  { time: '11:30', title: 'Conferir pendencia - Marcos Lima', meta: 'Comprovante residencial | urgente', status: 'Urgente' },
  { time: '15:00', title: 'Follow-up assinatura - Carla Souza', meta: 'Sinal e fiador | fechamento do dia', status: 'Hoje' },
];

const taskGroups = [
  {
    key: 'now',
    title: 'Fazer agora',
    rule: 'Trava cliente ou assinatura.',
    tone: 'critical',
    icon: BellRing,
    items: ['Enviar renda de Ana Ribeiro', 'Responder retorno de CCA'],
  },
  {
    key: 'urgent',
    title: 'Urgentes',
    rule: 'Prazo curto com impacto direto.',
    tone: 'high',
    icon: AlertTriangle,
    items: ['Regularizar comprovante de renda', 'Validar dados de contato'],
  },
  {
    key: 'softUrgent',
    title: 'Urgentes nao criticas',
    rule: 'Entram hoje, depois do critico.',
    tone: 'medium',
    icon: Clock3,
    items: ['Confirmar previsao de envio', 'Cobrar documento complementar'],
  },
  {
    key: 'dayClose',
    title: 'Fechamento do dia',
    rule: 'Nao sair sem cumprir.',
    tone: 'info',
    icon: ShieldCheck,
    items: ['Fechar pendencias documentais', 'Atualizar clientes ativos'],
  },
  {
    key: 'week',
    title: 'Semana',
    rule: 'Manutencao da carteira.',
    tone: 'success',
    icon: CheckCircle2,
    items: ['Revisar carteira parada', 'Confirmar agenda de assinaturas', 'Atualizar previsoes'],
  },
];

const pendencias = [
  { cliente: 'Ana Ribeiro', documento: 'Comprovante de renda atualizado', prazo: 'Resolver hoje', tone: 'danger' },
  { cliente: 'Marcos Lima', documento: 'Comprovante de residencia', prazo: 'Ate 24h', tone: 'warn' },
  { cliente: 'Carla Souza', documento: 'Documento do fiador', prazo: 'Acompanhar', tone: 'neutral' },
];

const clientes = [
  { cliente: 'Ana Ribeiro', empreendimento: 'MAQ Jardim', etapa: 'Credito', caixa: 'Pendente Credito', agehab: 'Analise Credito', prazo: '48h', acao: 'Enviar renda', risco: 'Alto' },
  { cliente: 'Marcos Lima', empreendimento: 'MAQ Parque', etapa: 'Em Processo', caixa: 'Analise CCA', agehab: 'Pendente Agehab', prazo: '24h', acao: 'Corrigir residencia', risco: 'Medio' },
  { cliente: 'Carla Souza', empreendimento: 'MAQ Vista', etapa: 'Repasse', caixa: 'Condicionado', agehab: 'Validado', prazo: '12h', acao: 'Confirmar fiador', risco: 'Medio' },
  { cliente: 'Beatriz Nunes', empreendimento: 'MAQ Prime', etapa: 'Assinatura', caixa: 'Conforme', agehab: 'Validado', prazo: 'OK', acao: 'Acompanhar assinatura', risco: 'Baixo' },
];

function StatusPill({ value, tone }: { value: string; tone?: string }) {
  return <span className={`status-pill ${tone || 'neutral'}`}>{value}</span>;
}

function TaskCard({ group }: { group: (typeof taskGroups)[number] }) {
  const Icon = group.icon;
  return (
    <article className={`task-card ${group.tone}`}>
      <div className="task-card-head">
        <div className="task-icon"><Icon size={17} /></div>
        <span className="task-count">{group.items.length}</span>
      </div>
      <h3>{group.title}</h3>
      <p>{group.rule}</p>
      <ul>
        {group.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  );
}

export default function CorretorPage() {
  const [query, setQuery] = useState('');
  const [risk, setRisk] = useState('Todos');

  const filteredClientes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clientes.filter((cliente) => {
      const matchesQuery = !q || [cliente.cliente, cliente.empreendimento, cliente.etapa, cliente.acao].some((field) => field.toLowerCase().includes(q));
      const matchesRisk = risk === 'Todos' || cliente.risco === risk;
      return matchesQuery && matchesRisk;
    });
  }, [query, risk]);

  return (
    <main className="broker-page">
      <style>{`
        .broker-page { min-height: 100vh; background: #f4f7fb; color: #111827; padding: 22px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
        .broker-shell { max-width: 1480px; margin: 0 auto; display: grid; gap: 14px; }
        .topbar { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 14px 16px; background: #fff; border: 1px solid #d9e2ec; border-radius: 8px; box-shadow: 0 12px 28px rgba(15, 23, 42, .06); }
        .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .mark { width: 42px; height: 42px; border-radius: 8px; display: grid; place-items: center; background: #0f766e; color: #fff; font-weight: 900; letter-spacing: .2px; }
        h1, h2, h3, p { margin: 0; } h1 { font-size: 22px; line-height: 1.15; } h2 { font-size: 15px; } h3 { font-size: 13px; }
        .subtle { color: #64748b; font-size: 12px; line-height: 1.35; margin-top: 3px; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn { display: inline-flex; align-items: center; gap: 7px; border: 1px solid #cbd5e1; background: #fff; border-radius: 7px; padding: 9px 11px; font-weight: 750; font-size: 13px; color: #0f172a; text-decoration: none; }
        .btn.primary { background: #0f766e; border-color: #0f766e; color: white; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        .metric { background: #fff; border: 1px solid #d9e2ec; border-radius: 8px; padding: 13px; display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
        .metric span { color: #64748b; font-size: 12px; font-weight: 700; } .metric strong { display: block; margin-top: 6px; font-size: 24px; letter-spacing: 0; } .metric svg { color: #0f766e; }
        .layout { display: grid; grid-template-columns: 330px 1fr; gap: 14px; align-items: start; }
        .panel { background: #fff; border: 1px solid #d9e2ec; border-radius: 8px; box-shadow: 0 12px 28px rgba(15, 23, 42, .05); overflow: hidden; }
        .panel-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; padding: 14px 15px; border-bottom: 1px solid #e5edf5; }
        .panel-body { padding: 14px 15px; }
        .count { background: #eef2f7; color: #334155; border-radius: 999px; padding: 4px 8px; font-size: 12px; font-weight: 800; white-space: nowrap; }
        .agenda-list { display: grid; gap: 9px; }
        .agenda-item { display: grid; grid-template-columns: 52px 1fr; gap: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 7px; background: #f8fafc; }
        .agenda-time { color: #0f766e; font-weight: 900; font-size: 13px; } .agenda-title { font-weight: 800; font-size: 13px; line-height: 1.25; } .agenda-meta { color: #64748b; font-size: 12px; margin-top: 3px; }
        .task-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
        .task-card { border: 1px solid #dbe4ef; border-radius: 8px; padding: 12px; min-width: 0; background: #fbfdff; }
        .task-card.critical { border-top: 4px solid #dc2626; } .task-card.high { border-top: 4px solid #f97316; } .task-card.medium { border-top: 4px solid #d97706; } .task-card.info { border-top: 4px solid #0284c7; } .task-card.success { border-top: 4px solid #16a34a; }
        .task-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; } .task-icon { width: 30px; height: 30px; border-radius: 7px; display: grid; place-items: center; background: #eef2f7; color: #0f172a; }
        .task-count { min-width: 24px; height: 24px; display: grid; place-items: center; border-radius: 999px; background: #e2e8f0; font-weight: 900; font-size: 12px; }
        .task-card p { color: #64748b; font-size: 12px; line-height: 1.3; margin-top: 5px; min-height: 31px; }
        ul { margin: 10px 0 0; padding: 0; list-style: none; display: grid; gap: 7px; } li { color: #334155; font-size: 12px; line-height: 1.3; padding-left: 12px; position: relative; } li:before { content: ''; width: 4px; height: 4px; border-radius: 999px; background: #64748b; position: absolute; left: 0; top: .55em; }
        .filters { display: grid; grid-template-columns: 1fr 180px 180px; gap: 10px; align-items: end; }
        .field { display: grid; gap: 6px; } .field label { color: #475569; font-size: 12px; font-weight: 800; } .field input, .field select { border: 1px solid #cbd5e1; border-radius: 7px; padding: 10px 11px; background: #fff; color: #0f172a; font-size: 13px; outline: none; } .field input:focus, .field select:focus { border-color: #0f766e; box-shadow: 0 0 0 3px rgba(15,118,110,.12); }
        table { width: 100%; border-collapse: collapse; } th { text-align: left; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; padding: 10px 12px; border-bottom: 1px solid #e5edf5; background: #f8fafc; } td { padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; vertical-align: middle; } tr:last-child td { border-bottom: 0; }
        .client-name { font-weight: 900; color: #0f172a; } .client-sub { display: block; color: #64748b; font-size: 12px; margin-top: 2px; }
        .status-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 8px; font-weight: 850; font-size: 11px; white-space: nowrap; background: #eef2f7; color: #334155; } .status-pill.danger { background: #fee2e2; color: #991b1b; } .status-pill.warn { background: #fef3c7; color: #92400e; } .status-pill.ok { background: #dcfce7; color: #166534; } .status-pill.neutral { background: #eef2f7; color: #334155; }
        .deadline { font-weight: 900; } .deadline.danger { color: #dc2626; } .deadline.warn { color: #b45309; }
        .section-stack { display: grid; gap: 14px; }
        @media (max-width: 1180px) { .layout { grid-template-columns: 1fr; } .task-grid, .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 760px) { .broker-page { padding: 12px; } .topbar, .actions { align-items: flex-start; flex-direction: column; } .task-grid, .summary-grid, .filters { grid-template-columns: 1fr; } th:nth-child(4), td:nth-child(4) { display: none; } }
      `}</style>

      <div className="broker-shell">
        <header className="topbar">
          <div className="brand">
            <div className="mark">M2</div>
            <div>
              <h1>Corretor</h1>
              <p className="subtle">Agenda, prioridade operacional, pendencias documentais e carteira vinculada.</p>
            </div>
          </div>
          <nav className="actions" aria-label="Acoes do corretor">
            <a className="btn" href="/corretor"><RefreshCw size={16} />Atualizar</a>
            <a className="btn primary" href="/corretor"><UserPlus size={16} />Novo pre-cadastro</a>
            <a className="btn" href="/login"><LogOut size={16} />Sair</a>
          </nav>
        </header>

        <section className="summary-grid" aria-label="Resumo operacional">
          <article className="metric"><div><span>Fazer agora</span><strong>2</strong></div><BellRing size={22} /></article>
          <article className="metric"><div><span>Pendencias docs</span><strong>{pendencias.length}</strong></div><FileWarning size={22} /></article>
          <article className="metric"><div><span>Carteira ativa</span><strong>{clientes.length}</strong></div><ShieldCheck size={22} /></article>
          <article className="metric"><div><span>Compromissos</span><strong>{agenda.length}</strong></div><CalendarClock size={22} /></article>
        </section>

        <section className="layout">
          <aside className="panel">
            <div className="panel-head">
              <div><h2>Agenda</h2><p className="subtle">Compromissos do dia em ordem de horario.</p></div>
              <span className="count">{agenda.length}</span>
            </div>
            <div className="panel-body agenda-list">
              {agenda.map((item) => (
                <article className="agenda-item" key={item.title}>
                  <span className="agenda-time">{item.time}</span>
                  <div>
                    <p className="agenda-title">{item.title}</p>
                    <p className="agenda-meta">{item.meta}</p>
                  </div>
                </article>
              ))}
            </div>
          </aside>

          <div className="section-stack">
            <section className="panel">
              <div className="panel-head">
                <div><h2>Mapa de tarefas</h2><p className="subtle">Priorize: agora, urgente, urgente leve, fechamento do dia e semanal.</p></div>
                <span className="count">5 blocos</span>
              </div>
              <div className="panel-body task-grid">
                {taskGroups.map((group) => <TaskCard key={group.key} group={group} />)}
              </div>
            </section>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h2>Pendencias documentais</h2><p className="subtle">Cliente, documento pendente e prazo de resolucao.</p></div>
            <span className="count">{pendencias.length}</span>
          </div>
          <table>
            <thead><tr><th>Cliente</th><th>Documento pendente</th><th>Prazo</th></tr></thead>
            <tbody>
              {pendencias.map((item) => (
                <tr key={item.cliente}><td><span className="client-name">{item.cliente}</span></td><td>{item.documento}</td><td><span className={`deadline ${item.tone}`}>{item.prazo}</span></td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h2>Filtros</h2><p className="subtle">A lista segue a mesma prioridade operacional da tela do analista.</p></div>
            <Filter size={18} />
          </div>
          <div className="panel-body filters">
            <div className="field"><label>Buscar</label><div style={{ position: 'relative' }}><Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#64748b' }} /><input style={{ paddingLeft: 34 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cliente, empreendimento, etapa ou acao" /></div></div>
            <div className="field"><label>Risco</label><select value={risk} onChange={(event) => setRisk(event.target.value)}><option>Todos</option><option>Alto</option><option>Medio</option><option>Baixo</option></select></div>
            <div className="field"><label>Ordem</label><select><option>Mais criticos primeiro</option></select></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h2>Clientes</h2><p className="subtle">Carteira vinculada ao corretor, ordenada por pendencia, SLA e criticidade.</p></div>
            <span className="count">{filteredClientes.length} clientes</span>
          </div>
          <table>
            <thead><tr><th>Cliente</th><th>Etapa</th><th>Caixa</th><th>Agehab</th><th>Prazo</th><th>Proxima acao</th></tr></thead>
            <tbody>
              {filteredClientes.map((cliente) => (
                <tr key={cliente.cliente}>
                  <td><span className="client-name">{cliente.cliente}</span><span className="client-sub">{cliente.empreendimento}</span></td>
                  <td>{cliente.etapa}</td>
                  <td><StatusPill value={cliente.caixa} tone={cliente.risco === 'Alto' ? 'danger' : cliente.risco === 'Medio' ? 'warn' : 'ok'} /></td>
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
