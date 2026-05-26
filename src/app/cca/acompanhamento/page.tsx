'use client';

import { useEffect, useState } from 'react';

type PendenciaTone = 'critico' | 'medio' | 'ok';
type PendenciaItem = [PendenciaTone, string, string, string];
type ResumoItem = [string, string, string];

interface FilaVivaCcaItem {
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

const pendenciasModeloAnalista: PendenciaItem[] = [
  ['critico', 'MATHEUS ALVES', 'Extrato FGTS pendente de retorno do corretor', 'Hoje 17:00'],
  ['medio', 'ANA PAULA', 'Documento enviado aguardando abertura do analista', '12h'],
  ['medio', 'CARLOS HENRIQUE', 'Renda informal exige declaracao complementar', '24h'],
  ['ok', 'JOAO AMORIN', 'Kit documental aprovado para envio ao CCA', 'OK'],
];

const resumoOperacionalCca: ResumoItem[] = [
  ['Com o CCA', '31', 'processos ativos'],
  ['Para conformidade', '18', 'encaminhados'],
  ['Assinados', '9', 'minutas assinadas'],
];

const filaVivaCca: FilaVivaCcaItem[] = [
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

function processoToFilaCca(processo: any): FilaVivaCcaItem {
  const caixa = statusLabel(processo.caixa);
  const agehab = statusLabel(processo.agehab);
  const pendencias = Object.entries(processo?.pendencias || {}).map(([key, pendencia]: [string, any]) => (
    `${docLabel(key)}: ${pendencia?.descricao || 'Documento pendente'}${pendencia?.prazo ? ` | Prazo ${prazoLabel(pendencia.prazo)}` : ''}`
  ));
  const listaPendencias = pendencias.length ? pendencias : [caixa];
  return {
    id: processo.reserva,
    produto: processo.produto || 'RD',
    cliente: processo.cliente || processo.reserva,
    empreendimento: processo.empreendimento || 'Kit Caixa | Kit Agehab',
    corretor: processo.corretor || '-',
    cca: 'CCA',
    prioridade: 'EMITIR FORMULARIOS',
    comercial: processo.sla?.elapsed_label || '0m',
    credito: processo.sla?.elapsed_label || '0m',
    panorama: 'Em Processo',
    resumo: 'Processo liberado pelo analista para emissao de formularios.',
    aging: processo.sla?.elapsed_label || '0m',
    slaCca: processo.sla?.elapsed_label || '0m',
    caixa,
    agehab,
    sinal: processo.sinal || 'Nao tem',
    fiador: processo.fiador || 'Nao tem',
    pendencias: listaPendencias,
    proximaAcao: pendencias.length ? 'Corrigir documento pendenciado' : `Acompanhar Caixa: ${caixa}`,
    observacao: pendencias[0] || 'Sem observacao registrada',
    caixaIndex: Math.max(0, caixaKeys.indexOf(processo.caixa || 'reserva')),
    agehabIndex: Math.max(0, agehabKeys.indexOf(processo.agehab || 'reserva')),
  };
}

function checklistCcaUrl(cliente: FilaVivaCcaItem) {
  const params = new URLSearchParams({
    reserva: cliente.id,
    cliente: cliente.cliente,
    empreendimento: cliente.empreendimento,
    corretor: cliente.corretor,
    produto: cliente.produto,
    sinal: cliente.sinal,
    fiador: cliente.fiador,
    caixa: cliente.caixa,
    agehab: cliente.agehab,
    view: 'web-cca-v2',
  });

  return `/cca/checklist?${params.toString()}`;
}

export default function CcaAcompanhamentoPage() {
  const [detalhesAbertos, setDetalhesAbertos] = useState<string[]>([]);
  const [filaCca, setFilaCca] = useState<FilaVivaCcaItem[]>([]);
  const [carregouProcessos, setCarregouProcessos] = useState(false);
  const [atualizacaoDisponivel, setAtualizacaoDisponivel] = useState(false);

  const carregarProcessos = () => {
    fetch('/api/processos?destino=cca', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        const processos = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];
        setFilaCca(processos.map(processoToFilaCca));
        setCarregouProcessos(true);
        setAtualizacaoDisponivel(false);
      })
      .catch(() => { setFilaCca([]); setCarregouProcessos(true); });
  };

  useEffect(() => {
    carregarProcessos();
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'siocred_status_update') setAtualizacaoDisponivel(true);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const abrirTodos = () => setDetalhesAbertos(filaCca.map((cliente) => cliente.id));
  const fecharTodos = () => setDetalhesAbertos([]);
  const alternarDetalhe = (id: string) => {
    setDetalhesAbertos((abertos) => (
      abertos.includes(id) ? abertos.filter((item) => item !== id) : [...abertos, id]
    ));
  };

  const resumoOperacionalAtual: ResumoItem[] = [
    ['Com o CCA', String(filaCca.length), 'cadastros recebidos'],
    [
      'Para conformidade',
      String(filaCca.filter((cliente) => cliente.caixa.toLowerCase().includes('conformidade')).length),
      'enviados',
    ],
    [
      'Em pendencia',
      String(filaCca.filter((cliente) => (
        cliente.caixa.toLowerCase().includes('pend') ||
        cliente.agehab.toLowerCase().includes('pend') ||
        cliente.pendencias.some((pendencia) => pendencia.toLowerCase().includes('pend'))
      )).length),
      'aguardando ajuste',
    ],
  ];
  const alertasCca: PendenciaItem[] = filaCca.flatMap((cliente) => (
    cliente.pendencias
      .filter((pendencia) => pendencia.toLowerCase().includes('pend') || pendencia.includes(':'))
      .map((pendencia) => ['critico', cliente.cliente, pendencia, cliente.slaCca] as PendenciaItem)
  ));
  const alertasAtuais = alertasCca.length ? alertasCca : carregouProcessos ? [] : [];

  return (
    <main className="cor-page cor-page-premium" data-layout-version="analista-dashboards-v1">
      <header className="cor-premium-top">
        <div className="cor-premium-title">
          <span className="cor-chart-icon">&uarr;</span>
          <div>
            <h1>Painel CCA</h1>
            <p>Gestao documental, pendencias de credito, SLA da carteira e telemetria dos processos em reserva.</p>
          </div>
        </div>
        <div className="cor-premium-actions cor-actions-no-primary">
          <button type="button" onClick={carregarProcessos}>{atualizacaoDisponivel ? '↻ Atualização disponível' : '↻ Atualizar'}</button>
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
            <strong className="cor-urgent-pill">{alertasAtuais.length} atencoes</strong>
          </div>
          <div className="cor-alert-list">
            {alertasAtuais.length ? alertasAtuais.map(([tone, nome, desc, prazo]) => (
              <div className={`cor-alert-item cor-alert-${tone}`} key={nome}>
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
              <small>Dashboard 3 &mdash; Resumo operacional CCA</small>
              <p>Volume atual com CCA, encaminhados para conformidade e contratos ja assinados.</p>
            </div>
          </div>
          <div className="cca-flow-metrics">
            {resumoOperacionalAtual.map(([label, total, desc]) => (
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
              <strong>{filaCca.length} processo(s)</strong>
              <strong>{filaCca.length} com formularios</strong>
              <strong>{filaCca.length} prioridade alta</strong>
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
          {filaCca.map((cliente) => {
            const detalheAberto = detalhesAbertos.includes(cliente.id);
            const pendenciado = cliente.pendencias.some((pendencia) => pendencia.toLowerCase().includes('pend') || pendencia.includes(':'));

            return (
              <article className={`analyst-live-card ${detalheAberto ? 'is-open' : ''} ${pendenciado ? 'is-pending' : ''}`} key={cliente.id}>
                <div className="analyst-live-main">
                  <div className="analyst-client-title">
                    <i />
                    <b>{cliente.produto}</b>
                    <h3>
                      <a href={checklistCcaUrl(cliente)}>
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
                  <a className="analyst-open-button" href={checklistCcaUrl(cliente)}>Abrir</a>
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

