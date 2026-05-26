'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/proxy';

type PendenciaTone = 'critico' | 'medio' | 'ok';
type PendenciaItem = [PendenciaTone, string, string, string];
type AlertaPendencia = { tone: PendenciaTone; nome: string; desc: string; prazo: string };
type ProdutividadeItem = [string, string, string, string];
type TelemetriaRow = [string, string, string, string, string, string, string, string, string, string];

const pendenciasGestor: PendenciaItem[] = [
  ['critico', 'MATHEUS ALVES', 'Extrato FGTS pendente de retorno do corretor', 'Hoje 17:00'],
  ['medio', 'ANA PAULA', 'Documento enviado aguardando abertura do analista', '12h'],
  ['medio', 'CARLOS HENRIQUE', 'Renda informal exige declaracao complementar', '24h'],
  ['ok', 'JOAO AMORIN', 'Kit documental aprovado para envio ao CCA', 'OK'],
];

const produtividadeGestor: ProdutividadeItem[] = [
  ['Bianca Moura', '18', '8', '44,4%'],
  ['Douglas Silva', '14', '6', '42,9%'],
  ['Patricia Nunes', '10', '4', '40,0%'],
];

const totalProdutividade: ProdutividadeItem = ['Total', '42', '18', '42,9%'];
const caixaStageKeys = ['reserva', 'em_analise_credito', 'emitindo_formularios', 'formularios_em_assinatura', 'formularios_assinados', 'envio_conformidade'];
const caixaStageLabels = ['Reserva', 'Em Analise Credito', 'Emitindo Formularios', 'Formularios Em Assinatura', 'Formularios Assinados', 'Envio a conformidade'];
const agehabStageKeys = ['reserva', 'em_analise_credito', 'ficha_emitida', 'ficha_recebida', 'em_validacao_agehab', 'agehab_validada'];
const agehabStageLabels = ['Reserva', 'Em Analise Credito', 'Ficha emitida', 'Ficha Recebida', 'Em Validacao Agehab', 'Agehab Validada'];

const telemetria: TelemetriaRow[] = [
  ['458712', 'Matheus Alves de Melo', 'Bianca Moura', 'pendencia documentacao', 'documentos pendenciados', 'pendente', 'nao tem', 'reserva ativa', '18h', '24h'],
  ['458713', 'Ana Paula Ribeiro', 'Douglas Silva', 'formularios disponiveis', 'ficha agehab liberada', 'pago', 'finalizado', 'aguardando envio', '6h', '12h'],
  ['458714', 'Carlos Henrique Souza', 'Patricia Nunes', 'em validacao credito', 'em analise do credito', 'nao tem', 'nao tem', 'analise inicial', '22h', '36h'],
];

function badge(status: string) {
  const s = status.toLowerCase();
  if (s.includes('pend')) return 'cor-badge cor-badge-danger';
  if (s.includes('pago') || s.includes('finalizado') || s.includes('liberada') || s.includes('ok')) return 'cor-badge cor-badge-ok';
  if (s.includes('analise') || s.includes('validacao') || s.includes('aguardando')) return 'cor-badge cor-badge-warn';
  return 'cor-badge cor-badge-info';
}

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

function formatarDocumento(key: string) {
  return key
    .replace(/-\d+$/g, '')
    .replace(/\./g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function formatarPrazo(valor: unknown) {
  if (!valor || typeof valor !== 'string') return 'Sem prazo';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function montarAlertasPendencia(processos: any[]): AlertaPendencia[] {
  return processos.flatMap((processo) => Object.entries(processo?.pendencias || {})
    .filter(([key, pendencia]: [string, any]) => {
      const status = String(processo?.documentos?.[key] || '').toLowerCase();
      return Boolean(pendencia?.descricao || pendencia?.prazo) && !status.includes('aprovado');
    })
    .map(([key, pendencia]: [string, any]) => ({
      tone: 'critico' as PendenciaTone,
      nome: String(processo?.cliente || processo?.reserva || 'CLIENTE').toUpperCase(),
      desc: `${formatarDocumento(key)}: ${pendencia?.descricao || 'Documento pendente de retorno.'}`,
      prazo: formatarPrazo(pendencia?.prazo || pendencia?.updated_at),
    }))).sort((a, b) => a.prazo.localeCompare(b.prazo)).slice(0, 20);
}

function classeEtapa(index: number, atual: number) {
  if (index < atual) return 'done';
  if (index === atual) return 'current';
  return '';
}

function pendenciasDoProcesso(processo: any) {
  const lista = Object.entries(processo?.pendencias || {}).map(([key, pendencia]: [string, any]) => {
    const prazo = formatarPrazo(pendencia?.prazo || pendencia?.updated_at);
    return `${formatarDocumento(key)}: ${pendencia?.descricao || 'Documento pendente'}${prazo !== 'Sem prazo' ? ` | Prazo ${prazo}` : ''}`;
  });
  return lista.length ? lista : [`Caixa: ${statusLabel(processo?.caixa)}`, `Agehab: ${statusLabel(processo?.agehab)}`];
}

function checklistGestorUrl(cliente: {
  id: string;
  cliente: string;
  empreendimento: string;
  corretor: string;
  produto: string;
  sinal: string;
  fiador: string;
  caixa: string;
  agehab: string;
}) {
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
    view: 'web-gestor-v1',
  });

  return `/gestor/checklist?${params.toString()}`;
}

export default function GestorTelemetriaPage() {
  const [detalhesAbertos, setDetalhesAbertos] = useState<string[]>([]);
  const [processosBanco, setProcessosBanco] = useState<any[]>([]);
  const [carregouProcessos, setCarregouProcessos] = useState(false);
  const [atualizacaoDisponivel, setAtualizacaoDisponivel] = useState(false);
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

  const carregarProcessos = () => {
    fetch('/api/processos', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        const processos = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];
        setProcessosBanco(processos);
        setCarregouProcessos(true);
        setAtualizacaoDisponivel(false);
      })
      .catch(() => { setProcessosBanco([]); setCarregouProcessos(true); });
  };

  useEffect(() => {
    carregarProcessos();
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'siocred_status_update') setAtualizacaoDisponivel(true);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const filaGestor = telemetria.map(([id, cliente, responsavel, caixa, agehab, sinal, fiador, momento, slaCliente, prazo]) => {
    const processo = processosBanco.find((item) => item.reserva === id);
    const caixaRaw = processo?.caixa || 'reserva';
    const agehabRaw = processo?.agehab || 'reserva';
    const caixaAtual = processo ? statusLabel(caixaRaw) : caixa;
    const agehabAtual = processo ? statusLabel(agehabRaw) : agehab;
    const responsavelAtual = processo?.corretor || responsavel;
    const pendencias = pendenciasDoProcesso(processo);
    const caixaIndex = Math.max(0, caixaStageKeys.indexOf(caixaRaw));
    const agehabIndex = Math.max(0, agehabStageKeys.indexOf(agehabRaw));
    return {
      id,
      produto: processo?.produto || 'RD',
      cliente: processo?.cliente || cliente,
      empreendimento: processo?.empreendimento || 'Kit Caixa | Kit Agehab',
      corretor: responsavelAtual,
      cca: responsavelAtual,
      prioridade: processo?.encaminhado_analista ? 'Enviado para analista' : 'Prioridade alta',
      comercial: processo?.sla?.elapsed_label || prazo,
      credito: processo?.sla?.elapsed_label || slaCliente,
      panorama: processo?.encaminhado_analista ? 'Em acompanhamento' : momento,
      resumo: `${caixaAtual} | ${agehabAtual}`,
      proximaAcao: pendencias.length ? 'Corrigir documento pendenciado' : `Acompanhar Caixa: ${caixaAtual}`,
      observacao: pendencias[0] || 'Sem observacao registrada',
      aging: processo?.sla?.elapsed_label || prazo,
      slaCca: processo?.sla?.elapsed_label || slaCliente,
      caixa: caixaAtual,
      agehab: agehabAtual,
      caixaIndex,
      agehabIndex,
      sinal: processo?.sinal || sinal,
      fiador: processo?.fiador || fiador,
      pendencias,
    };
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

    return filaGestor.filter((cliente) => (
      (!reserva || cliente.id.toLowerCase().includes(reserva)) &&
      (!nome || cliente.cliente.toLowerCase().includes(nome)) &&
      (!corretor || cliente.corretor.toLowerCase().includes(corretor)) &&
      (!gestor || cliente.cca.toLowerCase().includes(gestor)) &&
      (!caixa || cliente.caixa.toLowerCase() === caixa) &&
      (!agehab || cliente.agehab.toLowerCase() === agehab) &&
      (!produto || cliente.produto.toLowerCase() === produto)
    ));
  }, [filtros, filaGestor]);

  const alertasPendentes = useMemo(() => {
    const dinamicos = montarAlertasPendencia(processosBanco);
    return dinamicos.length ? dinamicos : carregouProcessos ? [] : [];
  }, [processosBanco, carregouProcessos]);
  const reservasGestor = filaGestor.length;
  const finalizadosGestor = filaGestor.filter((cliente) => (
    cliente.caixa.toLowerCase().includes('conformidade') ||
    cliente.caixa.toLowerCase().includes('assinado') ||
    cliente.agehab.toLowerCase().includes('validada')
  )).length;
  const percentualGestor = reservasGestor ? `${((finalizadosGestor / reservasGestor) * 100).toFixed(1).replace('.', ',')}%` : '0,0%';

  return (
    <main className="cor-page cor-page-premium" data-layout-version="gestor-template-analista-v1">
      <header className="cor-premium-top">
        <div className="cor-premium-title">
          <span className="cor-chart-icon">↗</span>
          <div>
            <h1>Painel do Gestor</h1>
            <p>Visao executiva da carteira, produtividade por gestor, SLA operacional e telemetria dos processos.</p>
          </div>
        </div>
        <div className="cor-premium-actions cor-actions-no-primary">
          <button type="button" onClick={carregarProcessos}>{atualizacaoDisponivel ? '↻ Atualização disponível' : '↻ Atualizar'}</button>
          <button>↪ Sair</button>
        </div>
      </header>

      <section className="cor-dash-grid cor-dash-premium">
        <article className="cor-card cor-panel-alerts">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 1 — Pendencias acompanhadas</small>
              <p>Clientes e documentos que precisam de acao do gestor ou retorno da operacao.</p>
            </div>
            <strong className="cor-urgent-pill">{alertasPendentes.length} atencoes</strong>
          </div>
          <div className="cor-alert-list">
            {alertasPendentes.length ? alertasPendentes.map(({ tone, nome, desc, prazo }, index) => (
              <div className={`cor-alert-item cor-alert-${tone}`} key={`${nome}-${index}`}>
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

        <div className="cor-sla-stack">
          <article className="cor-card cor-panel-sla">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 2 — Produtividade por gestor</small>
                <p>Reservas, finalizados e percentual concluido por responsavel.</p>
              </div>
            </div>
            <div className="gestor-mini-table">
              <div className="gestor-mini-row gestor-mini-head">
                <span>Gestor</span>
                <span>Reserva</span>
                <span>Finalizado</span>
                <span>%</span>
              </div>
              {[[`Carteira`, String(reservasGestor), String(finalizadosGestor), percentualGestor]].map(([gestor, reservas, finalizado, percentual]) => (
                <div className="gestor-mini-row" key={gestor}>
                  <strong>{gestor}</strong>
                  <b>{reservas}</b>
                  <b>{finalizado}</b>
                  <b>{percentual}</b>
                </div>
              ))}
              <div className="gestor-mini-row gestor-mini-total">
                <strong>Total</strong>
                <b>{reservasGestor}</b>
                <b>{finalizadosGestor}</b>
                <b>{percentualGestor}</b>
              </div>
            </div>
          </article>
        </div>

        <article className="cor-card cor-panel-conversion">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 3 — SLA</small>
              <p>Comparativo do melhor SLA, pior SLA e media da carteira.</p>
            </div>
          </div>
          <div className="cor-speed-premium">
            <div className="cor-speed-arc" />
            <div className="cor-speed-needle" />
            <span />
          </div>
          <div className="cor-sla-lines">
            <div><span>Melhor SLA</span><small>Processo mais eficiente</small><b className="green">3h</b></div>
            <div><span>Pior SLA</span><small>Maior tempo em aberto</small><b className="red">36h</b></div>
            <div><span>Media SLA</span><small>Carteira atual</small><b className="green">14h</b></div>
          </div>
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
            const pendenciado = cliente.pendencias.some((pendencia) => pendencia.toLowerCase().includes('pend') || pendencia.includes(':'));

            return (
              <article className={`analyst-live-card ${detalheAberto ? 'is-open' : ''} ${pendenciado ? 'is-pending' : ''}`} key={cliente.id}>
                <div className="analyst-live-main">
                  <div className="analyst-client-title">
                    <i />
                    <b>{cliente.produto}</b>
                    <h3>
                      <a href={checklistGestorUrl(cliente)}>
                        {cliente.cliente}
                      </a>
                    </h3>
                  </div>
                  <p>{cliente.empreendimento}</p>
                  <p>{cliente.corretor}</p>
                  <div className="analyst-cca-line">
                    <span>Gestor</span>
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
                  <a className="analyst-open-button" href={checklistGestorUrl(cliente)}>Abrir</a>
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
                        <h4>{cliente.proximaAcao}</h4>
                        <p>Caixa: {cliente.caixa}</p>
                        <p>Agehab: {cliente.agehab}</p>
                        <p>{cliente.observacao}</p>
                      </section>
                    </div>
                    <section className={`analyst-stage-card ${cliente.caixaIndex >= caixaStageLabels.length - 1 ? 'stage-complete' : ''}`}>
                      <div className="analyst-stage-head">
                        <b>Kit Caixa</b>
                        <strong>{cliente.caixa}</strong>
                      </div>
                      <div className="analyst-stage-line kit-caixa">
                        {caixaStageLabels.map((etapa, index) => (
                          <div className={classeEtapa(index, cliente.caixaIndex)} key={etapa}>
                            <i />
                            <span>{etapa}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className={`analyst-stage-card analyst-repasse ${cliente.agehabIndex >= agehabStageLabels.length - 1 ? 'stage-complete' : ''}`}>
                      <div className="analyst-stage-head">
                        <b>Kit Agehab</b>
                        <strong>{cliente.agehab}</strong>
                      </div>
                      <div className="analyst-stage-line kit-agehab">
                        {agehabStageLabels.map((etapa, index) => (
                          <div className={classeEtapa(index, cliente.agehabIndex)} key={etapa}>
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
                        ['Produto', 'PAGO'],
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
