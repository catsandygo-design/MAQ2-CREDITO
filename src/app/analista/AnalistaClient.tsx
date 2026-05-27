'use client';

import { useEffect, useState } from 'react';

type PendenciaTone = 'critico' | 'medio' | 'ok';
type PendenciaItem = [PendenciaTone, string, string, string];
type ResumoItem = [string, string, string];

interface FilaVivaItem {
  id: string;
  produto: string;
  cliente: string;
  empreendimento: string;
  corretor: string;
  cca: string;
  prioridade: string;
  comercial: string;
  credito: string;
  panorama: string;
  resumo: string;
  aging: string;
  slaCca: string;
  caixa: string;
  agehab: string;
  sinal: string;
  fiador: string;
  pendencias: string[];
  proximaAcao?: string;
  observacao?: string;
  caixaIndex?: number;
  agehabIndex?: number;
}

const caixaKeys = ['reserva', 'em_analise_credito', 'emitindo_formularios', 'formularios_em_assinatura', 'formularios_assinados', 'envio_conformidade'];
const caixaLabels = ['Reserva', 'Em Analise Credito', 'Emitindo Formularios', 'Formularios Em Assinatura', 'Formularios Assinados', 'Finalizado'];
const agehabKeys = ['reserva', 'em_analise_credito', 'ficha_emitida', 'ficha_recebida', 'em_validacao_agehab', 'agehab_validada'];
const agehabLabels = ['Reserva', 'Em Analise Credito', 'Ficha emitida', 'Ficha Recebida', 'Em Validacao Agehab', 'Agehab Validada'];

const pendenciasAnalista: PendenciaItem[] = [
  ['critico', 'MATHEUS ALVES', 'Extrato FGTS pendente de retorno do corretor', 'Hoje 17:00'],
  ['medio', 'ANA PAULA', 'Documento enviado aguardando abertura do analista', '12h'],
  ['medio', 'CARLOS HENRIQUE', 'Renda informal exige declaracao complementar', '24h'],
  ['ok', 'JOAO AMORIN', 'Kit documental aprovado para envio ao CCA', 'OK'],
];

const filaViva: FilaVivaItem[] = [
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

const resumoCarteira: ResumoItem[] = [
  ['Clientes em reserva', '42', 'processos ativos na carteira'],
  ['Finalizados', '18', 'kits aprovados ou enviados ao CCA'],
  ['Em pendencia', '9', 'dependem de ajuste documental'],
];

function statusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    reserva: 'Reserva',
    em_analise_credito: 'Em Analise Credito',
    emitindo_formularios: 'Emitindo Formularios',
    formularios_em_assinatura: 'Formularios Em Assinatura',
    formularios_assinados: 'Formularios Assinados',
    envio_conformidade: 'Envio a conformidade',
    ficha_emitida: 'Ficha emitida',
    ficha_recebida: 'Ficha Recebida',
    em_validacao_agehab: 'Em Validacao Agehab',
    agehab_validada: 'Agehab Validada',
  };
  return labels[status || ''] || status || 'Reserva';
}

function etapaClass(index: number, atual = 1) {
  if (index < atual) return 'done';
  if (index === atual) return 'current';
  return '';
}

function docLabel(key: string) {
  return key.replace(/-\d+$/g, '').replace(/\./g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function prazoLabel(valor?: string) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function processoToFila(processo: any): FilaVivaItem {
  const caixa = statusLabel(processo.caixa);
  const agehab = statusLabel(processo.agehab);
  const pendencias = Object.entries(processo?.pendencias || {}).map(([key, pendencia]: [string, any]) => (
    `${docLabel(key)}: ${pendencia?.descricao || 'Documento pendente'}${pendencia?.prazo ? ` | Prazo ${prazoLabel(pendencia.prazo)}` : ''}`
  ));
  const observacaoAnalista = processo?.observacao_analista ? [`Observacao do analista: ${processo.observacao_analista}`] : [];
  const listaPendencias = [...observacaoAnalista, ...pendencias];
  const pendenciasVisiveis = listaPendencias.length ? listaPendencias : [`Caixa: ${caixa}`, `Agehab: ${agehab}`];
  return {
    id: processo.reserva,
    produto: processo.produto || 'RD',
    cliente: processo.cliente || processo.reserva,
    empreendimento: processo.empreendimento || 'Kit Caixa | Kit Agehab',
    corretor: processo.corretor || '-',
    cca: '-',
    prioridade: processo.temDocumentoEnviado ? 'Documento enviado' : 'Aguardando documentos',
    comercial: processo.sla?.elapsed_label || '0m',
    credito: processo.sla?.elapsed_label || '0m',
    panorama: processo.caixa === 'emitindo_formularios' ? 'Pronto para CCA' : 'Em Processo',
    resumo: `Kit Caixa: ${caixa} | Kit Agehab: ${agehab}`,
    aging: processo.sla?.elapsed_label || '0m',
    slaCca: processo.sla?.elapsed_label || '0m',
    caixa,
    agehab,
    sinal: processo.sinal || 'Nao tem',
    fiador: processo.fiador || 'Nao tem',
    pendencias: pendenciasVisiveis,
    proximaAcao: listaPendencias.length ? 'Verificar retorno do analista' : `Acompanhar Caixa: ${caixa}`,
    observacao: listaPendencias[0] || 'Sem observacao registrada',
    caixaIndex: Math.max(0, caixaKeys.indexOf(processo.caixa || 'reserva')),
    agehabIndex: Math.max(0, agehabKeys.indexOf(processo.agehab || 'reserva')),
  };
}

interface AnalistaClientProps {
  initialProcessos?: any[];
}

export default function AnalistaClient({ initialProcessos = [] }: AnalistaClientProps) {
  const [detalhesAbertos, setDetalhesAbertos] = useState<string[]>([]);
  const [filaAnalista, setFilaAnalista] = useState<FilaVivaItem[]>(() => initialProcessos.map(processoToFila));
  const [carregouProcessos, setCarregouProcessos] = useState(false);

  useEffect(() => {
    fetch('/api/processos?destino=analista', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        const processos = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];
        setFilaAnalista(processos.map(processoToFila));
        setCarregouProcessos(true);
      })
      .catch(() => { setFilaAnalista([]); setCarregouProcessos(true); });
  }, []);

  const abrirTodos = () => setDetalhesAbertos(filaAnalista.map((cliente) => cliente.id));
  const fecharTodos = () => setDetalhesAbertos([]);
  const alternarDetalhe = (id: string) => {
    setDetalhesAbertos((abertos) => (
      abertos.includes(id) ? abertos.filter((item) => item !== id) : [...abertos, id]
    ));
  };
  const alertasAnalista = filaAnalista.flatMap((cliente) => (
    cliente.pendencias
      .filter((pendencia) => pendencia.toLowerCase().includes('pend') || pendencia.toLowerCase().includes('observacao') || pendencia.includes(':'))
      .map((pendencia) => ['critico', cliente.cliente, pendencia, cliente.slaCca] as PendenciaItem)
  ));
  const alertasAtuais = alertasAnalista.length ? alertasAnalista : carregouProcessos ? [] : [];
  const resumoCarteiraAtual: ResumoItem[] = [
    ['Clientes em reserva', String(filaAnalista.length), 'processos ativos na carteira'],
    ['Finalizados', String(filaAnalista.filter((cliente) => cliente.caixa.toLowerCase().includes('conformidade') || cliente.agehab.toLowerCase().includes('validada')).length), 'kits aprovados ou enviados ao CCA'],
    ['Em pendencia', String(alertasAtuais.length), 'dependem de ajuste documental'],
  ];

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
              <p>Clientes e documentos que precisam de acao do analista ou retorno do corretor.</p>
            </div>
            <strong className="cor-urgent-pill">{alertasAtuais.length} atencoes</strong>
          </div>
          <div className="cor-alert-list">
            {alertasAtuais.length ? alertasAtuais.map(([tone, nome, desc, prazo], index) => (
              <div className={`cor-alert-item cor-alert-${tone}`} key={`${nome}-${prazo}-${index}`}>
                <i />
                <div className="cor-alert-copy">
                  <b>{nome}</b>
                  <span>{desc}</span>
                </div>
                <em><small>Prazo</small>{prazo}</em>
              </div>
            )) : <div className="cor-alert-empty"><b>Sem pendências urgentes</b><span>Quando houver documento pendenciado, ele aparece aqui automaticamente.</span></div>}
          </div>
        </article>

        <article className="cor-card cor-panel-conversion">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 2 — Carteira em reserva</small>
                <p>Quantidade de clientes em reserva, finalizados e em pendencia documental.</p>
              </div>
            </div>
            <div className="cca-flow-metrics">
              {resumoCarteiraAtual.map(([label, total, desc]) => (
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
                <small>Dashboard 2 — SLA</small>
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
            <div className="analyst-live-title-row">
              <h2>Fila Viva - Fluxo do Cliente</h2>
              <strong>{filaAnalista.length} processo(s)</strong>
              <strong>{filaAnalista.length} aguardando docs</strong>
              <strong>{filaAnalista.length} prioridade alta</strong>
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
          {filaAnalista.map((cliente) => {
            const detalheAberto = detalhesAbertos.includes(cliente.id);
            const pendenciado = cliente.pendencias.some((pendencia) => pendencia.toLowerCase().includes('pend') || pendencia.includes(':'));
            const checklistUrl = `/analista/checklist?cliente=${encodeURIComponent(cliente.cliente)}&reserva=${cliente.id}`;

            return (
            <article className={`analyst-live-card ${detalheAberto ? 'is-open' : ''} ${pendenciado ? 'is-pending' : ''}`} key={cliente.id}>
              <div className="analyst-live-main">
                <div className="analyst-client-title">
                  <i />
                  <b>{cliente.produto}</b>
                  <h3>
                    <a href={checklistUrl}>
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
                {pendenciado ? <strong className="pending-warning">Pendenciado</strong> : null}
              </div>

              <div className="analyst-live-status">
                <div>
                  <span>Comercial {cliente.comercial}</span>
                  <span>Credito {cliente.credito}</span>
                </div>
                <button type="button" onClick={() => alternarDetalhe(cliente.id)}>
                  {detalheAberto ? 'Fechar detalhes' : 'Abrir detalhes'}
                </button>
                <a className="analyst-open-button" href={checklistUrl}>Abrir</a>
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
                      <h4>{cliente.proximaAcao || `Acompanhar Caixa: ${cliente.caixa}`}</h4>
                      <p>Caixa: {cliente.caixa}</p>
                      <p>Agehab: {cliente.agehab}</p>
                      <p>{cliente.observacao || 'Sem observacao registrada'}</p>
                    </section>
                  </div>

                  <section className={`analyst-stage-card ${(cliente.caixaIndex || 0) >= caixaLabels.length - 1 ? 'stage-complete' : ''}`}>
                    <div className="analyst-stage-head">
                      <b>Kit Caixa</b>
                      <strong>{cliente.caixa}</strong>
                    </div>
                    <div className="analyst-stage-line kit-caixa">
                      {caixaLabels.map((etapa, index) => (
                        <div className={etapaClass(index, cliente.caixaIndex)} key={etapa}>
                          <i />
                          <span>{etapa}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className={`analyst-stage-card analyst-repasse ${(cliente.agehabIndex || 0) >= agehabLabels.length - 1 ? 'stage-complete' : ''}`}>
                    <div className="analyst-stage-head">
                      <b>Kit Agehab</b>
                      <strong>{cliente.agehab}</strong>
                    </div>
                    <div className="analyst-stage-line kit-agehab">
                      {agehabLabels.map((etapa, index) => (
                        <div className={etapaClass(index, cliente.agehabIndex)} key={etapa}>
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

