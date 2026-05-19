'use client';

import { useMemo, useState } from 'react';

const clientes = [
  ['458712', 'Matheus Alves de Melo', 'pendencia documentacao', 'documentos pendenciados', 'pendente', 'nao tem', 'reserva ativa', '18h', '24h'],
  ['458713', 'Ana Paula Ribeiro', 'formularios disponiveis', 'ficha agehab liberada', 'pago', 'finalizado', 'aguardando envio', '6h', '12h'],
  ['458714', 'Carlos Henrique Souza', 'em validacao credito', 'em analise do credito', 'nao tem', 'nao tem', 'analise inicial', '22h', '36h'],
];

const alertas = [
  ['critico', 'MATHEUS ALVES', 'Analista: Bianca • Documento pendente: Extrato FGTS', 'Hoje 17:00'],
  ['medio', 'ANA CLARA', 'Analista: Douglas • Documento pendente: Ficha Agehab', '24h'],
  ['ok', 'JOAO PEDRO', 'Analista: CCA Central • Documento pendente: Assinatura MO', '48h'],
];

const taxaRetrabalho = 3.2;

function badge(status: string) {
  const s = status.toLowerCase();
  if (s.includes('pend')) return 'cor-badge cor-badge-danger';
  if (s.includes('pago') || s.includes('finalizado') || s.includes('liberada')) return 'cor-badge cor-badge-ok';
  if (s.includes('analise') || s.includes('validacao') || s.includes('aguardando')) return 'cor-badge cor-badge-warn';
  return 'cor-badge cor-badge-info';
}

function retrabalhoClass(value: number) {
  if (value <= 2) return 'cor-rework cor-rework-ok';
  if (value <= 4) return 'cor-rework cor-rework-warn';
  return 'cor-rework cor-rework-danger';
}

export default function AcompanhamentoCorretorPage() {
  const [detalhesAbertos, setDetalhesAbertos] = useState<string[]>([]);
  const [filtros, setFiltros] = useState({
    reserva: '',
    nome: '',
    corretor: '',
    gestor: '',
    caixa: '',
    agehab: '',
    produto: '',
  });

  const alternarDetalhe = (id: string) => {
    setDetalhesAbertos((abertos) => (
      abertos.includes(id) ? abertos.filter((item) => item !== id) : [...abertos, id]
    ));
  };

  const telemetria = clientes.map(([id, cliente, caixa, agehab, sinal, fiador, momento, slaCliente, prazo]) => ({
    id,
    produto: 'RD',
    cliente,
    empreendimento: 'Kit Caixa | Kit Agehab',
    corretor: 'Corretor responsavel',
    cca: 'Gestor carteira',
    prioridade: 'Prioridade alta',
    comercial: prazo,
    credito: slaCliente,
    panorama: momento,
    resumo: `${caixa} | ${agehab}`,
    aging: prazo,
    slaCca: slaCliente,
    caixa,
    agehab,
    sinal,
    fiador,
    pendencias: [`Caixa: ${caixa}`, `Agehab: ${agehab}`],
  }));

  const filaFiltrada = useMemo(() => {
    const normalizar = (valor: string) => valor.trim().toLowerCase();
    const reserva = normalizar(filtros.reserva);
    const nome = normalizar(filtros.nome);
    const corretor = normalizar(filtros.corretor);
    const gestor = normalizar(filtros.gestor);
    const caixa = normalizar(filtros.caixa);
    const agehab = normalizar(filtros.agehab);
    const produto = normalizar(filtros.produto);

    return telemetria.filter((cliente) => (
      (!reserva || cliente.id.toLowerCase().includes(reserva)) &&
      (!nome || cliente.cliente.toLowerCase().includes(nome)) &&
      (!corretor || cliente.corretor.toLowerCase().includes(corretor)) &&
      (!gestor || cliente.cca.toLowerCase().includes(gestor)) &&
      (!caixa || cliente.caixa.toLowerCase() === caixa) &&
      (!agehab || cliente.agehab.toLowerCase() === agehab) &&
      (!produto || cliente.produto.toLowerCase() === produto)
    ));
  }, [filtros, telemetria]);

  return (
    <main className="cor-page cor-page-premium" data-layout-version="dashboards-compactos-v2">
      <header className="cor-premium-top">
        <div className="cor-premium-title">
          <span className="cor-chart-icon">↗</span>
          <div>
            <h1>Acompanhamento do Corretor</h1>
            <p>Tela inicial do corretor com alertas, SLA de entrega de documentos e evolucao das reservas ate o repasse.</p>
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
              <small>Dashboard 1 — Alertas</small>
              <p>Analista de credito, cliente, documento pendente e prazo de entrega.</p>
            </div>
            <strong className="cor-urgent-pill">3 urgentes</strong>
          </div>
          <div className="cor-alert-list">
            {alertas.map(([tone, nome, desc, prazo]) => (
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
          <div className={retrabalhoClass(taxaRetrabalho)}>
            <span className="cor-rework-icon">🔨</span>
            <span>Taxa de retrabalho</span>
            <b>{taxaRetrabalho.toFixed(1).replace('.', ',')}%</b>
          </div>
        </article>
        </div>

        <article className="cor-card cor-panel-conversion">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 3 — Reservas x Repasses</small>
              <p>Quantidade de clientes em reserva comparada aos clientes repassados.</p>
            </div>
          </div>
          <div className="cor-mini-metrics">
            <div><span>Clientes em reserva</span><b>42</b><small>processos ativos</small></div>
            <div><span>Clientes repassados</span><b>18</b><small>vendas repassadas</small></div>
          </div>
          <div className="cor-conversion-bar"><span>Taxa de conversao</span><b>42,9%</b></div>
        </article>
      </section>

      <section className="analyst-live-board">
        <header className="analyst-live-head">
          <div className="analyst-live-title-row">
            <h2>Fila Viva - Fluxo do Cliente</h2>
            <strong>20 processo(s)</strong>
            <strong>17 aguardando docs</strong>
            <strong>20 prioridade alta</strong>
          </div>
          <div className="analyst-live-filters">
            <input value={filtros.reserva} onChange={(event) => setFiltros((atual) => ({ ...atual, reserva: event.target.value }))} placeholder="Reserva" />
            <input value={filtros.nome} onChange={(event) => setFiltros((atual) => ({ ...atual, nome: event.target.value }))} placeholder="Nome" />
            <input value={filtros.corretor} onChange={(event) => setFiltros((atual) => ({ ...atual, corretor: event.target.value }))} placeholder="Corretor" />
            <input value={filtros.gestor} onChange={(event) => setFiltros((atual) => ({ ...atual, gestor: event.target.value }))} placeholder="Gestor" />
            <select value={filtros.caixa} onChange={(event) => setFiltros((atual) => ({ ...atual, caixa: event.target.value }))} aria-label="Status Caixa">
              <option value="">Status Caixa</option>
              <option value="pendencia documentacao">Pendencia documentacao</option>
              <option value="formularios disponiveis">Formularios disponiveis</option>
              <option value="em validacao credito">Em validacao credito</option>
            </select>
            <select value={filtros.agehab} onChange={(event) => setFiltros((atual) => ({ ...atual, agehab: event.target.value }))} aria-label="Status Agehab">
              <option value="">Status Agehab</option>
              <option value="documentos pendenciados">Documentos pendenciados</option>
              <option value="ficha agehab liberada">Ficha Agehab liberada</option>
              <option value="em analise do credito">Em analise do credito</option>
            </select>
            <select value={filtros.produto} onChange={(event) => setFiltros((atual) => ({ ...atual, produto: event.target.value }))} aria-label="Produto">
              <option value="">Produto</option>
              <option value="rd">RD</option>
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
                    <span>Gestor</span>
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
                          <b className="danger">SLA {cliente.slaCca}</b>
                        </div>
                      </section>
                      <section className="analyst-detail-box analyst-next-action">
                        <span>Proxima acao</span>
                        <h4>Atuar em Caixa: {cliente.caixa}</h4>
                        <p>Caixa: {cliente.caixa}</p>
                        <p>Agehab: {cliente.agehab}</p>
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
