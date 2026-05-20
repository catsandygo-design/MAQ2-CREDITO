'use client';

import { useState } from 'react';

const pendenciasModeloAnalista = [
  ['critico', 'MATHEUS ALVES', 'Extrato FGTS pendente de retorno do corretor', 'Hoje 17:00'],
  ['medio', 'ANA PAULA', 'Documento enviado aguardando abertura do analista', '12h'],
  ['medio', 'CARLOS HENRIQUE', 'Renda informal exige declaracao complementar', '24h'],
  ['ok', 'JOAO AMORIN', 'Kit documental aprovado para envio ao CCA', 'OK'],
];

const resumoOperacionalCca = [
  ['Com o CCA', '31', 'processos ativos'],
  ['Para conformidade', '18', 'encaminhados'],
  ['Assinados', '9', 'minutas assinadas'],
];

const filaVivaCca = [
  {
    id: '458712',
    produto: 'PP',
    cliente: 'MATHEUS ALVES DE MELO',
    empreendimento: 'Ag. 3884 - Caixa Sul',
    corretor: 'Bianca Moura',
    cca: 'CCA',
    prioridade: 'DOC PENDENCIADO CCA',
    comercial: '76 dias',
    credito: '17 dias',
    panorama: 'Em Processo',
    resumo: 'Aguardando retorno documental para continuidade da analise CCA.',
    aging: '76 dias',
    slaCca: '17 dias',
    caixa: 'Doc Pendenciado CCA',
    agehab: 'N/A',
    sinal: 'Nao tem',
    fiador: 'Nao tem',
    pendencias: ['Doc Pendenciado CCA'],
  },
  {
    id: '458713',
    produto: 'PN',
    cliente: 'ANA PAULA RIBEIRO',
    empreendimento: 'Ag. 2710 - Caixa Centro',
    corretor: 'Douglas Silva',
    cca: 'CCA',
    prioridade: 'EMITIR FORMULARIOS',
    comercial: '27 dias',
    credito: '8 dias',
    panorama: 'Em Processo',
    resumo: 'Processo pronto para emissao dos formularios Caixa.',
    aging: '27 dias',
    slaCca: '8 dias',
    caixa: 'Emitir Formularios',
    agehab: 'N/A',
    sinal: 'Nao tem',
    fiador: 'Nao tem',
    pendencias: ['Emitir Formularios'],
  },
  {
    id: '458714',
    produto: 'PA',
    cliente: 'CARLOS HENRIQUE SOUZA',
    empreendimento: 'Ag. 4201 - Caixa Norte',
    corretor: 'Patricia Nunes',
    cca: 'CCA',
    prioridade: 'AGUARDANDO FORMULARIOS',
    comercial: '23 dias',
    credito: '5 dias',
    panorama: 'Em Processo',
    resumo: 'Formulario emitido aguardando retorno para conferencia.',
    aging: '23 dias',
    slaCca: '5 dias',
    caixa: 'Aguardando Formularios',
    agehab: 'N/A',
    sinal: 'Nao tem',
    fiador: 'Nao tem',
    pendencias: ['Aguardando Formularios'],
  },
  {
    id: '458715',
    produto: 'PP',
    cliente: 'JOAO AMORIN',
    empreendimento: 'Ag. 1562 - Caixa Oeste',
    corretor: 'CCA Central',
    cca: 'CCA',
    prioridade: 'FORMULARIOS ASSINADOS',
    comercial: '19 dias',
    credito: '4 dias',
    panorama: 'Em Processo',
    resumo: 'Formularios assinados aguardando envio para proxima etapa.',
    aging: '19 dias',
    slaCca: '4 dias',
    caixa: 'Formularios Assinados',
    agehab: 'N/A',
    sinal: 'Nao tem',
    fiador: 'Nao tem',
    pendencias: ['Formularios Assinados'],
  },
];

export default function CcaAcompanhamentoPage() {
  const [detalhesAbertos, setDetalhesAbertos] = useState<string[]>([]);

  const abrirTodos = () => setDetalhesAbertos(filaVivaCca.map((cliente) => cliente.id));
  const fecharTodos = () => setDetalhesAbertos([]);
  const alternarDetalhe = (id: string) => {
    setDetalhesAbertos((abertos) => (
      abertos.includes(id) ? abertos.filter((item) => item !== id) : [...abertos, id]
    ));
  };

  return (
    <main className="cor-page cor-page-premium" data-layout-version="analista-dashboards-v1">
      <script
        dangerouslySetInnerHTML={{
          __html: "try { localStorage.setItem('maq2_last_context', 'cca'); } catch (e) {}",
        }}
      />

      <header className="cor-premium-top">
        <div className="cor-premium-title">
          <span className="cor-chart-icon">&uarr;</span>
          <div>
            <h1>Painel CCA</h1>
            <p>Gestao documental, pendencias de credito, SLA da carteira e telemetria dos processos em reserva.</p>
          </div>
        </div>
        <div className="cor-premium-actions cor-actions-no-primary">
          <button>&#8635; Atualizar</button>
          <button>&#8617; Sair</button>
        </div>
      </header>

      <section className="cor-dash-grid cor-dash-premium">
        <article className="cor-card cor-panel-alerts">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 1 &mdash; Pendencias acompanhadas</small>
              <p>Clientes e documentos que precisam de acao do analista ou retorno do corretor.</p>
            </div>
            <strong className="cor-urgent-pill">3 atencoes</strong>
          </div>
          <div className="cor-alert-list">
            {pendenciasModeloAnalista.map(([tone, nome, desc, prazo]) => (
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

        <article className="cor-card cor-panel-conversion">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 3 &mdash; Resumo operacional CCA</small>
              <p>Volume atual com CCA, encaminhados para conformidade e contratos ja assinados.</p>
            </div>
          </div>
          <div className="cca-flow-metrics">
            {resumoOperacionalCca.map(([label, total, desc]) => (
              <div key={label}>
                <span>{label}</span>
                <b>{total}</b>
                <small>{desc}</small>
              </div>
            ))}
          </div>
        </article>

        <div className="cor-sla-stack">
          <article className="cor-card cor-panel-sla">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 2 &mdash; SLA</small>
                <p>Tempo medio da carteira do analista comparado ao melhor SLA operacional.</p>
              </div>
            </div>
            <div className="cor-speed-premium">
              <div className="cor-speed-arc" />
              <div className="cor-speed-needle" />
              <span />
            </div>
            <div className="cor-sla-lines">
              <div><span>Melhor SLA documental</span><small>Referencia da operacao</small><b className="green">3h</b></div>
              <div><span>SLA atual do analista</span><small>Media de resposta da carteira</small><b className="orange">11h</b></div>
            </div>
          </article>
          <article className="cor-card cor-rework-card">
            <div className="cor-rework">
              <span className="cor-rework-icon">&#128296;</span>
              <span>Taxa de retrabalho</span>
              <b>3,2%</b>
            </div>
          </article>
        </div>
      </section>

      <section className="analyst-live-board">
        <header className="analyst-live-head">
          <div className="analyst-live-title">
            <div className="analyst-live-title-row">
              <h2>Fila Viva - Fluxo do Cliente</h2>
              <strong>20 processo(s)</strong>
              <strong>17 aguardando docs</strong>
              <strong>20 prioridade alta</strong>
            </div>
          </div>
          <div className="analyst-live-filters">
            <input placeholder="Reserva" />
            <input placeholder="Nome" />
            <input placeholder="Corretor" />
            <input placeholder="Gestor" />
            <select defaultValue="">
              <option value="">Status Caixa</option>
            </select>
            <select defaultValue="">
              <option value="">Status Agehab</option>
            </select>
            <select defaultValue="">
              <option value="">Produto</option>
            </select>
          </div>
        </header>

        <div className="analyst-live-list">
          {filaVivaCca.map((cliente) => {
            const detalheAberto = detalhesAbertos.includes(cliente.id);

            return (
              <article className={`analyst-live-card ${detalheAberto ? 'is-open' : ''}`} key={cliente.id}>
                <div className="analyst-live-main">
                  <div className="analyst-client-title">
                    <i />
                    <b>{cliente.produto}</b>
                    <h3>
                      <a href={`/cca/checklist?cliente=${encodeURIComponent(cliente.cliente)}&reserva=${cliente.id}&empreendimento=${encodeURIComponent(cliente.empreendimento)}&corretor=${encodeURIComponent(cliente.corretor)}&produto=${encodeURIComponent(cliente.produto)}&sinal=${encodeURIComponent(cliente.sinal)}&fiador=${encodeURIComponent(cliente.fiador)}&caixa=${encodeURIComponent(cliente.caixa)}&agehab=${encodeURIComponent(cliente.agehab)}&view=web-cca-v2`}>
                        {cliente.cliente}
                      </a>
                    </h3>
                  </div>
                  <p>{cliente.empreendimento}</p>
                  <p>{cliente.corretor}</p>
                  <div className="analyst-cca-line">
                    <span>CCA responsavel</span>
                    <em>{cliente.cca}</em>
                  </div>
                  <small>{cliente.prioridade}</small>
                </div>

                <div className="analyst-live-status">
                  <div>
                    <span>Comercial {cliente.comercial}</span>
                    <span>Credito {cliente.credito}</span>
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
                        <span>Proxima acao</span>
                        <h4>Atuar em Caixa: {cliente.caixa}</h4>
                        <p>{cliente.caixa}</p>
                        <p>Sem observacao registrada</p>
                      </section>
                    </div>

                    <section className="analyst-stage-card">
                      <div className="analyst-stage-head">
                        <b>Kit Caixa</b>
                        <strong>{cliente.caixa}</strong>
                      </div>
                      <div className="analyst-stage-line kit-caixa">
                        {['Reserva', 'Em Analise Credito', 'Emitindo Formularios', 'Formularios Em Assinatura', 'Formularios Assinados', 'Finalizado'].map((etapa, index) => (
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
                        <strong>N/A</strong>
                      </div>
                      <div className="analyst-stage-line kit-agehab">
                        {['Reserva', 'Em Analise Credito', 'Ficha emitida', 'Ficha Recebida', 'Em Validacao Agehab', 'Agehab Validada'].map((etapa, index) => (
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
                        <h4>Pendencias mapeadas</h4>
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
