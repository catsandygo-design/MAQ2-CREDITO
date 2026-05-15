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
  {
    cliente: 'Everson Lourenco Pereira da Silva',
    empreendimento: 'AGLO30 - Vila Girassol',
    corretor: 'Rebeca Carvalho',
    etapa: 'Em Processo',
    caixa: 'Analise Credito',
    agehab: 'Analise Credito',
    prazo: '14 dias',
    acao: 'Atuar em Caixa: Analise Credito',
    risco: 'Alto',
    prioridade: 'Prioridade alta',
    statusComercial: 'Em Processo',
    statusRepasse: 'Sem Repasse',
    aging: '107 anos',
    slaCca: '14 dias',
    documentos: '27 de 36',
    sinal: 'Nao tem',
    fiador: 'Nao tem',
    observacao: 'Sem observacao registrada',
    pendenciasMapeadas: ['Caixa: Analise Credito', 'Agehab: Analise Credito'],
    comercialStep: 1,
    repasseStep: -1,
  },
  {
    cliente: 'Ana Ribeiro',
    empreendimento: 'MAQ Jardim',
    corretor: 'Juliana Sales',
    etapa: 'Credito',
    caixa: 'Pendente Credito',
    agehab: 'Analise Credito',
    prazo: '48h',
    acao: 'Enviar comprovante de renda atualizado',
    risco: 'Alto',
    prioridade: 'Prioridade alta',
    statusComercial: 'Credito',
    statusRepasse: 'Sem Repasse',
    aging: '18 dias',
    slaCca: '48h',
    documentos: '31 de 36',
    sinal: 'Pendente',
    fiador: 'Nao se aplica',
    observacao: 'Cliente precisa reenviar renda antes do retorno do CCA.',
    pendenciasMapeadas: ['Renda: documento vencido', 'Caixa: Pendente Credito'],
    comercialStep: 2,
    repasseStep: -1,
  },
  {
    cliente: 'Marcos Lima',
    empreendimento: 'MAQ Parque',
    corretor: 'Rafael Mendes',
    etapa: 'Em Processo',
    caixa: 'Analise CCA',
    agehab: 'Pendente Agehab',
    prazo: '24h',
    acao: 'Corrigir comprovante residencial',
    risco: 'Medio',
    prioridade: 'Urgente nao critica',
    statusComercial: 'Em Processo',
    statusRepasse: 'Sem Repasse',
    aging: '32 dias',
    slaCca: '24h',
    documentos: '29 de 36',
    sinal: 'Validado',
    fiador: 'Nao tem',
    observacao: 'Conferir endereco antes de devolver para analise.',
    pendenciasMapeadas: ['Agehab: Pendente Agehab', 'Documento: residencia'],
    comercialStep: 1,
    repasseStep: -1,
  },
  {
    cliente: 'Carla Souza',
    empreendimento: 'MAQ Vista',
    corretor: 'Rebeca Carvalho',
    etapa: 'Repasse',
    caixa: 'Condicionado',
    agehab: 'Validado',
    prazo: '12h',
    acao: 'Confirmar documento do fiador',
    risco: 'Medio',
    prioridade: 'Fechamento do dia',
    statusComercial: 'Aprovacao',
    statusRepasse: 'Inicio Repasse',
    aging: '41 dias',
    slaCca: '12h',
    documentos: '34 de 36',
    sinal: 'Validado',
    fiador: 'Pendente',
    observacao: 'Trava de repasse depende da validacao do fiador.',
    pendenciasMapeadas: ['Fiador: documento pendente', 'Caixa: Condicionado'],
    comercialStep: 4,
    repasseStep: 1,
  },
  {
    cliente: 'Beatriz Nunes',
    empreendimento: 'MAQ Prime',
    corretor: 'Lucas Andrade',
    etapa: 'Assinatura',
    caixa: 'Conforme',
    agehab: 'Validado',
    prazo: 'OK',
    acao: 'Acompanhar assinatura',
    risco: 'Baixo',
    prioridade: 'Acompanhar',
    statusComercial: 'Assinatura',
    statusRepasse: 'Assinatura Caixa',
    aging: '22 dias',
    slaCca: 'No prazo',
    documentos: '36 de 36',
    sinal: 'Validado',
    fiador: 'Nao tem',
    observacao: 'Cliente pronto para assinatura programada.',
    pendenciasMapeadas: ['Sem pendencia critica'],
    comercialStep: 3,
    repasseStep: 2,
  },
];

const commercialSteps = ['Reserva', 'Em Processo', 'Credito', 'Secretaria', 'Assinatura', 'Aprovacao', 'Sienge', 'Finalizada'];
const repasseSteps = ['Em Repasse', 'Inicio Repasse', 'Assinatura Caixa', 'Inicio Garantia'];

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

function FlowLine({ steps, activeStep }: { steps: string[]; activeStep: number }) {
  return (
    <div className="flow-line">
      {steps.map((step, index) => (
        <div className="flow-step" key={step}>
          <span className={`flow-label ${index === activeStep ? 'active' : ''}`}>{step}</span>
          <span className={`flow-dot ${index < activeStep ? 'done' : ''} ${index === activeStep ? 'active' : ''}`} />
        </div>
      ))}
    </div>
  );
}

function ClientFlowCard({ cliente }: { cliente: (typeof clientes)[number] }) {
  const riskTone = cliente.risco === 'Alto' ? 'danger' : cliente.risco === 'Medio' ? 'warn' : 'ok';

  return (
    <article className={`client-flow-card ${riskTone}`}>
      <div className="client-flow-top">
        <div className="client-identity">
          <span className={`risk-dot ${riskTone}`} />
          <div>
            <div className="client-title-row">
              <h3>{cliente.cliente}</h3>
              <StatusPill value={cliente.prioridade} tone={riskTone} />
            </div>
            <p>{cliente.empreendimento}</p>
            <span>{cliente.corretor}</span>
          </div>
        </div>
        <div className="client-actions">
          <StatusPill value={`Comercial ${cliente.aging}`} tone="blue" />
          <StatusPill value={`Credito ${cliente.slaCca}`} tone={riskTone} />
          <button type="button">Abrir detalhes</button>
        </div>
      </div>

      <div className="client-main-grid">
        <section className="client-process-card">
          <h4>{cliente.etapa}</h4>
          <p>Repasse em {cliente.statusRepasse}. Documentos pendentes: {cliente.documentos}</p>
          <div className="chip-row">
            <StatusPill value={`Aging ${cliente.aging}`} tone="neutral" />
            <StatusPill value={`SLA CCA ${cliente.slaCca}`} tone={riskTone} />
          </div>
        </section>
        <section className="client-action-card">
          <h4>{cliente.acao}</h4>
          <p>Caixa: {cliente.caixa}</p>
          <p>{cliente.observacao}</p>
        </section>
      </div>

      <section className="flow-panel commercial">
        <div className="flow-heading"><span>Comercial</span><strong>{cliente.statusComercial}</strong></div>
        <FlowLine steps={commercialSteps} activeStep={cliente.comercialStep} />
      </section>

      <section className="flow-panel repasse">
        <div className="flow-heading"><span>Repasse</span><strong>{cliente.statusRepasse}</strong></div>
        <FlowLine steps={repasseSteps} activeStep={cliente.repasseStep} />
      </section>

      <div className="client-bottom-grid">
        <div className="info-tile"><span>Caixa</span><strong>{cliente.caixa}</strong></div>
        <div className="info-tile"><span>Agehab</span><strong>{cliente.agehab}</strong></div>
        <div className="info-tile"><span>Sinal</span><strong>{cliente.sinal}</strong></div>
        <div className="info-tile"><span>Fiador</span><strong>{cliente.fiador}</strong></div>
        <div className="info-tile"><span>SLA CCA</span><strong>{cliente.slaCca}</strong></div>
        <div className="mapped-issues">
          <h4>Pendencias mapeadas</h4>
          {cliente.pendenciasMapeadas.map((item) => <p key={item}>{item}</p>)}
        </div>
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
      const searchable = [
        cliente.cliente,
        cliente.empreendimento,
        cliente.corretor,
        cliente.etapa,
        cliente.acao,
        cliente.caixa,
        cliente.agehab,
      ];
      const matchesQuery = !q || searchable.some((field) => field.toLowerCase().includes(q));
      const matchesRisk = risk === 'Todos' || cliente.risco === risk;
      return matchesQuery && matchesRisk;
    });
  }, [query, risk]);

  const highPriorityCount = clientes.filter((cliente) => cliente.risco === 'Alto').length;
  const waitingDocsCount = clientes.filter((cliente) => cliente.documentos !== '36 de 36').length;

  return (
    <main className="broker-page">
      <style>{`
        .broker-page { min-height: 100vh; background: #f4f7fb; color: #111827; padding: 22px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
        .broker-shell { max-width: 1480px; margin: 0 auto; display: grid; gap: 14px; }
        .topbar { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 14px 16px; background: #fff; border: 1px solid #d9e2ec; border-radius: 8px; box-shadow: 0 12px 28px rgba(15, 23, 42, .06); }
        .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .mark { width: 42px; height: 42px; border-radius: 8px; display: grid; place-items: center; background: #0f766e; color: #fff; font-weight: 900; letter-spacing: .2px; }
        h1, h2, h3, h4, p { margin: 0; } h1 { font-size: 22px; line-height: 1.15; } h2 { font-size: 15px; } h3 { font-size: 13px; } h4 { font-size: 13px; }
        .subtle { color: #64748b; font-size: 12px; line-height: 1.35; margin-top: 3px; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn, .client-actions button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid #cbd5e1; background: #fff; border-radius: 7px; padding: 9px 11px; font-weight: 750; font-size: 13px; color: #0f172a; text-decoration: none; cursor: pointer; }
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
        .status-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 8px; font-weight: 850; font-size: 11px; white-space: nowrap; background: #eef2f7; color: #334155; border: 1px solid transparent; }
        .status-pill.danger { background: #fee2e2; color: #991b1b; border-color: #fecaca; } .status-pill.warn { background: #fef3c7; color: #92400e; border-color: #fde68a; } .status-pill.ok { background: #dcfce7; color: #166534; border-color: #bbf7d0; } .status-pill.neutral { background: #eef2f7; color: #334155; border-color: #e2e8f0; } .status-pill.blue { background: #dbeafe; color: #075985; border-color: #93c5fd; }
        .deadline { font-weight: 900; } .deadline.danger { color: #dc2626; } .deadline.warn { color: #b45309; }
        .section-stack { display: grid; gap: 14px; }
        .client-list-panel { background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); }
        .client-list-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: flex-end; }
        .client-list-actions .count { border: 1px solid #d9e2ec; background: #fff; padding: 8px 12px; font-size: 13px; box-shadow: 0 8px 22px rgba(15, 23, 42, .04); }
        .client-flow-list { display: grid; gap: 14px; padding: 14px; background: #eef8ff; }
        .client-flow-card { background: #fff; border: 1px solid #dbe4ef; border-radius: 8px; overflow: hidden; box-shadow: 0 16px 38px rgba(15, 23, 42, .06); }
        .client-flow-card.danger { border-left: 4px solid #dc2626; } .client-flow-card.warn { border-left: 4px solid #d97706; } .client-flow-card.ok { border-left: 4px solid #16a34a; }
        .client-flow-top { display: flex; justify-content: space-between; gap: 16px; padding: 18px 20px; align-items: flex-start; border-bottom: 1px solid #e5edf5; background: #fff; }
        .client-identity { display: flex; gap: 12px; min-width: 0; align-items: flex-start; } .client-identity h3 { font-size: 18px; line-height: 1.2; color: #082f49; text-transform: uppercase; }
        .client-identity p { color: #334155; font-size: 14px; margin-top: 6px; } .client-identity span { display: inline-flex; color: #475569; font-size: 13px; margin-top: 4px; }
        .client-title-row { display: flex; gap: 9px; align-items: center; flex-wrap: wrap; }
        .risk-dot { width: 12px; height: 12px; border-radius: 999px; margin-top: 4px; box-shadow: 0 0 0 6px #eef8ff; flex: 0 0 auto; } .risk-dot.danger { background: #dc2626; } .risk-dot.warn { background: #d97706; } .risk-dot.ok { background: #16a34a; }
        .client-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; max-width: 520px; }
        .client-main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px 20px; background: #f8fbff; }
        .client-process-card, .client-action-card { border: 1px solid #e5edf5; border-radius: 8px; background: #fff; padding: 14px; }
        .client-action-card { background: #fff7f7; border-color: #fde2e2; } .client-process-card h4, .client-action-card h4 { font-size: 17px; color: #020617; margin-bottom: 8px; }
        .client-process-card p, .client-action-card p { color: #334155; font-size: 14px; line-height: 1.45; margin-top: 8px; } .chip-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
        .flow-panel { margin: 14px 20px; border: 1px solid #e5edf5; border-radius: 8px; padding: 12px 16px 16px; background: #f8fbff; }
        .flow-panel.repasse { background: #f0fdf4; } .flow-heading { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
        .flow-heading span { border-radius: 999px; padding: 6px 11px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; font-weight: 900; color: #075985; background: #e0f2fe; } .flow-panel.repasse .flow-heading span { color: #166534; background: #dcfce7; }
        .flow-heading strong { color: #020617; font-size: 15px; }
        .flow-line { display: grid; grid-template-columns: repeat(var(--steps, 8), minmax(76px, 1fr)); gap: 0; position: relative; }
        .flow-line:before { content: ''; position: absolute; left: 18px; right: 18px; top: 34px; height: 4px; border-radius: 999px; background: #cbd5e1; }
        .flow-step { display: grid; justify-items: center; gap: 12px; position: relative; min-width: 0; } .flow-label { color: #475569; font-size: 12px; text-align: center; line-height: 1.2; min-height: 30px; } .flow-label.active { color: #020617; font-weight: 900; }
        .flow-dot { width: 14px; height: 14px; border-radius: 999px; border: 3px solid #cbd5e1; background: #fff; z-index: 1; } .flow-dot.done { border-color: #10b981; background: #10b981; } .flow-dot.active { width: 18px; height: 18px; border-color: #38bdf8; box-shadow: 0 0 0 7px rgba(56, 189, 248, .18); }
        .client-bottom-grid { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)) 1.4fr; gap: 10px; padding: 0 20px 18px; }
        .info-tile, .mapped-issues { border: 1px solid #e5edf5; border-radius: 8px; background: #fff; padding: 12px; min-height: 68px; } .info-tile span { display: block; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; font-weight: 900; margin-bottom: 10px; } .info-tile strong { display: block; border: 1px solid #93c5fd; background: #dbeafe; color: #075985; border-radius: 999px; text-align: center; padding: 9px; font-size: 13px; }
        .mapped-issues h4 { font-size: 15px; color: #082f49; margin-bottom: 10px; } .mapped-issues p { color: #334155; font-size: 14px; line-height: 1.4; margin-top: 5px; }
        @media (max-width: 1180px) { .layout { grid-template-columns: 1fr; } .task-grid, .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .client-main-grid, .client-bottom-grid { grid-template-columns: 1fr 1fr; } .mapped-issues { grid-column: 1 / -1; } }
        @media (max-width: 900px) { .flow-line { overflow-x: auto; padding-bottom: 8px; grid-auto-flow: column; grid-auto-columns: 116px; grid-template-columns: none; } .client-flow-top { flex-direction: column; } .client-actions { justify-content: flex-start; max-width: none; } }
        @media (max-width: 760px) { .broker-page { padding: 12px; } .topbar, .actions { align-items: flex-start; flex-direction: column; } .task-grid, .summary-grid, .filters, .client-main-grid, .client-bottom-grid { grid-template-columns: 1fr; } th:nth-child(4), td:nth-child(4) { display: none; } .client-identity h3 { font-size: 15px; } .client-flow-top, .client-main-grid, .client-bottom-grid { padding-left: 14px; padding-right: 14px; } .flow-panel { margin-left: 14px; margin-right: 14px; } }
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
          <article className="metric"><div><span>Aguardando docs</span><strong>{waitingDocsCount}</strong></div><FileWarning size={22} /></article>
          <article className="metric"><div><span>Prioridade alta</span><strong>{highPriorityCount}</strong></div><AlertTriangle size={22} /></article>
          <article className="metric"><div><span>Carteira ativa</span><strong>{clientes.length}</strong></div><ShieldCheck size={22} /></article>
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
            <div className="field"><label>Buscar</label><div style={{ position: 'relative' }}><Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#64748b' }} /><input style={{ paddingLeft: 34 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cliente, empreendimento, etapa, caixa ou acao" /></div></div>
            <div className="field"><label>Risco</label><select value={risk} onChange={(event) => setRisk(event.target.value)}><option>Todos</option><option>Alto</option><option>Medio</option><option>Baixo</option></select></div>
            <div className="field"><label>Ordem</label><select><option>Mais criticos primeiro</option></select></div>
          </div>
        </section>

        <section className="panel client-list-panel">
          <div className="panel-head">
            <div>
              <p className="subtle" style={{ color: '#0284c7', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.14em' }}>Fila viva</p>
              <h2 style={{ fontSize: 22, marginTop: 5 }}>Fluxo do cliente</h2>
              <p className="subtle">Cada card mostra etapa, travas, SLA, documentos pendentes e proxima acao sem repetir resumo em varios blocos.</p>
            </div>
            <div className="client-list-actions">
              <span className="count">{filteredClientes.length} processo(s)</span>
              <span className="count">{waitingDocsCount} aguardando docs</span>
              <span className="count">{highPriorityCount} prioridade alta</span>
            </div>
          </div>
          <div className="client-flow-list">
            {filteredClientes.map((cliente) => <ClientFlowCard cliente={cliente} key={cliente.cliente} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
