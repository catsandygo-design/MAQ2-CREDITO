'use client';

import { useState } from 'react';

const pendenciasAnalista = [
  ['critico', 'MATHEUS ALVES', 'Extrato FGTS pendente de retorno do corretor.', 'Hoje 17:00'],
  ['medio', 'ANA PAULA', 'Documento enviado, a aguardar abertura do analista.', '12h'],
  ['medio', 'CARLOS HENRIQUE', 'Renda informal exige declaração complementar.', '24h'],
  ['ok', 'JOÃO AMORIN', 'Kit documental aprovado para envio ao CCA.', 'OK'],
];

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
    caixa: 'Análise de Crédito',
    agehab: 'Análise de Crédito',
    sinal: 'Não tem',
    fiador: 'Não tem',
    pendencias: ['Caixa: Análise de Crédito', 'Agehab: Análise de Crédito'],
  },
  {
    id: '458713',
    produto: 'RD',
    cliente: 'KHETLLEN GERMANO DA SILVA',
    empreendimento: 'AGL032 - Vila Margarida - Receitas de Incorporação',
    corretor: 'joão andrade',
    cca: '-',
    prioridade: 'Prioridade alta',
    comercial: '27 dias',
    credito: '8 dias',
    panorama: 'Em Processo',
    resumo: 'Kit Caixa | Kit Agehab. Documentos pendentes: 18 de 36',
    aging: '82 dias',
    slaCca: '8 dias',
    caixa: 'Análise de Crédito',
    agehab: 'Análise de Crédito',
    sinal: 'Não tem',
    fiador: 'Não tem',
    pendencias: ['Caixa: Análise de Crédito', 'Agehab: Análise de Crédito'],
  },
  {
    id: '458714',
    produto: 'RD',
    cliente: 'ELIÉZIO ALVES DO CARMO',
    empreendimento: 'AGL030 - Vila Girassol',
    corretor: 'letícia brito',
    cca: '-',
    prioridade: 'Prioridade alta',
    comercial: '23 dias',
    credito: '5 dias',
    panorama: 'Em Processo',
    resumo: 'Kit Caixa | Kit Agehab. Documentos pendentes: 12 de 36',
    aging: '64 dias',
    slaCca: '5 dias',
    caixa: 'Análise de Crédito',
    agehab: 'Análise de Crédito',
    sinal: 'Não tem',
    fiador: 'Não tem',
    pendencias: ['Caixa: Análise de Crédito'],
  },
  {
    id: '458715',
    produto: 'RD',
    cliente: 'JOÃO AMORIN',
    empreendimento: 'AGL030 - Vila Girassol',
    corretor: 'mariana costa',
    cca: '-',
    prioridade: 'Prioridade alta',
    comercial: '19 dias',
    credito: '4 dias',
    panorama: 'Em Processo',
    resumo: 'Kit documental aprovado para acompanhamento operacional',
    aging: '51 dias',
    slaCca: '4 dias',
    caixa: 'Análise de Crédito',
    agehab: 'Análise de Crédito',
    sinal: 'Não tem',
    fiador: 'Não tem',
    pendencias: ['Caixa: Análise de Crédito'],
  },
];

const resumoCarteira = [
  ['Clientes em reserva', '42', 'Processos ativos na carteira'],
  ['Finalizados', '18', 'Kits aprovados ou enviados ao CCA'],
  ['Em pendência', '9', 'Dependem de ajuste documental'],
];

export default function AppAnalistaPage() {
  const [detalhesAbertos, setDetalhesAbertos] = useState<string[]>([]);

  const abrirTodos = () => setDetalhesAbertos(filaViva.map((cliente) => cliente.id));
  const fecharTodos = () => setDetalhesAbertos([]);
  const alternarDetalhe = (id: string) => {
    setDetalhesAbertos((abertos) => (
      abertos.includes(id) ? abertos.filter((item) => item !== id) : [...abertos, id]
    ));
  };

  return (
    <main className="cor-page cor-page-premium" data-layout-version="analista-dashboards-v1">
      <header className="cor-premium-top">
        <div className="cor-premium-title">
          <span className="cor-chart-icon">↗</span>
          <div>
            <h1>Painel do Analista</h1>
            <p>Gestão documental, pendências de crédito, SLA da carteira e telemetria dos processos em reserva.</p>
          </div>
        </div>
        <div className="cor-premium-actions cor-actions-no-primary">
          <button>↻ Atualizar</button>
          <button>↪ Sair</button>
        </div>
      </header>

      {/* AJUSTE: alignItems stretch fortelece o alinhamento das 3 colunas em conjunto */}
      <section className="cor-dash-grid cor-dash-premium" style={{ alignItems: 'stretch' }}>
        <article className="cor-card cor-panel-alerts">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 1 — Pendências Acompanhadas</small>
              <p>Clientes e documentos que necessitam de ação do analista ou retorno do corretor.</p>
            </div>
            <strong className="cor-urgent-pill">3 Atenções</strong>
          </div>
          <div className="cor-alert-list">
            {pendenciasAnalista.map(([tone, nome, desc, prazo]) => (
              <div className={`cor-alert-item cor-alert-${tone}`} key={nome}>
                <i />
                <div>
                  <b>{nome}</b>
                  <span>{desc}</span>
                </div>
                <em><small>Prazo</small>{prazo}</em>
              </div>
            ))}
          </div>
        </article>

        {/* AJUSTE: Flexbox para espalhar os dois cards verticalmente eliminando os brancos da base */}
        <div className="cor-sla-stack" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          <article className="cor-card cor-panel-sla">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 3 — SLA</small>
                <p>Tempo médio da carteira do analista face ao melhor SLA operacional.</p>
              </div>
            </div>
            {/* AJUSTE: flexShrink impede o esmagamento; minHeight protege o espaço da agulha */}
            <div className="cor-speed-premium" style={{ flexShrink: 0, minHeight: '110px' }}>
              <div className="cor-speed-arc" />
              <div className="cor-speed-needle" />
              {/* AJUSTE: Scale 0.8 reduz visualmente o círculo branco central */}
              <span style={{ transform: 'scale(0.8)' }} />
            </div>
            <div className="cor-sla-lines">
              <div><span>Melhor SLA documental</span><small>Referência da operação</small><b className="green">3h</b></div>
              <div><span>SLA atual do analista</span><small>Média de resposta da carteira</small><b className="orange">11h</b></div>
            </div>
          </article>
          
          <article className="cor-card cor-rework-card" style={{ marginTop: '16px' }}>
            <div className="cor-rework">
              <span className="cor-rework-icon">🔨</span>
              <span>Taxa de retrabalho</span>
              <b>3,2%</b>
            </div>
          </article>
        </div>

        <article className="cor-card cor-panel-conversion">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 2 — Carteira em Reserva</small>
                <p>Quantidade de clientes em reserva, finalizados e em pendência documental.</p>
              </div>
            </div>
            <div className="cca-flow-metrics">
              {resumoCarteira.map(([label, total, desc]) => (
                <div key={label}>
                  <span>{label}</span>
                  <b>{total}</b>
                  <small>{desc}</small>
                </div>
              ))}
            </div>
          </article>
      </section>

      <section className="analyst-live-board">
        <header className="analyst-live-head">
          <div>
            <span>Fila Viva</span>
            <h2>Fluxo do cliente</h2>
            <p>Cada card mostra etapa, travas e próxima ação, sem repetir o mesmo resumo em vários blocos.</p>
          </div>
          <div className="analyst-live-actions">
            <strong>20 processo(s)</strong>
            <strong>17 a aguardar docs.</strong>
            <strong>20 prioridade alta</strong>
            <button type="button" onClick={abrirTodos}>Abrir todos</button>
            <button type="button" onClick={fecharTodos}>Fechar todos</button>
            <button>Fechar</button>
          </div>
        </header>

        <div className="analyst-live-list">
          {filaViva.map((cliente) => {
            const detalheAberto = detalhesAbertos.includes(cliente.id);

            return (
            <article className={`analyst-live-card ${detalheAberto ? 'is-open' : ''}`} key={cliente.id}>
              <div className="analyst-live-main">
                <div className="analyst-client-title">
                  <i />
                  <b>{cliente.produto}</b>
                  <h3>
                    <a href={`/analista/checklist?cliente=${encodeURIComponent(cliente.cliente)}&reserva=${cliente.id}`}>
                      {cliente.cliente}
                    </a>
                  </h3>
                </div>
                <p>{cliente.empreendimento}</p>
                <p>{cliente.corretor}</p>
                <div className="analyst-cca-line">
                  <span>CCA responsável</span>
                  <em>{cliente.cca}</em>
                </div>
                <small>{cliente.prioridade}</small>
              </div>

              <div className="analyst-live-status">
                <div>
                  <span>Comercial {cliente.comercial}</span>
                  <span>Crédito {cliente.credito}</span>
                </div>
                <button type="button" onClick={() => alternarDetalhe(cliente.id)}>
                  {detalheAberto ? 'Fechar detalhes' : 'Abrir detalhes'}
                </button>
              </div>

              {detalheAberto && (
                <div className="analyst-detail-panel">
                  <div className="analyst-detail-grid">
                    <section className="analyst-detail-box">
                      <span>Panorama</span>
                      <h4>{cliente.panorama}</h4>
                      <p>{cliente.resumo}</p>
                      <div className="analyst-detail-tags">
                        <b>Aging {cliente.aging}</b>
                        <b className="danger">SLA CCA {cliente.slaCca}</b>
                      </div>
                    </section>

                    <section className="analyst-detail-box analyst-next-action">
                      <span>Próxima ação</span>
                      <h4>Atuar em Caixa: Análise de Crédito</h4>
                      <p>Caixa: Análise de Crédito</p>
                      <p>Sem observação registada</p>
                    </section>
                  </div>

                  <section className="analyst-stage-card">
                    <div className="analyst-stage-head">
                      <b>Kit Caixa</b>
                      <strong>Em Análise de Crédito</strong>
                    </div>
                    <div className="analyst-stage-line kit-caixa">
                      {['Reserva', 'Em Análise de Crédito', 'A Emitir Formulários', 'Formulários em Assinatura', 'Formulários Assinados', 'Finalizado'].map((etapa, index) => (
                        <div className={index === 1 ? 'current' : index === 0 ? 'done' : ''} key={etapa}>
                          <i />
                          <span>{etapa}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="analyst-stage-card analyst-repasse">
                    <div className="analyst-stage-head">
                      <b>Kit Agehab</b>
                      <strong>Em Análise de Crédito</strong>
                    </div>
                    <div className="analyst-stage-line kit-agehab">
                      {['Reserva', 'Em Análise de Crédito', 'Ficha emitida', 'Ficha Recebida', 'Em Validação Agehab', 'Agehab Validada'].map((etapa, index) => (
                        <div className={index === 1 ? 'current' : index === 0 ? 'done' : ''} key={etapa}>
                          <i />
                          <span>{etapa}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="analyst-detail-bottom">
                    {[
                      ['Caixa', cliente.caixa],
                      ['Agehab', cliente.agehab],
                      ['Sinal', cliente.sinal],
                      ['Fiador', cliente.fiador],
                      ['SLA CCA', cliente.slaCca],
                    ].map(([label, value]) => (
                      <section className="analyst-mini-card" key={label}>
                        <span>{label}</span>
                        <b>{value}</b>
                      </section>
                    ))}
                    <section className="analyst-pendency-card">
                      <h4>Pendências mapeadas</h4>
                      {cliente.pendencias.map((pendencia) => (
                        <p key={pendencia}>{pendencia}</p>
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
    </main>
  );
}