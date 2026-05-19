'use client';

import { useMemo, useState } from 'react';

const pendenciasAnalista = [
  ['critico', 'MATHEUS ALVES', 'Analista: Bianca • Documento pendente: Extrato FGTS', 'Hoje 17:00'],
  ['medio', 'ANA CLARA', 'Analista: Douglas • Documento pendente: Ficha Agehab', '24h'],
  ['ok', 'JOAO PEDRO', 'Analista: CCA Central • Documento pendente: Assinatura MO', '48h'],
];

const filaViva = [
  {
    id: '458712',
    produto: 'RD',
    cliente: 'EVERSON LOURENCO PEREIRA DA SILVA',
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
    sinal: 'Nao tem',
    fiador: 'Nao tem',
    pendencias: ['Caixa: Analise Credito', 'Agehab: Analise Credito'],
  },
  {
    id: '458713',
    produto: 'RD',
    cliente: 'KHETLLEN GERMANO DA SILVA',
    empreendimento: 'AGL032 - Vila Margarida - Receitas de Incorporacao',
    corretor: 'joao andrade',
    cca: '-',
    prioridade: 'Prioridade alta',
    comercial: '27 dias',
    credito: '8 dias',
    panorama: 'Em Processo',
    resumo: 'Kit Caixa | Kit Agehab. Documentos pendentes: 18 de 36',
    aging: '82 dias',
    slaCca: '8 dias',
    caixa: 'Analise Credito',
    agehab: 'Analise Credito',
    sinal: 'Nao tem',
    fiador: 'Nao tem',
    pendencias: ['Caixa: Analise Credito', 'Agehab: Analise Credito'],
  },
  {
    id: '458714',
    produto: 'RD',
    cliente: 'ELIEZIO ALVES DO CARMO',
    empreendimento: 'AGL030 - Vila Girassol',
    corretor: 'leticia brito',
    cca: '-',
    prioridade: 'Prioridade alta',
    comercial: '23 dias',
    credito: '5 dias',
    panorama: 'Em Processo',
    resumo: 'Kit Caixa | Kit Agehab. Documentos pendentes: 12 de 36',
    aging: '64 dias',
    slaCca: '5 dias',
    caixa: 'Analise Credito',
    agehab: 'Analise Credito',
    sinal: 'Nao tem',
    fiador: 'Nao tem',
    pendencias: ['Caixa: Analise Credito'],
  },
  {
    id: '458715',
    produto: 'RD',
    cliente: 'JOAO AMORIN',
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
    caixa: 'Analise Credito',
    agehab: 'Analise Credito',
    sinal: 'Nao tem',
    fiador: 'Nao tem',
    pendencias: ['Caixa: Analise Credito'],
  },
];

const resumoCarteira = [
  ['Clientes em reserva', '42', 'processos ativos na carteira'],
  ['Finalizados', '18', 'kits aprovados ou enviados ao CCA'],
  ['Em pendencia', '9', 'dependem de ajuste documental'],
];

export default function AppAnalistaPage() {
  const [detalhesAbertos, setDetalhesAbertos] = useState<string[]>([]);
  const [filtros, setFiltros] = useState({
    reserva: '',
    nome: '',
    corretor: '',
    caixa: '',
    agehab: '',
  });

  const alternarDetalhe = (id: string) => {
    setDetalhesAbertos((abertos) => (
      abertos.includes(id) ? abertos.filter((item) => item !== id) : [...abertos, id]
    ));
  };

  const filaFiltrada = useMemo(() => {
    const normalizar = (valor: string) => valor.trim().toLowerCase();
    const reserva = normalizar(filtros.reserva);
    const nome = normalizar(filtros.nome);
    const corretor = normalizar(filtros.corretor);
    const caixa = normalizar(filtros.caixa);
    const agehab = normalizar(filtros.agehab);

    return filaViva.filter((cliente) => (
      (!reserva || cliente.id.toLowerCase().includes(reserva)) &&
      (!nome || cliente.cliente.toLowerCase().includes(nome)) &&
      (!corretor || cliente.corretor.toLowerCase().includes(corretor)) &&
      (!caixa || cliente.caixa.toLowerCase() === caixa) &&
      (!agehab || cliente.agehab.toLowerCase() === agehab)
    ));
  }, [filtros]);

  return (
    <main className="cor-page cor-page-premium" data-layout-version="analista-dashboards-v1">
      <header className="cor-premium-top">
        <div className="cor-premium-title">
          <span className="cor-chart-icon">↗</span>
          <div>
            <h1>Painel do Analista</h1>
            <p>Gestao documental, pendencias de credito, SLA da carteira e telemetria dos processos em reserva.</p>
          </div>
        </div>
        <div className="cor-premium-actions cor-actions-no-primary">
          <button>↻ Atualizar</button>
          <button>↪ Sair</button>
        </div>
      </header>

      <section className="cor-dash-grid cor-dash-premium">
        <article className="cor-card cor-panel-alerts">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 1 — Pendencias acompanhadas</small>
              <p>Analista de credito, cliente, documento pendente e prazo de entrega.</p>
            </div>
            <strong className="cor-urgent-pill">3 urgentes</strong>
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

        <div className="cor-sla-stack">
          <article className="cor-card cor-panel-sla">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 2 — Carteira em reserva</small>
                <p>Quantidade de clientes em reserva, finalizados e em pendencia documental.</p>
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
        </div>

        <div className="cor-sla-stack analista-sla-rework-stack">
          <article className="cor-card cor-panel-sla">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 2 — SLA</small>
              </div>
            </div>
            <div className="cor-speed-premium">
              <div className="cor-speed-arc" />
              <div className="cor-speed-needle" />
              <span />
            </div>
            <div className="cor-sla-lines">
              <div><span>Melhor SLA de entrega</span><small>Referencia da carteira</small><b className="green">3h</b></div>
              <div><span>SLA atual do corretor</span><small>Media de resposta as pendencias</small><b className="orange">14h</b></div>
            </div>
          </article>
          <article className="cor-card cor-rework-card">
            <div className="cor-rework cor-rework-warn">
              <span className="cor-rework-icon">🔨</span>
              <span>Taxa de retrabalho</span>
              <b>3,2%</b>
            </div>
          </article>
        </div>
      </section>

      <section className="analyst-live-board">
        <header className="analyst-live-head">
          <div>
            <span>Fila viva</span>
            <h2>Fluxo do cliente</h2>
          </div>
          <div className="analyst-live-actions analyst-live-filters">
            <strong>20 processo(s)</strong>
            <strong>17 aguardando docs</strong>
            <strong>20 prioridade alta</strong>
            <input
              value={filtros.reserva}
              onChange={(event) => setFiltros((atual) => ({ ...atual, reserva: event.target.value }))}
              placeholder="Reserva"
            />
            <input
              value={filtros.nome}
              onChange={(event) => setFiltros((atual) => ({ ...atual, nome: event.target.value }))}
              placeholder="Nome"
            />
            <input
              value={filtros.corretor}
              onChange={(event) => setFiltros((atual) => ({ ...atual, corretor: event.target.value }))}
              placeholder="Corretor"
            />
            <select
              value={filtros.caixa}
              onChange={(event) => setFiltros((atual) => ({ ...atual, caixa: event.target.value }))}
              aria-label="Status Caixa"
            >
              <option value="">Status Caixa</option>
              <option value="analise credito">Analise Credito</option>
            </select>
            <select
              value={filtros.agehab}
              onChange={(event) => setFiltros((atual) => ({ ...atual, agehab: event.target.value }))}
              aria-label="Status Agehab"
            >
              <option value="">Status Agehab</option>
              <option value="analise credito">Analise Credito</option>
            </select>
          </div>
        </header>

        <div className="analyst-live-list">
          {filaFiltrada.map((cliente) => {
            const detalheAberto = detalhesAbertos.includes(cliente.id);

            return (
            <article className={`analyst-live-card ${detalheAberto ? 'is-open' : ''}`} key={cliente.id}>
              <div className="analyst-live-main">
                <div className="analyst-client-title">
                  <i />
                  <b>{cliente.produto}</b>
                  <h3>{cliente.cliente}</h3>
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
                      <h4>Atuar em Caixa: Analise Credito</h4>
                      <p>Caixa: Analise Credito</p>
                      <p>Sem observacao registrada</p>
                    </section>
                  </div>

                  <section className="analyst-stage-card">
                    <div className="analyst-stage-head">
                      <b>Kit Caixa</b>
                      <strong>Em Analise Credito</strong>
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
                      <strong>Em Analise Credito</strong>
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
