import type { ReactNode } from 'react';
import Link from 'next/link';

const navItems = [
  ['Painel', '/analista'],
  ['Acompanhamento', '/analista/workflow'],
  ['Operacional', '/analista/governanca'],
  ['Repasse', '/analista/minuta'],
  ['Importacao', '/analista/checklist'],
  ['Metricas', '/analista/metricas'],
];

const tarefas = [
  ['Tarefas do dia', '7', 'Kits para validar hoje'],
  ['Agendamentos', '4', 'Clientes com horario confirmado'],
  ['Entregas do dia', '9', 'Devolutivas previstas'],
  ['Urgentes', '3', 'Pendencias acima do SLA'],
];

const clientes = [
  {
    id: '458712',
    nome: 'Matheus Alves de Melo',
    obra: 'Residencial Jardins - Torre B',
    corretor: 'Bianca Moura',
    cca: 'Ag. 3884 - Caixa Sul',
    comercial: 'Credito',
    repasse: 'Em repasse',
    caixa: 'Pendencia documentacao',
    agehab: 'Documentos pendenciados',
    acao: 'Cobrar extrato FGTS e comprovante de renda',
    slaCor: '26h',
    slaAnalista: '42h',
    tone: 'danger',
  },
  {
    id: '458713',
    nome: 'Ana Paula Ribeiro',
    obra: 'Parque das Aguas',
    corretor: 'Douglas Silva',
    cca: 'Ag. 2710 - Caixa Centro',
    comercial: 'Secretaria',
    repasse: 'Inicio repasse',
    caixa: 'Formularios disponiveis',
    agehab: 'Ficha Agehab liberada',
    acao: 'Enviar kit para assinatura dos formularios',
    slaCor: '8h',
    slaAnalista: '11h',
    tone: 'ok',
  },
  {
    id: '458714',
    nome: 'Carlos Henrique Souza',
    obra: 'Vila Cerrado',
    corretor: 'Patricia Nunes',
    cca: 'Ag. 4201 - Caixa Norte',
    comercial: 'Em Processo',
    repasse: 'Sem repasse',
    caixa: 'Analise credito',
    agehab: 'Analise credito',
    acao: 'Revisar renda informal e declaracao complementar',
    slaCor: '18h',
    slaAnalista: '23h',
    tone: 'warn',
  },
];

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`analista-badge analista-badge-${tone}`}>{children}</span>;
}

export default function AnalistaPage() {
  return (
    <main className="analista-page">
      <header className="analista-hero">
        <div>
          <span className="analista-eyebrow">MAQ2 Credito</span>
          <h1>Painel do Analista</h1>
          <p>Leitura operacional da carteira, SLA, pendencias e proxima acao do cliente.</p>
        </div>
        <div className="analista-actions">
          <Link href="/painel/acompanhamento">Corretor</Link>
          <Link href="/cca/acompanhamento">CCA</Link>
        </div>
      </header>

      <nav className="analista-tabs" aria-label="Navegacao do analista">
        {navItems.map(([label, href]) => (
          <Link key={href} href={href} className={href === '/analista' ? 'is-active' : ''}>
            {label}
          </Link>
        ))}
      </nav>

      <section className="analista-grid">
        <article className="analista-panel analista-filters-panel">
          <div className="analista-panel-head">
            <span>Recorte</span>
            <h2>Filtros e atalhos</h2>
          </div>
          <div className="analista-filter-grid">
            <label>Buscar<input placeholder="Cliente, obra, corretor" /></label>
            <label>Empreendimento<input placeholder="AGL30" /></label>
            <label>Corretor<input placeholder="Nome do corretor" /></label>
            <label>CCA<select defaultValue=""><option value="">Todos</option><option>Caixa Sul</option><option>Caixa Centro</option></select></label>
          </div>
        </article>

        <article className="analista-panel">
          <div className="analista-panel-head">
            <span>Operacional</span>
            <h2>Central de operacao do credito</h2>
          </div>
          <div className="analista-ops-grid">
            {tarefas.map(([title, total, desc]) => (
              <div className="analista-ops-card" key={title}>
                <span>{title}</span>
                <b>{total}</b>
                <small>{desc}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="analista-panel analista-queue">
        <div className="analista-panel-head analista-row-head">
          <div>
            <span>Fila viva</span>
            <h2>Fluxo do cliente</h2>
          </div>
          <div className="analista-summary-pills">
            <Badge tone="neutral">3 processos</Badge>
            <Badge tone="danger">1 prioridade alta</Badge>
            <Badge tone="warn">2 em SLA de atencao</Badge>
          </div>
        </div>

        <div className="analista-client-stack">
          {clientes.map((cliente) => (
            <article className={`analista-client-card analista-client-${cliente.tone}`} key={cliente.id}>
              <div className="analista-client-main">
                <div>
                  <span className="analista-client-id">Reserva {cliente.id}</span>
                  <h3>{cliente.nome}</h3>
                  <p>{cliente.obra} - {cliente.corretor}</p>
                  <small>CCA responsavel: {cliente.cca}</small>
                </div>
                <div className="analista-sla-stack">
                  <Badge tone={cliente.tone}>Analista {cliente.slaAnalista}</Badge>
                  <Badge tone="neutral">Comercial {cliente.slaCor}</Badge>
                </div>
              </div>

              <div className="analista-flow-line">
                {['Reserva', 'Em Processo', 'Credito', 'Secretaria', 'Assinatura', 'Finalizada'].map((step) => (
                  <span key={step} className={step === cliente.comercial ? 'is-current' : ''}>{step}</span>
                ))}
              </div>

              <div className="analista-client-details">
                <div><span>Comercial</span><b>{cliente.comercial}</b></div>
                <div><span>Repasse</span><b>{cliente.repasse}</b></div>
                <div><span>Caixa</span><b>{cliente.caixa}</b></div>
                <div><span>Agehab</span><b>{cliente.agehab}</b></div>
              </div>

              <div className="analista-next-action">
                <span>Proxima acao</span>
                <strong>{cliente.acao}</strong>
                <Link href={`/checklist_documentos_upload_com_formulario.html?cliente=${encodeURIComponent(cliente.nome)}&reserva=${cliente.id}`}>
                  Abrir checklist
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
