'use client';

import { useMemo, useState } from 'react';
import { RefreshCcw } from 'lucide-react';

/**
 * DADOS DE SIMULAÇÃO: Pendências da equipe de analistas
 * Mapeia o nível de criticidade, nome do proponente, descrição da pendência e prazo.
 */
const pendenciasAnalista = [
  ['critico', 'MATHEUS ALVES', 'Analista: Bianca • Documento pendente: Extrato FGTS', 'Hoje 17:00'],
  ['medio', 'ANA CLARA', 'Analista: Douglas • Documento pendente: Ficha Agehab', '24h'],
  ['ok', 'JOAO PEDRO', 'Analista: CCA Central • Documento pendente: Assinatura MO', '48h'],
];

/**
 * DADOS DE SIMULAÇÃO: Fila Viva de Processos Ativos
 * Contém o histórico completo dos proponentes da esteira de repasse imobiliário da 7LM.
 */
const filaViva = [
  {
    id: '458712',
    produto: 'RD',
    cliente: 'EVERSON LOURENÇO PEREIRA DA SILVA',
    empreendimento: 'AGL030 - Vila Girassol',
    corretor: 'rebeca carvalho',
    cca: '-',
    prioridade: 'Prioridade alta',
    comercial: '76 dias',
    credito: '17 dias',
    panorama: 'Em Processo',
    resumo: 'Kit Caixa | Kit Agehab. Documentos pendentes: 27 de 36',
    aging: '107 anos',
    slaCca: '17 dias',
    caixa: 'Analise Credito',
    agehab: 'Analise Credito',
    sinal: 'Não tem',
    fiador: 'Não tem',
    pendencias: ['Caixa: Análise Crédito', 'Agehab: Análise Crédito'],
  },
];

/**
 * COMPONENTE REUTILIZÁVEL: MetricCard (Cartão de Métrica Padrão)
 * Renderiza indicadores simples com título cinza e valor destacado em negrito.
 * Ajustado com preenchimento flexível para evitar cortes de texto.
 */
export function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="maq-card maq-metric-card" style={{ padding: '20px', minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <span style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      <strong style={{ color: '#ffffff', fontSize: '32px', fontWeight: 800, marginTop: '4px', fontFamily: 'monospace', display: 'block' }}>{value}</strong>
    </div>
  );
}

/**
 * COMPONENTE REUTILIZÁVEL: DashboardShell (Estrutura de Moldura do Painel)
 * Fornece a barra lateral de navegação (Sidebar) e a área de conteúdo principal (Topbar + Section).
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

const navItems = [
  { label: 'Governança', href: '/analista/governanca' },
  { label: 'SLA', href: '/analista/sla' },
  { label: 'Workflow', href: '/analista/workflow' },
  { label: 'Checklist', href: '/analista/checklist' },
  { label: 'Métricas', href: '/analista/metricas' },
  { label: 'Minuta', href: '/analista/minuta' },
];

export function DashboardShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="maq-dashboard-shell" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* BARRA LATERAL (SIDEBAR): Menu de Navegação Operacional */}
      <aside className="maq-sidebar">
        <div className="maq-brand">
          <strong>MAQ2 Crédito</strong>
          <span>Governança Operacional</span>
        </div>
        <nav className="maq-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="maq-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* ÁREA DE CONTEÚDO CENTRAL: Topbar dinâmica e renderização das telas internas */}
      <main className="maq-main">
        <header className="maq-topbar">
          <div>
            <p className="maq-eyebrow">Painel Analista</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="maq-live-pill">Atualização 60s</div>
        </header>

        <section className="maq-content">{children}</section>
      </main>
    </div>
  );
}

/**
 * COMPONENTE PRINCIPAL: MetricasPage (Tela de Monitoramento e Telemetria)
 * Consolida o layout de 3 colunas horizontais perfeitamente alinhadas.
 */
export default function MetricasPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <DashboardShell 
      title="Métricas Operacionais" 
      description="Indicadores de velocidade, qualidade e gargalos do processo de repasse."
    >
      {/* GRID PRINCIPAL: Ajustado para 3 colunas simétricas com espaçamento de segurança anticut */}
      <div className="maq-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', width: '100%', alignItems: 'stretch' }}>
        
        {/* COMPONENTE CARD 1: First Time Right (Métrica de Qualidade de Entrada) */}
        <MetricCard title="First Time Right" value="91%" />

        {/* COMPONENTE CARD 2: CUSTOMIZADO - Controle de SLA Interno + Índice de Retrabalho */}
        <div className="maq-card" style={{ background: '#0b1120', border: '1px solid rgba(148,163,184,.18)', borderRadius: '14px', padding: '20px', boxShadow: '0 10px 20px rgba(15,23,42,.4)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
          <div>
            {/* Título Alinhado ao Padrão */}
            <span style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
              Controle de SLA
            </span>
            
            {/* Box Interno com Gradiente Radial do Cronômetro de Operação */}
            <div style={{ background: 'radial-gradient(circle at top left, rgba(34,197,94,.2), transparent 60%), #020617', border: '1px solid rgba(34,197,94,.5)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <div style={{ color: '#22c55e', fontSize: '24px', fontWeight: 900, letterSpacing: '1px', fontFamily: 'monospace' }}>
                02:58:14
              </div>
              <div style={{ color: '#9ca3af', fontSize: '11px', textAlign: 'right', lineHeight: '1.3' }}>
                Com o:<br />
                <strong style={{ color: '#22c55e', fontSize: '13px', fontWeight: 700 }}>Analista</strong>
              </div>
            </div>
          </div>
          
          {/* Linha Tracejada de Separação e Bloco de Retrabalho (Segurança de Margem Ativada) */}
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed rgba(148,163,184,.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
            <div style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <RefreshCcw size={14} style={{ color: '#ef4444' }} />
              Índice de Retrabalho
            </div>
            <div style={{ color: '#ffffff', fontFamily: 'monospace', fontWeight: 800, fontSize: '15px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '6px', padding: '2px 8px' }}>
              7%
            </div>
          </div>
        </div>

        {/* COMPONENTE CARD 3: Gargalos Operacionais Totais */}
        <MetricCard title="Gargalos" value="12" />

      </div>

      {/* SEÇÃO COMPLEMENTAR: Painel de Fila Viva e Detalhes de Clientes */}
      <section className="maq-section" style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          Monitoramento da Fila Viva
        </h3>
        
        <div className="analyst-table-container" style={{ width: '100%', overflowX: 'auto' }}>
          {filaViva.map((cliente) => {
            const isExpanded = expandedId === cliente.id;
            return (
              <article className={`analyst-row-card ${isExpanded ? 'expanded' : ''}`} key={cliente.id} style={{ backgroundColor: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div className="analyst-main-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span className="badge-pill mini red">{cliente.prioridade}</span>
                    <h3 style={{ margin: '6px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{cliente.cliente}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{cliente.empreendimento} • Corretor: <span style={{ textTransform: 'capitalize' }}>{cliente.corretor}</span></p>
                  </div>
                  <button className="maq-btn" onClick={() => setExpandedId(isExpanded ? null : cliente.id)} style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                    {isExpanded ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                  </button>
                </div>

                {/* Sub-painel expansível com o fluxo de timelines internas */}
                {isExpanded && (
                  <div className="analyst-expanded-content" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    <section className="analyst-timeline-section">
                      <h4>Estágio Atual do Processo</h4>
                      <div className="analyst-timeline-steps">
                        {['Reserva', 'Em Análise Crédito', 'Ficha emitida', 'Ficha Recebida', 'Em Validação Agehab', 'Agehab Validada'].map((etapa, index) => (
                          <div className={index === 1 ? 'current' : index === 0 ? 'done' : ''} key={etapa}>
                            <i />
                            <span>{etapa}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Blocos de Dados Técnicos de Telemetria */}
                    <div className="analyst-detail-bottom" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                      {[
                        ['Caixa', cliente.caixa],
                        ['Agehab', cliente.agehab],
                        ['Sinal', cliente.sinal],
                        ['Fiador', cliente.fiador],
                        ['Produto', 'PAGO'],
                      ].map(([label, value]) => (
                        <section className="analyst-mini-card" key={label} style={{ flex: '1 1 150px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{label}</span>
                          <b style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginTop: '4px' }}>{value}</b>
                        </section>
                      ))}
                      <section className="analyst-pendency-card" style={{ flex: '1 1 100%', padding: '14px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', marginTop: '8px' }}>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#991b1b', fontWeight: 700 }}>Pendências Mapeadas</h4>
                        {cliente.pendencias.map((pendencia) => (
                          <p key={pendencia} style={{ margin: '4px 0', fontSize: '13px', color: '#ea580c' }}>• {pendencia}</p>
                        ))}
                      </section>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </DashboardShell>
  );
}