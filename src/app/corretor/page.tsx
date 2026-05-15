'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, Clock3, FileWarning, Filter, LogOut, RefreshCw, Search, ShieldCheck, UserPlus } from 'lucide-react';

const agenda = [
  { time: '08:30', title: 'Abrir carteira do dia', meta: 'Revisar prioridades e pendencias novas' },
  { time: '09:00', title: 'Retorno documental - Ana Ribeiro', meta: 'Documento de renda | fazer agora' },
  { time: '11:30', title: 'Conferir pendencia - Marcos Lima', meta: 'Comprovante residencial | urgente' },
  { time: '15:00', title: 'Follow-up assinatura - Carla Souza', meta: 'Sinal e fiador | fechamento do dia' },
];

const taskGroups = [
  { title: 'Fazer agora', rule: 'Trava cliente ou assinatura.', tone: 'critical', icon: BellRing, items: ['Enviar renda de Ana Ribeiro', 'Responder retorno de CCA'] },
  { title: 'Urgentes', rule: 'Prazo curto com impacto direto.', tone: 'high', icon: AlertTriangle, items: ['Regularizar comprovante de renda', 'Validar dados de contato'] },
  { title: 'Urgentes nao criticas', rule: 'Entram hoje, depois do critico.', tone: 'medium', icon: Clock3, items: ['Confirmar previsao de envio', 'Cobrar documento complementar'] },
  { title: 'Fechamento do dia', rule: 'Nao sair sem cumprir.', tone: 'info', icon: ShieldCheck, items: ['Fechar pendencias documentais', 'Atualizar clientes ativos'] },
  { title: 'Semana', rule: 'Manutencao da carteira.', tone: 'success', icon: CheckCircle2, items: ['Revisar carteira parada', 'Confirmar agenda de assinaturas', 'Atualizar previsoes'] },
];

const clientes = [
  {
    cliente: 'Everson Lourenco Pereira da Silva', empreendimento: 'AGLO30 - Vila Girassol', corretor: 'Rebeca Carvalho', etapa: 'Em Processo', caixa: 'Analise Credito', agehab: 'Analise Credito', acao: 'Atuar em Caixa: Analise Credito', risco: 'Alto', prioridade: 'Prioridade alta', comercial: 'Em Processo', repasse: 'Sem Repasse', aging: '107 anos', slaCca: '14 dias', docs: '27 de 36', sinal: 'Nao tem', fiador: 'Nao tem', obs: 'Sem observacao registrada', pendencias: ['Caixa: Analise Credito', 'Agehab: Analise Credito'], comercialStep: 1, repasseStep: -1,
  },
  {
    cliente: 'Ana Ribeiro', empreendimento: 'MAQ Jardim', corretor: 'Juliana Sales', etapa: 'Credito', caixa: 'Pendente Credito', agehab: 'Analise Credito', acao: 'Enviar comprovante de renda atualizado', risco: 'Alto', prioridade: 'Prioridade alta', comercial: 'Credito', repasse: 'Sem Repasse', aging: '18 dias', slaCca: '48h', docs: '31 de 36', sinal: 'Pendente', fiador: 'Nao se aplica', obs: 'Cliente precisa reenviar renda antes do retorno do CCA.', pendencias: ['Renda: documento vencido', 'Caixa: Pendente Credito'], comercialStep: 2, repasseStep: -1,
  },
  {
    cliente: 'Marcos Lima', empreendimento: 'MAQ Parque', corretor: 'Rafael Mendes', etapa: 'Em Processo', caixa: 'Analise CCA', agehab: 'Pendente Agehab', acao: 'Corrigir comprovante residencial', risco: 'Medio', prioridade: 'Urgente nao critica', comercial: 'Em Processo', repasse: 'Sem Repasse', aging: '32 dias', slaCca: '24h', docs: '29 de 36', sinal: 'Validado', fiador: 'Nao tem', obs: 'Conferir endereco antes de devolver para analise.', pendencias: ['Agehab: Pendente Agehab', 'Documento: residencia'], comercialStep: 1, repasseStep: -1,
  },
  {
    cliente: 'Carla Souza', empreendimento: 'MAQ Vista', corretor: 'Rebeca Carvalho', etapa: 'Repasse', caixa: 'Condicionado', agehab: 'Validado', acao: 'Confirmar documento do fiador', risco: 'Medio', prioridade: 'Fechamento do dia', comercial: 'Aprovacao', repasse: 'Inicio Repasse', aging: '41 dias', slaCca: '12h', docs: '34 de 36', sinal: 'Validado', fiador: 'Pendente', obs: 'Trava de repasse depende da validacao do fiador.', pendencias: ['Fiador: documento pendente', 'Caixa: Condicionado'], comercialStep: 4, repasseStep: 1,
  },
  {
    cliente: 'Beatriz Nunes', empreendimento: 'MAQ Prime', corretor: 'Lucas Andrade', etapa: 'Assinatura', caixa: 'Conforme', agehab: 'Validado', acao: 'Acompanhar assinatura', risco: 'Baixo', prioridade: 'Acompanhar', comercial: 'Assinatura', repasse: 'Assinatura Caixa', aging: '22 dias', slaCca: 'No prazo', docs: '36 de 36', sinal: 'Validado', fiador: 'Nao tem', obs: 'Cliente pronto para assinatura programada.', pendencias: ['Sem pendencia critica'], comercialStep: 3, repasseStep: 2,
  },
];

const pendencias = [
  { cliente: 'Ana Ribeiro', documento: 'Comprovante de renda atualizado', prazo: 'Resolver hoje', tone: 'danger' },
  { cliente: 'Marcos Lima', documento: 'Comprovante de residencia', prazo: 'Ate 24h', tone: 'warn' },
  { cliente: 'Carla Souza', documento: 'Documento do fiador', prazo: 'Acompanhar', tone: 'neutral' },
];

const commercialSteps = ['Reserva', 'Em Processo', 'Credito', 'Secretaria', 'Assinatura', 'Aprovacao', 'Sienge', 'Finalizada'];
const repasseSteps = ['Em Repasse', 'Inicio Repasse', 'Assinatura Caixa', 'Inicio Garantia'];

type Cliente = (typeof clientes)[number];

function toneFromRisk(risco: string) {
  return risco === 'Alto' ? 'danger' : risco === 'Medio' ? 'warn' : 'ok';
}

function StatusPill({ value, tone = 'neutral' }: { value: string; tone?: string }) {
  return <span className={`status-pill ${tone}`}>{value}</span>;
}

function TaskCard({ group }: { group: (typeof taskGroups)[number] }) {
  const Icon = group.icon;
  return (
    <article className={`task-card ${group.tone}`}>
      <div className="task-card-head"><span className="task-icon"><Icon size={17} /></span><span className="task-count">{group.items.length}</span></div>
      <h3>{group.title}</h3>
      <p>{group.rule}</p>
      <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
    </article>
  );
}

function FlowLine({ steps, activeStep }: { steps: string[]; activeStep: number }) {
  return (
    <div className="flow-line" style={{ ['--step-count' as string]: steps.length }}>
      {steps.map((step, index) => (
        <div className="flow-step" key={step}>
          <span className={index === activeStep ? 'flow-label active' : 'flow-label'}>{step}</span>
          <span className={`flow-dot ${index < activeStep ? 'done' : ''} ${index === activeStep ? 'active' : ''}`} />
        </div>
      ))}
    </div>
  );
}

function ClientFlowCard({ cliente }: { cliente: Cliente }) {
  const tone = toneFromRisk(cliente.risco);
  return (
    <article className={`client-flow-card ${tone}`}>
      <div className="client-flow-top">
        <div className="client-identity">
          <span className={`risk-dot ${tone}`} />
          <div>
            <div className="client-title-row"><h3>{cliente.cliente}</h3><StatusPill value={cliente.prioridade} tone={tone} /></div>
            <p>{cliente.empreendimento}</p>
            <span>{cliente.corretor}</span>
          </div>
        </div>
        <div className="client-actions">
          <StatusPill value={`Comercial ${cliente.aging}`} tone="blue" />
          <StatusPill value={`Credito ${cliente.slaCca}`} tone={tone} />
          <button type="button">Abrir detalhes</button>
        </div>
      </div>

      <div className="client-main-grid">
        <section className="client-process-card">
          <h4>{cliente.etapa}</h4>
          <p>Repasse em {cliente.repasse}. Documentos pendentes: {cliente.docs}</p>
          <div className="chip-row"><StatusPill value={`Aging ${cliente.aging}`} /><StatusPill value={`SLA CCA ${cliente.slaCca}`} tone={tone} /></div>
        </section>
        <section className="client-action-card"><h4>{cliente.acao}</h4><p>Caixa: {cliente.caixa}</p><p>{cliente.obs}</p></section>
      </div>

      <section className="flow-panel commercial"><div className="flow-heading"><span>Comercial</span><strong>{cliente.comercial}</strong></div><FlowLine steps={commercialSteps} activeStep={cliente.comercialStep} /></section>
      <section className="flow-panel repasse"><div className="flow-heading"><span>Repasse</span><strong>{cliente.repasse}</strong></div><FlowLine steps={repasseSteps} activeStep={cliente.repasseStep} /></section>

      <div className="client-bottom-grid">
        <div className="info-tile"><span>Caixa</span><strong>{cliente.caixa}</strong></div>
        <div className="info-tile"><span>Agehab</span><strong>{cliente.agehab}</strong></div>
        <div className="info-tile"><span>Sinal</span><strong>{cliente.sinal}</strong></div>
        <div className="info-tile"><span>Fiador</span><strong>{cliente.fiador}</strong></div>
        <div className="info-tile"><span>SLA CCA</span><strong>{cliente.slaCca}</strong></div>
        <div className="mapped-issues"><h4>Pendencias mapeadas</h4>{cliente.pendencias.map((item) => <p key={item}>{item}</p>)}</div>
      </div>
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
        .broker-page { min-height: 100vh; background: #f4f7fb; color: #071225; padding: 20px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
        .broker-shell { max-width: 1480px; margin: 0 auto; display: grid; gap: 14px; }
        .topbar, .panel, .metric { background: #fff; border: 1px solid #d8e2ee; border-radius: 8px; box-shadow: 0 12px 28px rgba(15, 23, 42, .05); }
        .topbar { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 14px 16px; }
        .brand { display: flex; align-items: center; gap: 12px; min-width: 0; } .mark { width: 42px; height: 42px; border-radius: 8px; display: grid; place-items: center; background: #0f766e; color: #fff; font-weight: 900; }
        h1, h2, h3, h4, p { margin: 0; } h1 { font-size: 22px; } h2 { font-size: 16px; } h3 { font-size: 13px; } h4 { font-size: 14px; }
        .subtle { color: #53627a; font-size: 13px; line-height: 1.35; margin-top: 4px; }
        .actions, .client-actions, .chip-row, .client-list-actions { display: flex; gap: 9px; flex-wrap: wrap; }
        .btn, .client-actions button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid #cbd5e1; background: #fff; border-radius: 7px; padding: 9px 12px; font-weight: 800; font-size: 13px; color: #071225; text-decoration: none; cursor: pointer; }
        .btn.primary { background: #0f766e; border-color: #0f766e; color: #fff; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; } .metric { padding: 14px; display: flex; justify-content: space-between; align-items: flex-start; } .metric span { color: #53627a; font-size: 12px; font-weight: 800; } .metric strong { display: block; margin-top: 8px; font-size: 26px; } .metric svg { color: #0f766e; }
        .layout { display: grid; grid-template-columns: 330px 1fr; gap: 14px; align-items: start; } .panel { overflow: hidden; } .panel-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; padding: 14px 16px; border-bottom: 1px solid #e5edf5; } .panel-body { padding: 14px 16px; }
        .count { background: #eef2f7; color: #334155; border-radius: 999px; padding: 5px 9px; font-size: 12px; font-weight: 900; white-space: nowrap; }
        .agenda-list { display: grid; gap: 9px; } .agenda-item { display: grid; grid-template-columns: 58px 1fr; gap: 10px; padding: 11px; border: 1px solid #dce6f1; border-radius: 7px; background: #f8fafc; } .agenda-time { color: #04736b; font-weight: 900; } .agenda-title { font-weight: 900; font-size: 13px; } .agenda-meta { color: #53627a; font-size: 12px; margin-top: 4px; }
        .task-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; } .task-card { border: 1px solid #dbe4ef; border-radius: 8px; padding: 12px; background: #fbfdff; } .task-card.critical { border-top: 4px solid #dc2626; } .task-card.high { border-top: 4px solid #f97316; } .task-card.medium { border-top: 4px solid #d97706; } .task-card.info { border-top: 4px solid #0284c7; } .task-card.success { border-top: 4px solid #16a34a; } .task-card-head { display: flex; justify-content: space-between; margin-bottom: 10px; } .task-icon { width: 30px; height: 30px; border-radius: 7px; display: grid; place-items: center; background: #eef2f7; } .task-count { min-width: 24px; height: 24px; display: grid; place-items: center; border-radius: 999px; background: #e2e8f0; font-weight: 900; } .task-card p, li { color: #334155; font-size: 12px; line-height: 1.35; } ul { margin: 10px 0 0; padding-left: 17px; display: grid; gap: 7px; }
        .filters { display: grid; grid-template-columns: 1fr 180px 180px; gap: 10px; align-items: end; } .field { display: grid; gap: 6px; } .field label { color: #475569; font-size: 12px; font-weight: 900; } .field input, .field select { border: 1px solid #cbd5e1; border-radius: 7px; padding: 10px 11px; background: #fff; color: #071225; font-size: 13px; outline: none; }
        .client-list-panel { background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%); } .client-list-actions { justify-content: flex-end; } .client-list-actions .count { background: #fff; border: 1px solid #d8e2ee; padding: 8px 12px; font-size: 13px; }
        .client-flow-list { display: grid; gap: 14px; padding: 14px; background: #eef8ff; } .client-flow-card { background: #fff; border: 1px solid #dbe4ef; border-left-width: 4px; border-radius: 8px; overflow: hidden; box-shadow: 0 16px 36px rgba(15, 23, 42, .06); } .client-flow-card.danger { border-left-color: #dc2626; } .client-flow-card.warn { border-left-color: #d97706; } .client-flow-card.ok { border-left-color: #16a34a; }
        .client-flow-top { display: flex; justify-content: space-between; gap: 16px; padding: 16px 18px; border-bottom: 1px solid #e5edf5; } .client-identity { display: flex; gap: 12px; min-width: 0; } .client-title-row { display: flex; gap: 9px; align-items: center; flex-wrap: wrap; } .client-identity h3 { color: #082f49; font-size: 18px; line-height: 1.2; text-transform: uppercase; } .client-identity p { color: #334155; font-size: 14px; margin-top: 6px; } .client-identity span { color: #475569; font-size: 13px; margin-top: 4px; display: inline-block; } .risk-dot { width: 12px; height: 12px; border-radius: 999px; margin-top: 5px; box-shadow: 0 0 0 6px #eef8ff; flex: 0 0 auto; } .risk-dot.danger { background: #dc2626; } .risk-dot.warn { background: #d97706; } .risk-dot.ok { background: #16a34a; }
        .status-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 9px; font-weight: 900; font-size: 11px; white-space: nowrap; border: 1px solid #e2e8f0; background: #eef2f7; color: #334155; } .status-pill.danger { background: #fee2e2; color: #991b1b; border-color: #fecaca; } .status-pill.warn { background: #fef3c7; color: #92400e; border-color: #fde68a; } .status-pill.ok { background: #dcfce7; color: #166534; border-color: #bbf7d0; } .status-pill.blue { background: #dbeafe; color: #075985; border-color: #93c5fd; }
        .client-main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px 18px; background: #f8fbff; } .client-process-card, .client-action-card, .info-tile, .mapped-issues { border: 1px solid #e5edf5; border-radius: 8px; background: #fff; padding: 13px; } .client-action-card { background: #fff7f7; border-color: #fde2e2; } .client-process-card h4, .client-action-card h4 { font-size: 17px; margin-bottom: 8px; } .client-process-card p, .client-action-card p, .mapped-issues p { color: #334155; font-size: 14px; line-height: 1.45; margin-top: 7px; }
        .flow-panel { margin: 14px 18px; border: 1px solid #e5edf5; border-radius: 8px; padding: 12px 16px 16px; background: #f8fbff; } .flow-panel.repasse { background: #f0fdf4; } .flow-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 13px; } .flow-heading span { border-radius: 999px; padding: 6px 11px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; font-weight: 900; color: #075985; background: #e0f2fe; } .flow-panel.repasse .flow-heading span { color: #166534; background: #dcfce7; } .flow-heading strong { font-size: 15px; }
        .flow-line { display: grid; grid-template-columns: repeat(var(--step-count), minmax(76px, 1fr)); position: relative; } .flow-line:before { content: ''; position: absolute; left: 18px; right: 18px; top: 34px; height: 4px; border-radius: 999px; background: #cbd5e1; } .flow-step { display: grid; justify-items: center; gap: 12px; position: relative; min-width: 0; } .flow-label { color: #475569; font-size: 12px; text-align: center; line-height: 1.2; min-height: 30px; } .flow-label.active { color: #020617; font-weight: 900; } .flow-dot { width: 14px; height: 14px; border-radius: 999px; border: 3px solid #cbd5e1; background: #fff; z-index: 1; } .flow-dot.done { border-color: #10b981; background: #10b981; } .flow-dot.active { width: 18px; height: 18px; border-color: #38bdf8; box-shadow: 0 0 0 7px rgba(56, 189, 248, .18); }
        .client-bottom-grid { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)) 1.4fr; gap: 10px; padding: 0 18px 18px; } .info-tile span { display: block; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; font-weight: 900; margin-bottom: 10px; } .info-tile strong { display: block; border: 1px solid #93c5fd; background: #dbeafe; color: #075985; border-radius: 999px; text-align: center; padding: 9px; font-size: 13px; } .mapped-issues h4 { color: #082f49; font-size: 15px; }
        table { width: 100%; border-collapse: collapse; } th { text-align: left; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; padding: 10px 12px; border-bottom: 1px solid #e5edf5; background: #f8fafc; } td { padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; } .client-name { font-weight: 900; } .deadline { font-weight: 900; } .deadline.danger { color: #dc2626; } .deadline.warn { color: #b45309; }
        @media (max-width: 1180px) { .layout { grid-template-columns: 1fr; } .task-grid, .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .client-main-grid, .client-bottom-grid { grid-template-columns: 1fr 1fr; } .mapped-issues { grid-column: 1 / -1; } }
        @media (max-width: 900px) { .flow-line { overflow-x: auto; padding-bottom: 8px; grid-auto-flow: column; grid-auto-columns: 116px; grid-template-columns: none; } .client-flow-top { flex-direction: column; } .client-actions { justify-content: flex-start; } }
        @media (max-width: 760px) { .broker-page { padding: 12px; } .topbar, .actions { align-items: flex-start; flex-direction: column; } .task-grid, .summary-grid, .filters, .client-main-grid, .client-bottom-grid { grid-template-columns: 1fr; } .client-identity h3 { font-size: 15px; } .client-flow-top, .client-main-grid, .client-bottom-grid { padding-left: 14px; padding-right: 14px; } .flow-panel { margin-left: 14px; margin-right: 14px; } }
      `}</style>

      <div className="broker-shell">
        <header className="topbar">
          <div className="brand"><div className="mark">M2</div><div><h1>Corretor</h1><p className="subtle">Agenda, prioridade operacional, pendencias documentais e carteira vinculada.</p></div></div>
          <nav className="actions" aria-label="Acoes do corretor"><a className="btn" href="/corretor"><RefreshCw size={16} />Atualizar</a><a className="btn primary" href="/corretor"><UserPlus size={16} />Novo pre-cadastro</a><a className="btn" href="/login"><LogOut size={16} />Sair</a></nav>
        </header>

        <section className="summary-grid" aria-label="Resumo operacional">
          <article className="metric"><div><span>Fazer agora</span><strong>2</strong></div><BellRing size={22} /></article>
          <article className="metric"><div><span>Aguardando docs</span><strong>{waitingDocsCount}</strong></div><FileWarning size={22} /></article>
          <article className="metric"><div><span>Prioridade alta</span><strong>{highPriorityCount}</strong></div><AlertTriangle size={22} /></article>
          <article className="metric"><div><span>Carteira ativa</span><strong>{clientes.length}</strong></div><ShieldCheck size={22} /></article>
        </section>

        <section className="layout">
          <aside className="panel"><div className="panel-head"><div><h2>Agenda</h2><p className="subtle">Compromissos do dia em ordem de horario.</p></div><span className="count">{agenda.length}</span></div><div className="panel-body agenda-list">{agenda.map((item) => <article className="agenda-item" key={item.title}><span className="agenda-time">{item.time}</span><div><p className="agenda-title">{item.title}</p><p className="agenda-meta">{item.meta}</p></div></article>)}</div></aside>
          <section className="panel"><div className="panel-head"><div><h2>Mapa de tarefas</h2><p className="subtle">Priorize: agora, urgente, urgente leve, fechamento do dia e semanal.</p></div><span className="count">5 blocos</span></div><div className="panel-body task-grid">{taskGroups.map((group) => <TaskCard key={group.title} group={group} />)}</div></section>
        </section>

        <section className="panel client-list-panel">
          <div className="panel-head">
            <div><p className="subtle" style={{ color: '#0284c7', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.14em' }}>Fila viva</p><h2 style={{ fontSize: 22, marginTop: 5 }}>Fluxo do cliente</h2><p className="subtle">Lista de clientes do corretor, com etapa, travas, SLA, documentos pendentes e proxima acao.</p></div>
            <div className="client-list-actions"><span className="count">{filteredClientes.length} processo(s)</span><span className="count">{waitingDocsCount} aguardando docs</span><span className="count">{highPriorityCount} prioridade alta</span></div>
          </div>
          <div className="panel-body filters">
            <div className="field"><label>Buscar cliente</label><div style={{ position: 'relative' }}><Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#64748b' }} /><input style={{ paddingLeft: 34 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cliente, empreendimento, etapa, caixa ou acao" /></div></div>
            <div className="field"><label>Risco</label><select value={risk} onChange={(event) => setRisk(event.target.value)}><option>Todos</option><option>Alto</option><option>Medio</option><option>Baixo</option></select></div>
            <div className="field"><label>Ordem</label><select><option>Mais criticos primeiro</option></select></div>
          </div>
          <div className="client-flow-list">{filteredClientes.map((cliente) => <ClientFlowCard cliente={cliente} key={cliente.cliente} />)}</div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Pendencias documentais</h2><p className="subtle">Cliente, documento pendente e prazo de resolucao.</p></div><span className="count">{pendencias.length}</span></div>
          <table><thead><tr><th>Cliente</th><th>Documento pendente</th><th>Prazo</th></tr></thead><tbody>{pendencias.map((item) => <tr key={item.cliente}><td><span className="client-name">{item.cliente}</span></td><td>{item.documento}</td><td><span className={`deadline ${item.tone}`}>{item.prazo}</span></td></tr>)}</tbody></table>
        </section>
      </div>
    </main>
  );
}
