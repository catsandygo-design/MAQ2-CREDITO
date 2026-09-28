

import { useEffect, useState } from 'react';
import { subscribeProcessoChanges } from '@/lib/api/events';
import { apiUrl } from '@/lib/api/proxy';
import { classeRetrabalho, metricasOperacionais, type DiagnosticoGargalo } from '@/lib/metrics/processos';
import { pendenciaResolvida, tonePrazoPendencia, type PendenciaTone } from '@/lib/prazo-pendencia';

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
  hasPendencia: boolean;
  proximaAcao?: string;
  observacao?: string;
  caixaIndex?: number;
  agehabIndex?: number;
}

const caixaKeys = ['reserva', 'em_analise_credito', 'emitindo_formularios', 'formularios_em_assinatura', 'formularios_assinados', 'envio_conformidade'];
const caixaLabels = ['Recebido', 'Conferência', 'Emitir Formulários', 'Formulários Anexos', 'Formulários Assinados', 'Envio Conformidade'];
const agehabKeys = ['reserva', 'em_analise_credito', 'ficha_emitida', 'ficha_recebida', 'em_validacao_agehab', 'agehab_validada'];
const agehabLabels = ['Reserva', 'Em Analise Credito', 'Ficha emitida', 'Ficha Recebida', 'Em Validacao Agehab', 'Agehab Validada'];

const resumoOperacionalCca: ResumoItem[] = [
  ['Com o CCA', '31', 'processos ativos'],
  ['Para conformidade', '18', 'encaminhados'],
  ['Assinados', '9', 'minutas assinadas'],
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

function historicoPendencias(processo: any) {
  return [...(processo?.pendenciasHistorico || [])]
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .map((item: any) => {
      const quando = prazoLabel(item.created_at);
      const evento = item.evento === 'tratada' ? `Tratada${item.status_documento ? ` (${item.status_documento})` : ''}` : 'Criada';
      const prazo = item.prazo ? ` | Prazo ${prazoLabel(item.prazo)}` : '';
      const ator = item.origem ? ` por ${item.origem}` : '';
      return `${evento}${ator}${quando ? ` em ${quando}` : ''} - ${docLabel(item.documento_key)}: ${item.descricao || 'Pendencia registrada'}${prazo}`;
    });
}

function alertasPendencias(processos: any[]): PendenciaItem[] {
  return processos.flatMap((processo) => {
    const observacaoAnalista = processo?.observacao_analista
      ? [[
        'medio',
        processo?.cliente || processo?.reserva || 'Cliente',
        `Observacao do analista: ${processo.observacao_analista}`,
        prazoLabel(processo?.updated_at) || '-',
      ] as PendenciaItem]
      : [];

    const pendencias = Object.entries(processo?.pendencias || {})
      .filter(([key, pendencia]: [string, any]) => Boolean(pendencia?.descricao || pendencia?.prazo) && !pendenciaResolvida(processo?.documentos?.[key]))
      .map(([key, pendencia]: [string, any]) => ([
        tonePrazoPendencia(pendencia),
        processo?.cliente || processo?.reserva || 'Cliente',
        `${docLabel(key)}: ${pendencia?.descricao || 'Documento pendente'}`,
        prazoLabel(pendencia?.prazo || pendencia?.updated_at) || '-',
      ] as PendenciaItem));

    return [...observacaoAnalista, ...pendencias];
  });
}

function processoToFilaCca(processo: any): FilaVivaCcaItem {
  const caixa = statusLabel(processo.caixa);
  const agehab = statusLabel(processo.agehab);
  const pendencias = Object.entries(processo?.pendencias || {})
    .filter(([key, pendencia]: [string, any]) => Boolean(pendencia?.descricao || pendencia?.prazo) && !pendenciaResolvida(processo?.documentos?.[key]))
    .map(([key, pendencia]: [string, any]) => (
      `${docLabel(key)}: ${pendencia?.descricao || 'Documento pendente'}${pendencia?.prazo ? ` | Prazo ${prazoLabel(pendencia.prazo)}` : ''}`
    ));
  const observacaoAnalista = processo?.observacao_analista ? [`Observacao do analista: ${processo.observacao_analista}`] : [];
  const historico = historicoPendencias(processo);
  const listaPendencias = [...observacaoAnalista, ...(historico.length ? historico : pendencias)];
  const pendenciasVisiveis = listaPendencias.length ? listaPendencias : [caixa];
  return {
    id: processo.reserva,
    produto: processo.produto || 'RD',
    cliente: processo.cliente || processo.reserva,
    empreendimento: processo.empreendimento || 'Kit Caixa | Kit Agehab',
    corretor: processo.corretor || '-',
    cca: processo.cca_vinculado || 'CCA',
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
    pendencias: pendenciasVisiveis,
    hasPendencia: listaPendencias.length > 0,
    proximaAcao: listaPendencias.length ? 'Verificar retorno do analista' : `Acompanhar Caixa: ${caixa}`,
    observacao: listaPendencias[0] || 'Sem observacao registrada',
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
    origem: 'cca',
  });

  return `/cca/checklist?${params.toString()}`;
}

export default function CcaAcompanhamentoPage() {
  const [detalhesAbertos, setDetalhesAbertos] = useState<string[]>([]);
  const [filaCca, setFilaCca] = useState<FilaVivaCcaItem[]>([]);
  const [carregouProcessos, setCarregouProcessos] = useState(false);
  const [processosRaw, setProcessosRaw] = useState<any[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoGargalo[]>([]);
  const [atualizacaoDisponivel, setAtualizacaoDisponivel] = useState(false);

  const carregarProcessos = () => {
    fetch(apiUrl('/api/processos?destino=cca'), { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        const processos = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];
        setProcessosRaw(processos);
        setFilaCca(processos.map(processoToFilaCca));
        setCarregouProcessos(true);
        setAtualizacaoDisponivel(false);
      })
      .catch(() => { setProcessosRaw([]); setFilaCca([]); setCarregouProcessos(true); });
    fetch(apiUrl('/api/processos/diagnosticos/gargalos'), { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setDiagnosticos(Array.isArray(data) ? data : []))
      .catch(() => setDiagnosticos([]));
  };

  useEffect(() => {
    carregarProcessos();
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'siocred_status_update') setAtualizacaoDisponivel(true);
    };
    window.addEventListener('storage', onStorage);
    const unsubscribe = subscribeProcessoChanges(() => setAtualizacaoDisponivel(true));
    return () => {
      window.removeEventListener('storage', onStorage);
      unsubscribe();
    };
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
        cliente.hasPendencia
      )).length),
      'aguardando ajuste',
    ],
  ];
  const alertasCca: PendenciaItem[] = alertasPendencias(processosRaw);
  const alertasAtuais = alertasCca.length ? alertasCca : carregouProcessos ? [] : [];
  const metricas = metricasOperacionais(processosRaw, diagnosticos);

  return (
    <main className="cor-page cor-page-premium min-h-screen overflow-x-hidden" data-layout-version="analista-dashboards-v1" data-page="cca">
      <header className="cor-premium-top relative z-[1] mx-auto flex w-full max-w-[1760px] items-center justify-between gap-3">
        <div className="cor-premium-title flex min-w-0 items-start gap-3">
          <span className="cor-chart-icon">&uarr;</span>
          <div>
            <h1>Painel CCA</h1>
            <p>Gestao documental, pendencias de credito, SLA da carteira e telemetria dos processos em reserva.</p>
          </div>
        </div>
        <div className="cor-premium-actions cor-actions-no-primary flex flex-wrap justify-end gap-2">
          <button type="button" onClick={carregarProcessos}>{atualizacaoDisponivel ? 'Atualizacao disponivel' : 'Atualizar'}</button>
          <button>&#8617; Sair</button>
        </div>
      </header>

      <section className="cor-dash-grid cor-dash-premium relative z-[1] mx-auto grid w-full max-w-[1760px] gap-[18px]">
        <article className="cor-card cor-panel-alerts relative flex flex-col overflow-hidden bg-white text-slate-900">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 1 &mdash; Pendencias acompanhadas</small>
            </div>
            <strong className="cor-urgent-pill">{alertasAtuais.length} atencoes</strong>
          </div>
          <div className="cor-alert-list">
            {alertasAtuais.length ? alertasAtuais.map(([tone, nome, desc, prazo], index) => (
              <div className={`cor-alert-item cor-alert-${tone}`} key={`${nome}-${prazo}-${index}`} title={desc}>
                <i />
                <div className="cor-alert-copy">
                  <b>{nome}</b>
                  <span>{desc}</span>
                </div>
                <em><small>Prazo</small>{prazo}</em>
              </div>
            )) : <div className="cor-alert-empty"><b>Sem pendencias urgentes</b><span>Quando houver documento pendenciado, ele aparece aqui automaticamente.</span></div>}
          </div>
        </article>

        <article className="cor-card cor-panel-conversion relative flex flex-col overflow-hidden bg-white text-slate-900">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 2 - Resumo operacional CCA</small>
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
          <article className="cor-card cor-panel-sla relative flex flex-col overflow-hidden bg-white text-slate-900">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 3 - SLA</small>
              </div>
            </div>
            <div className="cor-speed-premium">
              <div className="cor-speed-arc" />
              <div className="cor-speed-needle" style={{ transform: `translateX(-50%) rotate(${metricas.slaNeedleAngle}deg)` }} />
              <span />
            </div>
            <div className="cor-sla-lines">
              <div><span>Melhor SLA documental</span><small>Referencia da operacao</small><b className="green">{metricas.melhorSla}</b></div>
              <div><span>SLA atual do analista</span><small>Media de resposta da carteira</small><b className="orange">{metricas.mediaSla}</b></div>
            </div>
          </article>
          <article className="cor-card cor-rework-card relative flex flex-col overflow-hidden bg-white text-slate-900">
            <div className={classeRetrabalho(metricas.taxaRetrabalho)}>
              <span className="cor-rework-icon">&#128296;</span>
              <span>Taxa de retrabalho</span>
              <b>{metricas.taxaRetrabalho.toFixed(1).replace('.', ',')}%</b>
            </div>
          </article>
        </div>
      </section>

      <section className="analyst-live-board" data-layout-version="analista-card-v2">
        <header className="analyst-live-head">
          <div className="analyst-live-title">
            <div className="analyst-live-title-row">
              <div>
                <h2>Fila Viva - Fluxo do Cliente</h2>
                <p>Fluxo operacional da carteira</p>
              </div>
              <div className="analyst-live-kpis">
                <strong><b>{filaCca.length}</b><span>Processos</span></strong>
                <strong><b>{filaCca.length}</b><span>Com formularios</span></strong>
                <strong><b>{filaCca.length}</b><span>Prioridade alta</span></strong>
              </div>
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

        <div className="analyst-live-list" data-layout-version="analista-card-v2">
          {filaCca.map((cliente) => {
            const detalheAberto = detalhesAbertos.includes(cliente.id);
            const pendenciado = cliente.hasPendencia;

            return (
              <article className={`analyst-live-card ${detalheAberto ? 'is-open' : ''} ${pendenciado ? 'is-pending' : ''}`} key={cliente.id}>
                <div className="analyst-live-main">
                  <div className="analyst-card-client-area">
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
                  </div>

                  <div className="analyst-card-pendency-area">
                    <div className="analyst-cca-line">
                      <span>CCA responsavel</span>
                      <em>{cliente.cca}</em>
                    </div>
                    <small>{cliente.prioridade}</small>
                    {pendenciado ? <strong className="pending-warning">Pendenciado</strong> : null}
                  </div>
                </div>

                <div className="analyst-live-status analyst-card-action-area">
                  <div>
                    <span>SLA Cliente {cliente.slaCca}</span>
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
                          <b className="danger">SLA Cliente {cliente.slaCca}</b>
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
                        ['SLA Cliente', cliente.slaCca],
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

