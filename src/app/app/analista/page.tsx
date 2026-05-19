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
  const [filtros, setFiltros] = useState({
    reserva: '',
    nome: '',
    corretor: '',
    gestor: '',
    caixa: '',
    agehab: '',
    produto: '',
  });

  const filaFiltrada = useMemo(() => {
    const normalizar = (valor: string) => valor.trim().toLowerCase();
    const reserva = normalizar(filtros.reserva);
    const nome = normalizar(filtros.nome);
    const corretor = normalizar(filtros.corretor);
    const gestor = normalizar(filtros.gestor);
    const caixa = normalizar(filtros.caixa);
    const agehab = normalizar(filtros.agehab);
    const produto = normalizar(filtros.produto);

    return filaViva.filter((cliente) => (
      (!reserva || cliente.id.toLowerCase().includes(reserva)) &&
      (!nome || cliente.cliente.toLowerCase().includes(nome)) &&
      (!corretor || cliente.corretor.toLowerCase().includes(corretor)) &&
      (!gestor || cliente.cca.toLowerCase().includes(gestor)) &&
      (!caixa || cliente.caixa.toLowerCase() === caixa) &&
      (!agehab || cliente.agehab.toLowerCase() === agehab) &&
      (!produto || cliente.produto.toLowerCase() === produto)
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
          <div className="analyst-live-title">
            <h2>Fila Viva - Fluxo do Cliente</h2>
          </div>
          <div className="analyst-live-summary">
            <strong>20 processo(s)</strong>
            <strong>17 aguardando docs</strong>
            <strong>20 prioridade alta</strong>
          </div>
          <div className="analyst-live-filters">
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
            <input
              value={filtros.gestor}
              onChange={(event) => setFiltros((atual) => ({ ...atual, gestor: event.target.value }))}
              placeholder="Gestor"
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
            <select
              value={filtros.produto}
              onChange={(event) => setFiltros((atual) => ({ ...atual, produto: event.target.value }))}
              aria-label="Produto"
            >
              <option value="">Produto</option>
              <option value="rd">RD</option>
            </select>
          </div>
        </header>

        <div className="analyst-live-table-wrap">
          <table className="analyst-live-table">
            <thead>
              <tr>
                <th>Reserva</th>
                <th>Nome</th>
                <th>Corretor</th>
                <th>Status Cal</th>
                <th>Status Ag</th>
                <th>Produto</th>
                <th>Prioridade</th>
                <th>Documentos</th>
              </tr>
            </thead>
            <tbody>
              {filaFiltrada.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.id}</td>
                  <td><strong>{cliente.cliente}</strong></td>
                  <td>{cliente.corretor}</td>
                  <td><span className="analyst-table-pill warn">{cliente.caixa}</span></td>
                  <td><span className="analyst-table-pill warn">{cliente.agehab}</span></td>
                  <td><span className="analyst-table-pill info">{cliente.produto}</span></td>
                  <td><span className="analyst-table-pill danger">{cliente.prioridade}</span></td>
                  <td>{cliente.resumo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
