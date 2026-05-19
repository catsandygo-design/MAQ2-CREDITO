'use client';

import Link from 'next/link';

/**
 * DADOS DE SIMULAÇÃO: Processos Operacionais do CCA
 * Mapeia o histórico, produto, nome do proponente, gestor interno, agência vinculada e o status atual.
 */
const processosCca = [
  ['458712', 'PP', 'Matheus Alves de Melo', 'Bianca Moura', 'Ag. 3884 - Caixa Sul', 'DOC PENDENCIADO CCA'],
  ['458713', 'PN', 'Ana Paula Ribeiro', 'Douglas Silva', 'Ag. 2710 - Caixa Centro', 'EMITIR FORMULÁRIOS'],
  ['458714', 'PA', 'Carlos Henrique Souza', 'Patricia Nunes', 'Ag. 4201 - Caixa Norte', 'AGUARDANDO FORMULÁRIOS'],
  ['458715', 'PP', 'João Amorin', 'CCA Central', 'Ag. 1562 - Caixa Oeste', 'FORMULÁRIOS ASSINADOS'],
  ['458716', 'PN', 'Mariana Costa Lima', 'Bianca Moura', 'Ag. 3884 - Caixa Sul', 'DOC PENDENCIADO CCA'],
  ['458717', 'PA', 'Renato Gomes Paiva', 'Douglas Silva', 'Ag. 2710 - Caixa Centro', 'PROCESSO FINALIZADO'],
];

/**
 * DADOS DE SIMULAÇÃO: Alertas Críticos de SLA do CCA
 * Define o nível de risco, nome do cliente, descrição exata do gargalo e o tempo restante.
 */
const alertasCca = [
  ['critico', 'ANA PAULA', 'Pendente emissão de formulário Caixa', 'Aguardando'],
  ['medio', 'MATHEUS ALVES', 'Aguardando documentos para iniciar análise CCA', '24h'],
  ['ok', 'CARLOS HENRIQUE', 'Formulário emitido e em conferência', '12h'],
  ['medio', 'JOÃO PEDRO', 'Aguardando validação da assinatura eletrônica', '18h'],
];

/**
 * FUNÇÃO AUXILIAR: badge
 * Retorna a classe CSS correta baseada no momento do processo para estilização dinâmica.
 */
function badge(momento: string) {
  if (momento.includes('PENDENCIADO')) return 'cor-badge cor-badge-danger';
  if (momento.includes('EMITIR') || momento.includes('AGUARDANDO')) return 'cor-badge cor-badge-warning';
  if (momento.includes('ASSINADOS') || momento.includes('FINALIZADO')) return 'cor-badge cor-badge-success';
  return 'cor-badge cor-badge-info';
}

/**
 * COMPONENTE PRINCIPAL: CcaDashboard
 * Controla e renderiza a telemetria, alertas de esteira e a fila de conformidade do CCA.
 */
export default function CcaDashboard() {
  return (
    <main className="cor-main-layout" style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '24px', backgroundColor: '#020617', minHeight: '100vh', color: '#f8fafc' }}>
      
      {/* SEÇÃO 1: Grade Superior (Alertas de Monitoramento + Métricas de Fluxo) */}
      <section className="cor-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '32px', alignItems: 'stretch' }}>
        
        {/* COMPONENTE: Painel de Alertas de SLA */}
        <article className="cor-table-card alert-card-height" style={{ backgroundColor: '#0b1120', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
          <div className="cor-card-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', margin: 0 }}>
              Alertas de Monitoramento CCA
            </h2>
          </div>
          
          <div className="cor-alert-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alertasCca.map(([nivel, proponente, detalhe, tempo], i) => (
              <div key={i} className={`cor-alert-item ${nivel}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', backgroundColor: nivel === 'critico' ? 'rgba(239,68,68,0.08)' : nivel === 'medio' ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${nivel === 'critico' ? 'rgba(239,68,68,0.2)' : nivel === 'medio' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
                <div style={{ flex: 1, paddingRight: '12px' }}>
                  <strong style={{ display: 'block', fontSize: '13px', color: '#ffffff', letterSpacing: '0.02em' }}>{proponente}</strong>
                  <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>{detalhe}</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: nivel === 'critico' ? '#ef4444' : nivel === 'medio' ? '#f59e0b' : '#22c55e', backgroundColor: 'rgba(15,23,42,0.6)', padding: '4px 10px', borderRadius: '6px', fontFamily: 'monospace' }}>
                  {tempo}
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* COMPONENTE: Métricas Estatísticas do Fluxo CCA */}
        <article className="cor-table-card info-gradient-card" style={{ background: 'linear-gradient(135deg, #0b1120 0%, #020617 100%)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
          <div className="cor-card-header" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', margin: 0 }}>
              Métricas do Fluxo de Correspondente
            </h2>
          </div>
          
          {/* Grid de Blocos Dinâmicos: Ajustado com flex/padding para evitar cortes de texto */}
          <div className="cca-flow-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
            {[
              ['Com o CCA', '31', 'processos ativos na esteira'],
              ['Para conformidade', '18', 'encaminhados para validação'],
              ['Assinados', '9', 'minutas contratuais assinadas'],
            ].map(([titulo, valor, subtitulo], idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', backgroundColor: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>{titulo}</span>
                  <small style={{ fontSize: '12px', color: '#64748b' }}>{subtitulo}</small>
                </div>
                <b style={{ fontSize: '28px', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>{valor}</b>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* SEÇÃO 2: Tabela Principal de Análise e Conformidade Operacional */}
      <section className="cor-table-card cca-table-card" style={{ backgroundColor: '#0b1120', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '16px', padding: '24px', boxShadow: '0 15px 30px -10px rgba(0,0,0,0.5)' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            Fila CCA de Análise e Conformidade
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Controle de contratos, emissão de relatórios e monitoramento de agências Caixa.
          </p>
        </div>
        
        {/* Container Adaptável com Scroll Horizontal de Segurança contra cortes */}
        <div className="cor-table-scroll" style={{ width: '100%', overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.08)' }}>
          <table className="cor-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '2px solid rgba(148,163,184,0.15)' }}>
                <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Reserva</th>
                <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Cliente / Proponente</th>
                <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Gestor</th>
                <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Agência Caixa</th>
                <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Momento do Cliente</th>
              </tr>
            </thead>
            <tbody>
              {processosCca.map(([reserva, produto, nome, gestor, agencia, momento], idx) => (
                <tr key={reserva} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(30,41,59,0.2)', transition: 'background-color 0.2s' }}>
                  {/* Código Identificador da Reserva */}
                  <td style={{ padding: '16px', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace', fontSize: '14px' }}>
                    {reserva}
                  </td>
                  
                  {/* Link Direto para o Checklist Operacional */}
                  <td style={{ padding: '16px' }}>
                    <Link 
                      className="cor-link" 
                      href={`/analista/checklist?cliente=${encodeURIComponent(nome)}&reserva=${reserva}`}
                      style={{ color: '#ffffff', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', gap: '6px', alignItems: 'center' }}
                    >
                      <span style={{ color: '#64748b', fontSize: '12px', fontFamily: 'monospace', backgroundColor: 'rgba(148,163,184,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        {produto}
                      </span>
                      <span className="cor-link-hover-effect">{nome}</span>
                    </Link>
                  </td>
                  
                  {/* Nome do Gestor de Operação */}
                  <td style={{ padding: '16px', color: '#cbd5e1', fontWeight: 500 }}>
                    {gestor}
                  </td>
                  
                  {/* Badge Identificadora da Agência Bancária */}
                  <td style={{ padding: '16px' }}>
                    <span className="cor-badge cor-badge-info" style={{ backgroundColor: 'rgba(56,189,248,0.08)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '12px' }}>
                      {agencia}
                    </span>
                  </td>
                  
                  {/* Badge de Status Dinâmico de SLA */}
                  <td style={{ padding: '16px' }}>
                    <span className={badge(momento)} style={{ padding: '5px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', letterSpacing: '0.03em', display: 'inline-block' }}>
                      {momento}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}