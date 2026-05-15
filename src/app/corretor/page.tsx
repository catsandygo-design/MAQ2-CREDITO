'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, Clock3, FileWarning, LogOut, RefreshCw, Search, ShieldCheck, UserPlus } from 'lucide-react';

const agenda = [
  { time: '08:30', title: 'Abrir carteira do dia', meta: 'Revisar prioridades e pendencias novas' },
  { time: '09:00', title: 'Retorno documental - Ana Ribeiro', meta: 'Documento de renda | fazer agora' },
  { time: '11:30', title: 'Conferir pendencia - Marcos Lima', meta: 'Comprovante residencial | urgente' },
  { time: '15:00', title: 'Follow-up assinatura - Carla Souza', meta: 'Sinal e fiador | fechamento do dia' },
];

const taskGroups = [
  { title: 'Fazer agora', tone: 'critical', icon: BellRing, items: ['Enviar renda de Ana Ribeiro', 'Responder retorno de CCA'] },
  { title: 'Urgentes', tone: 'high', icon: AlertTriangle, items: ['Regularizar renda', 'Validar contato'] },
  { title: 'Urgentes nao criticas', tone: 'medium', icon: Clock3, items: ['Confirmar previsao', 'Cobrar complemento'] },
  { title: 'Fechamento do dia', tone: 'info', icon: ShieldCheck, items: ['Fechar docs', 'Atualizar ativos'] },
  { title: 'Semana', tone: 'success', icon: CheckCircle2, items: ['Carteira parada', 'Agenda assinatura'] },
];

const clientes = [
  { cliente: 'Everson Lourenco Pereira da Silva', empreendimento: 'AGLO30 - Vila Girassol', corretor: 'Rebeca Carvalho', etapa: 'Em Processo', caixa: 'Analise Credito', agehab: 'Analise Credito', acao: 'Atuar em Caixa: Analise Credito', risco: 'Alto', prioridade: 'Prioridade alta', comercial: 'Em Processo', repasse: 'Sem Repasse', aging: '107 anos', slaCca: '14 dias', docs: '27 de 36', sinal: 'Nao tem', fiador: 'Nao tem', pendencias: 'Caixa e Agehab em analise de credito' },
  { cliente: 'Ana Ribeiro', empreendimento: 'MAQ Jardim', corretor: 'Juliana Sales', etapa: 'Credito', caixa: 'Pendente Credito', agehab: 'Analise Credito', acao: 'Enviar comprovante de renda atualizado', risco: 'Alto', prioridade: 'Prioridade alta', comercial: 'Credito', repasse: 'Sem Repasse', aging: '18 dias', slaCca: '48h', docs: '31 de 36', sinal: 'Pendente', fiador: 'Nao se aplica', pendencias: 'Renda vencida e retorno de CCA' },
  { cliente: 'Marcos Lima', empreendimento: 'MAQ Parque', corretor: 'Rafael Mendes', etapa: 'Em Processo', caixa: 'Analise CCA', agehab: 'Pendente Agehab', acao: 'Corrigir comprovante residencial', risco: 'Medio', prioridade: 'Urgente nao critica', comercial: 'Em Processo', repasse: 'Sem Repasse', aging: '32 dias', slaCca: '24h', docs: '29 de 36', sinal: 'Validado', fiador: 'Nao tem', pendencias: 'Documento de residencia e Agehab' },
  { cliente: 'Carla Souza', empreendimento: 'MAQ Vista', corretor: 'Rebeca Carvalho', etapa: 'Repasse', caixa: 'Condicionado', agehab: 'Validado', acao: 'Confirmar documento do fiador', risco: 'Medio', prioridade: 'Fechamento do dia', comercial: 'Aprovacao', repasse: 'Inicio Repasse', aging: '41 dias', slaCca: '12h', docs: '34 de 36', sinal: 'Validado', fiador: 'Pendente', pendencias: 'Documento do fiador trava repasse' },
  { cliente: 'Beatriz Nunes', empreendimento: 'MAQ Prime', corretor: 'Lucas Andrade', etapa: 'Assinatura', caixa: 'Conforme', agehab: 'Validado', acao: 'Acompanhar assinatura', risco: 'Baixo', prioridade: 'Acompanhar', comercial: 'Assinatura', repasse: 'Assinatura Caixa', aging: '22 dias', slaCca: 'No prazo', docs: '36 de 36', sinal: 'Validado', fiador: 'Nao tem', pendencias: 'Sem pendencia critica' },
];

type Cliente = (typeof clientes)[number];
const toneFromRisk = (risco: string) => (risco === 'Alto' ? 'danger' : risco === 'Medio' ? 'warn' : 'ok');

function StatusPill({ value, tone = 'neutral' }: { value: string; tone?: string }) {
  return <span className={`status-pill ${tone}`}>{value}</span>;
}

function TaskCard({ group }: { group: (typeof taskGroups)[number] }) {
  const Icon = group.icon;
  return (
    <article className={`task-card ${group.tone}`}>
      <span className="task-icon"><Icon size={15} /></span>
      <div><h3>{group.title}</h3><p>{group.items.join(' | ')}</p></div>
      <span className="task-count">{group.items.length}</span>
    </article>
  );
}

function ClientQueueCard({ cliente }: { cliente: Cliente }) {
  const tone = toneFromRisk(cliente.risco);
  return (
    <article className={`client-row ${tone}`}>
      <div className="client-main"><span className={`risk-dot ${tone}`} /><div className="client-copy"><div className="client-title-row"><h3>{cliente.cliente}</h3><StatusPill value={cliente.prioridade} tone={tone} /></div><p>{cliente.empreendimento} | {cliente.corretor}</p><strong>{cliente.acao}</strong></div></div>
      <div className="client-stats"><div><span>Etapa</span><strong>{cliente.etapa}</strong></div><div><span>Caixa</span><strong>{cliente.caixa}</strong></div><div><span>Agehab</span><strong>{cliente.agehab}</strong></div><div><span>Docs</span><strong>{cliente.docs}</strong></div><div><span>SLA CCA</span><strong>{cliente.slaCca}</strong></div></div>
      <div className="client-footer"><span>Comercial: {cliente.comercial}</span><span>Repasse: {cliente.repasse}</span><span>Sinal: {cliente.sinal}</span><span>Fiador: {cliente.fiador}</span><span>{cliente.pendencias}</span></div>
    </article>
  );
}

export default function CorretorPage() {
  const [query, setQuery] = useState('');
  const [risk, setRisk] = useState('Todos');

  const filteredClientes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clientes.filter((cliente) => {
      const fields = [cliente.cliente, cliente.empreendimento, cliente.corretor, cliente.etapa, cliente.caixa, cliente.agehab, cliente.acao];
      return (!q || fields.some((field) => field.toLowerCase().includes(q))) && (risk === 'Todos' || cliente.risco === risk);
    });
  }, [query, risk]);

  const waitingDocsCount = clientes.filter((cliente) => cliente.docs !== '36 de 36').length;
  const highPriorityCount = clientes.filter((cliente) => cliente.risco === 'Alto').length;

  return (
    <main className="broker-page">
      <style>{`
        .broker-page { height: 100vh; overflow: hidden; background: #f4f7fb; color: #071225; padding: 12px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
        .broker-shell { height: 100%; max-width: 1480px; margin: 0 auto; display: grid; grid-template-rows: auto auto 1fr; gap: 8px; min-height: 0; }
        .topbar, .panel, .metric { background: #fff; border: 1px solid #d8e2ee; border-radius: 8px; box-shadow: 0 8px 20px rgba(15, 23, 42, .05); }
        .topbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 10px 13px; }
        .brand { display: flex; align-items: center; gap: 11px; min-width: 0; } .mark { width: 38px; height: 38px; border-radius: 8px; display: grid; place-items: center; background: #0f766e; color: #fff; font-weight: 900; font-size: 17px; }
        h1, h2, h3, p { margin: 0; } h1 { font-size: 21px; } h2 { font-size: 16px; } h3 { font-size: 13px; }
        .subtle { color: #53627a; font-size: 12px; line-height: 1.3; margin-top: 2px; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; } .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid #cbd5e1; background: #fff; border-radius: 7px; padding: 8px 10px; font-weight: 800; font-size: 13px; color: #071225; text-decoration: none; } .btn.primary { background: #0f766e; border-color: #0f766e; color: #fff; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; } .metric { padding: 10px 12px; display: flex; justify-content: space-between; align-items: flex-start; } .metric span { color: #53627a; font-size: 12px; font-weight: 800; } .metric strong { display: block; margin-top: 2px; font-size: 22px; } .metric svg { color: #0f766e; }
        .workspace { display: grid; grid-template-columns: 305px 1fr; gap: 8px; min-height: 0; } .left-rail { min-height: 0; overflow-y: auto; } .right-workstream { display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 8px; min-height: 0; overflow: hidden; }
        .panel { overflow: hidden; } .panel-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; padding: 9px 13px; border-bottom: 1px solid #e5edf5; } .panel-body { padding: 9px 13px; } .count { background: #eef2f7; color: #334155; border-radius: 999px; padding: 5px 9px; font-size: 12px; font-weight: 900; white-space: nowrap; }
        .agenda-list { display: grid; gap: 8px; } .agenda-item { display: grid; grid-template-columns: 55px 1fr; gap: 9px; padding: 9px; border: 1px solid #dce6f1; border-radius: 7px; background: #f8fafc; } .agenda-time { color: #04736b; font-weight: 900; } .agenda-title { font-weight: 900; font-size: 13px; } .agenda-meta { color: #53627a; font-size: 12px; margin-top: 3px; }
        .task-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 7px; } .task-card { display: grid; grid-template-columns: 27px 1fr 22px; gap: 7px; align-items: start; border: 1px solid #dbe4ef; border-radius: 8px; padding: 8px; background: #fbfdff; } .task-card.critical { border-top: 4px solid #dc2626; } .task-card.high { border-top: 4px solid #f97316; } .task-card.medium { border-top: 4px solid #d97706; } .task-card.info { border-top: 4px solid #0284c7; } .task-card.success { border-top: 4px solid #16a34a; } .task-icon { width: 25px; height: 25px; border-radius: 7px; display: grid; place-items: center; background: #eef2f7; } .task-count { min-width: 22px; height: 22px; display: grid; place-items: center; border-radius: 999px; background: #e2e8f0; font-weight: 900; } .task-card p { color: #334155; font-size: 11px; line-height: 1.2; margin-top: 3px; }
        .client-list-panel { display: grid; grid-template-rows: auto auto minmax(0, 1fr); min-height: 0; background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%); } .client-list-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; } .client-list-actions .count { background: #fff; border: 1px solid #d8e2ee; padding: 6px 10px; font-size: 13px; }
        .filters { display: grid; grid-template-columns: 1fr 170px 170px; gap: 10px; align-items: end; } .field { display: grid; gap: 4px; } .field label { color: #475569; font-size: 12px; font-weight: 900; } .field input, .field select { width: 100%; border: 1px solid #cbd5e1; border-radius: 7px; padding: 8px 10px; background: #fff; color: #071225; font-size: 13px; outline: none; }
        .client-flow-list { min-height: 0; overflow-y: auto; display: grid; align-content: start; gap: 9px; padding: 10px; background: #eef8ff; scrollbar-gutter: stable; } .client-flow-list::-webkit-scrollbar, .left-rail::-webkit-scrollbar { width: 10px; } .client-flow-list::-webkit-scrollbar-thumb, .left-rail::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 999px; }
        .client-row { display: grid; grid-template-columns: minmax(310px, 1.2fr) 1.8fr; gap: 10px; background: #fff; border: 1px solid #dbe4ef; border-left-width: 4px; border-radius: 8px; padding: 10px; box-shadow: 0 10px 24px rgba(15, 23, 42, .05); } .client-row.danger { border-left-color: #dc2626; } .client-row.warn { border-left-color: #d97706; } .client-row.ok { border-left-color: #16a34a; }
        .client-main { display: flex; gap: 10px; min-width: 0; } .client-copy { min-width: 0; } .client-title-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; } .client-title-row h3 { color: #082f49; font-size: 15px; line-height: 1.2; text-transform: uppercase; } .client-copy p { color: #334155; font-size: 12px; margin-top: 4px; } .client-copy strong { display: block; color: #071225; font-size: 13px; margin-top: 7px; }
        .risk-dot { width: 11px; height: 11px; border-radius: 999px; margin-top: 4px; box-shadow: 0 0 0 5px #eef8ff; flex: 0 0 auto; } .risk-dot.danger { background: #dc2626; } .risk-dot.warn { background: #d97706; } .risk-dot.ok { background: #16a34a; }
        .status-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 8px; font-weight: 900; font-size: 11px; white-space: nowrap; border: 1px solid #e2e8f0; background: #eef2f7; color: #334155; } .status-pill.danger { background: #fee2e2; color: #991b1b; border-color: #fecaca; } .status-pill.warn { background: #fef3c7; color: #92400e; border-color: #fde68a; } .status-pill.ok { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
        .client-stats { display: grid; grid-template-columns: repeat(5, minmax(92px, 1fr)); gap: 7px; } .client-stats div { border: 1px solid #e5edf5; border-radius: 7px; padding: 8px; background: #f8fbff; } .client-stats span { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; font-weight: 900; margin-bottom: 5px; } .client-stats strong { color: #075985; font-size: 12px; line-height: 1.2; }
        .client-footer { grid-column: 1 / -1; display: flex; gap: 7px; flex-wrap: wrap; border-top: 1px solid #e5edf5; padding-top: 8px; } .client-footer span { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; color: #334155; font-size: 11px; font-weight: 800; padding: 5px 8px; }
        @media (max-width: 1180px) { .broker-page { height: auto; overflow: auto; } .broker-shell { height: auto; } .workspace { grid-template-columns: 1fr; } .right-workstream { overflow: visible; } .client-list-panel { min-height: 560px; } .task-grid, .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .client-row { grid-template-columns: 1fr; } }
        @media (max-width: 760px) { .broker-page { padding: 10px; } .topbar, .actions { align-items: flex-start; flex-direction: column; } .task-grid, .summary-grid, .filters, .client-stats { grid-template-columns: 1fr; } .client-title-row h3 { font-size: 14px; } }
      `}</style>

      <div className="broker-shell">
        <header className="topbar"><div className="brand"><div className="mark">M2</div><div><h1>Corretor</h1><p className="subtle">Agenda, prioridades e carteira vinculada.</p></div></div><nav className="actions" aria-label="Acoes do corretor"><a className="btn" href="/corretor"><RefreshCw size={16} />Atualizar</a><a className="btn primary" href="/corretor"><UserPlus size={16} />Novo pre-cadastro</a><a className="btn" href="/login"><LogOut size={16} />Sair</a></nav></header>
        <section className="summary-grid" aria-label="Resumo operacional"><article className="metric"><div><span>Fazer agora</span><strong>2</strong></div><BellRing size={21} /></article><article className="metric"><div><span>Aguardando docs</span><strong>{waitingDocsCount}</strong></div><FileWarning size={21} /></article><article className="metric"><div><span>Prioridade alta</span><strong>{highPriorityCount}</strong></div><AlertTriangle size={21} /></article><article className="metric"><div><span>Carteira ativa</span><strong>{clientes.length}</strong></div><ShieldCheck size={21} /></article></section>
        <section className="workspace">
          <aside className="panel left-rail"><div className="panel-head"><div><h2>Agenda</h2><p className="subtle">Compromissos do dia.</p></div><span className="count">{agenda.length}</span></div><div className="panel-body agenda-list">{agenda.map((item) => <article className="agenda-item" key={item.title}><span className="agenda-time">{item.time}</span><div><p className="agenda-title">{item.title}</p><p className="agenda-meta">{item.meta}</p></div></article>)}</div></aside>
          <div className="right-workstream">
            <section className="panel client-list-panel">
              <div className="panel-head"><div><p className="subtle" style={{ color: '#0284c7', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.14em' }}>Fila viva</p><h2 style={{ fontSize: 22, marginTop: 4 }}>Fluxo do cliente</h2><p className="subtle">Lista de clientes do corretor com etapa, travas, SLA e proxima acao.</p></div><div className="client-list-actions"><span className="count">{filteredClientes.length} processo(s)</span><span className="count">{waitingDocsCount} aguardando docs</span><span className="count">{highPriorityCount} prioridade alta</span></div></div>
              <div className="panel-body filters"><div className="field"><label>Buscar cliente</label><div style={{ position: 'relative' }}><Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: '#64748b' }} /><input style={{ paddingLeft: 34 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cliente, empreendimento, etapa, caixa ou acao" /></div></div><div className="field"><label>Risco</label><select value={risk} onChange={(event) => setRisk(event.target.value)}><option>Todos</option><option>Alto</option><option>Medio</option><option>Baixo</option></select></div><div className="field"><label>Ordem</label><select><option>Mais criticos primeiro</option></select></div></div>
              <div className="client-flow-list">{filteredClientes.map((cliente) => <ClientQueueCard cliente={cliente} key={cliente.cliente} />)}</div>
            </section>
            <section className="panel"><div className="panel-head"><div><h2>Mapa de tarefas</h2><p className="subtle">Agora, urgente, fechamento e semana.</p></div><span className="count">5 blocos</span></div><div className="panel-body task-grid">{taskGroups.map((group) => <TaskCard key={group.title} group={group} />)}</div></section>
          </div>
        </section>
      </div>
    </main>
  );
}
