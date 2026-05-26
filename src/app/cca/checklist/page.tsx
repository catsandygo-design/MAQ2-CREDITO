'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient, apiUrl } from '@/lib/api/proxy';
import { logAppError } from '@/lib/observability/logger';
import { montarPayloadPendencia, validarRoteamentoPendencia } from '@/lib/governanca-pendencias';
import { dependentes, docStatuses, relStatuses, sections, type DocStatus, type PendenciaDoc, type RelStatus } from '@/domain/checklist/contracts';

const agenciasVinculadas = ['1856', '0972'];

const caixaStages = [
  ['reserva', 'Reserva'],
  ['em_analise_credito', 'Em Analise Credito'],
  ['emitindo_formularios', 'Emitindo Formularios'],
  ['formularios_em_assinatura', 'Formularios Em Assinatura'],
  ['formularios_assinados', 'Formularios Assinados'],
  ['envio_conformidade', 'Envio a conformidade'],
] as const;

const agehabStages = [
  ['reserva', 'Reserva'],
  ['em_analise_credito', 'Em Analise Credito'],
  ['ficha_emitida', 'Ficha emitida'],
  ['ficha_recebida', 'Ficha Recebida'],
  ['em_validacao_agehab', 'Em Validacao Agehab'],
  ['agehab_validada', 'Agehab Validada'],
] as const;

function classForStatus(status: string) {
  const normalized = status.toLowerCase();
  // Comparacao em minusculo para evitar divergencia de acentuacao entre fontes.
  if (['aprovado', 'não se aplica', 'sim'].includes(normalized)) return 'ok';
  if (['pendente', 'bloqueado', 'nao'].includes(normalized)) return 'bad';
  return 'warn';
}

function normalizeCaixaStatus(status: string | null) {
  const normalized = (status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (!normalized) return 'reserva';
  if (normalized === 'emitir formularios' || normalized === 'emitindo formularios') return 'emitindo_formularios';
  if (normalized === 'em analise credito') return 'em_analise_credito';
  if (normalized === 'formularios em assinatura') return 'formularios_em_assinatura';
  if (normalized === 'formularios assinados') return 'formularios_assinados';
  if (normalized === 'envio a conformidade') return 'envio_conformidade';
  if (normalized === 'reserva') return 'reserva';
  return status || 'reserva';
}

function StageTimeline({
  label,
  value,
  stages,
  tone,
}: {
  label: string;
  value: string;
  stages: readonly (readonly [string, string])[];
  tone: 'caixa' | 'agehab';
}) {
  const currentIndex = Math.max(0, stages.findIndex(([stage]) => stage === value));
  const progress = ((currentIndex + 1) / stages.length) * 100;

  return (
    <div className="react-stage">
      <div className="react-stage-head">
        <strong>{label}</strong>
      </div>
      <div className={`react-stage-dots ${tone}`}>
        {stages.map(([stage], index) => (
          <span className={index === currentIndex ? 'active' : index < currentIndex ? 'done' : ''} key={stage} />
        ))}
      </div>
      <div className="react-stage-progress"><i style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

function AnalistaChecklistContent() {
  const params = useSearchParams();
  const [caixa, setCaixa] = useState(normalizeCaixaStatus(params.get('caixa')));
  const [agehab, setAgehab] = useState('reserva');
  const [perfilRenda, setPerfilRenda] = useState('clt');
  const [tipoDependente, setTipoDependente] = useState(params.get('dependente') || 'filho-maior');
  const [docMap, setDocMap] = useState<Record<string, DocStatus>>({});
  const [relMap, setRelMap] = useState<Record<string, RelStatus>>({});
  const [pendenciasDoc, setPendenciasDoc] = useState<Record<string, PendenciaDoc>>({});
  const [uploadsEnviados, setUploadsEnviados] = useState<Record<string, boolean>>({});
  const [kitPdfDisponivel, setKitPdfDisponivel] = useState(false);

  const cliente = params.get('cliente') || '';
  const reserva = params.get('reserva') || '';
  const cidade = params.get('cidade') || '';
  const empreendimento = params.get('empreendimento') || '';
  const corretor = params.get('corretor') || '';
  const sinal = params.get('sinal') || 'Nao tem';
  const fiador = params.get('fiador') || 'Nao tem';
  const produto = params.get('produto') || 'Pago';

  const temDocumentoEnviado = params.get('upload') === '1' || params.get('documento') === 'enviado';

  useEffect(() => {
    if (!reserva) return;
    let ativo = true;

    const carregarDados = async () => {
      try {
        // TODO FastAPI: substituir pela URL final do backend, ex: `${API_URL}/processos/${reserva}`.
        const data = await apiClient.get<{
          caixa?: string;
          agehab?: string;
          documentos?: Record<string, DocStatus>;
          relacionamento?: Record<string, RelStatus>;
          pendencias?: Record<string, PendenciaDoc>;
          uploadsEnviados?: Record<string, boolean>;
        }>(`/api/processos/${encodeURIComponent(reserva)}`);

        if (!ativo) return;
        if (data.caixa) setCaixa(normalizeCaixaStatus(data.caixa));
        if (data.agehab) setAgehab(data.agehab);
        if (data.documentos) setDocMap(data.documentos);
        if (data.relacionamento) setRelMap(data.relacionamento);
        if (data.pendencias) setPendenciasDoc(data.pendencias);
        setUploadsEnviados((current) => ({ ...current, ...data.uploadsEnviados }));
      } catch (error) {
        logAppError('', error);
      }

      try {
        const uploads = await apiClient.get<{ temDocumentoEnviado?: boolean; uploads?: unknown[] }>(`/api/processos/${encodeURIComponent(reserva)}/uploads`);
        if (ativo) setKitPdfDisponivel(Boolean(uploads.temDocumentoEnviado || uploads.uploads?.length));
      } catch (error) {
        logAppError('', error);
      }
    };

    carregarDados();
    return () => {
      ativo = false;
    };
  }, [reserva]);

  const visibleSections = useMemo(() => sections.filter((section) => {
    if (section.key === 'depmenor') return tipoDependente === 'filho-menor';
    if (section.key === 'depmaior') return tipoDependente !== 'nao-definido' && tipoDependente !== 'filho-menor';
    if (section.key === 'rendaclt') return perfilRenda === 'clt';
    if (section.key === 'rendainf') return perfilRenda === 'informal';
    return true;
  }), [perfilRenda, tipoDependente]);

  const allDocs = visibleSections.flatMap((section) => section.docs.map(([id]) => `${section.key}.${id}`));
  const doneDocs = allDocs.filter((key) => ['Aprovado', 'Não se Aplica'].includes(docMap[key] || 'Aguardando')).length;

  function updateDoc(key: string, value: DocStatus) {
    setDocMap((current) => {
      const next = { ...current, [key]: value };

      if (reserva) {
        void apiClient.put(`/api/processos/${encodeURIComponent(reserva)}/documentos/${encodeURIComponent(key)}`, {
          // TODO FastAPI: persistir status do documento no endpoint definitivo.
          status: value,
        }).catch((error) => logAppError('Erro ao salvar documento na API FastAPI', error));

        if (value !== 'Pendente') {
          setPendenciasDoc((pendenciasAtuais) => {
            const { [key]: _removida, ...restante } = pendenciasAtuais;
            return restante;
          });
        }
      }

      return next;
    });
  }

  function updatePendenciaDoc(key: string, field: keyof PendenciaDoc, value: string) {
    setPendenciasDoc((current) => {
      const next = {
        ...current,
        [key]: {
          descricao: current[key]?.descricao || '',
          prazo: current[key]?.prazo || '',
          [field]: value,
        },
      };

      if (reserva) {
        const validacao = validarRoteamentoPendencia('cca', 'analista');
        if (!validacao.ok) {
          logAppError('Governanca: roteamento de pendencia invalido', new Error(validacao.motivo || 'Roteamento invalido'));
          return next;
        }

        const documentoNome = key.split('.').pop() || key;
        const payloadGovernanca = montarPayloadPendencia({
          cliente,
          reserva,
          cadastro: reserva,
          corretor,
          origem: 'cca',
          destino: 'analista',
          documentoId: key,
          documentoNome,
          mensagem: next[key].descricao,
          prazo: next[key].prazo,
        });

        void apiClient.put(`/api/processos/${encodeURIComponent(reserva)}/documentos/${encodeURIComponent(key)}/pendencia`, {
          ...next[key],
          ...payloadGovernanca,
        }).catch((error) => logAppError('Erro ao salvar pendencia na API FastAPI', error));
      }

      return next;
    });
  }

  function nomeArquivoDocumento(key: string, originalName: string) {
    const documento = key.split('.').pop()?.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase() || 'documento';
    const dataHora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
    const corretorNome = (corretor || 'corretor').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    const extensao = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')).toLowerCase() : '';
    return `${documento}-${dataHora}-${corretorNome}${extensao}`;
  }

  function updateRel(key: string, value: RelStatus) {
    setRelMap((current) => {
      const next = { ...current, [key]: value };

      if (reserva) {
        void apiClient.put(`/api/processos/${encodeURIComponent(reserva)}/relacionamento/${encodeURIComponent(key)}`, {
          // TODO FastAPI: persistir resposta de relacionamento no endpoint definitivo.
          status: value,
        }).catch((error) => logAppError('Erro ao salvar relacionamento na API FastAPI', error));
      }

      return next;
    });
  }

  async function handleUploadCaixa(key: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!reserva || !file) return;
    try {
      const formData = new FormData();
      formData.append('grupo', 'caixa');
      formData.append('key', key);
      formData.append('name', nomeArquivoDocumento(key, file.name));
      formData.append('file', file);

      await fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/uploads`), {
        method: 'POST',
        body: formData,
      });
      setUploadsEnviados((current) => ({ ...current, [key]: true }));
    } catch (error) {
      logAppError('', error);
    }
  }

  return (
    <main className="analista-checklist-react">
      <header className="react-checklist-hero">
        <div>
          <h1>Checklist de Documentos</h1>
          <span>Analise de documentos</span>
          <p>Checklist do analista com conferencia documental, pendencias, status Caixa/Agehab e retorno operacional.</p>
        </div>
        <aside>
          <b>Total de documentos: {allDocs.length}</b>
          <b>Status: {doneDocs} enviados</b>
          <a className="react-back-button" href="/cca/acompanhamento">Voltar</a>
        </aside>
      </header>

      <section className="react-stage-grid">
        <StageTimeline label="Kit Caixa" value={caixa} stages={caixaStages} tone="caixa" />
        <StageTimeline label="Kit Agehab" value={agehab} stages={agehabStages} tone="agehab" />
      </section>

      <section className="react-card">
        <div className="react-section-head">
          <span>Proponente</span>
          <b>Identificacao do processo</b>
        </div>
        <div className="react-form-grid">
          <label>Nome completo<input value={cliente} readOnly placeholder="Nome do proponente" /></label>
          <label>Nº da reserva<input value={reserva} readOnly placeholder="Ex: 458712" /></label>
          <label>Cidade<input value={cidade} readOnly placeholder="Ex: Aguas Lindas de Goias" /></label>
          <label>Empreendimento<input value={empreendimento} readOnly placeholder="Nome do empreendimento" /></label>
          <label>Corretor responsavel<input value={corretor} readOnly placeholder="Nome do corretor" /></label>
          <label>Sinal ok?<select className="is-readonly-select" value={sinal} disabled><option>Nao tem</option><option>Sim</option><option>Nao</option></select></label>
          <label>Fiador ok?<select className="is-readonly-select" value={fiador} disabled><option>Nao tem</option><option>Sim</option><option>Nao</option></select></label>
          <label>Produto?<select className="is-readonly-select" value={produto} disabled><option>PP</option><option>PN</option><option>PA</option><option>Pago</option><option>Negociado</option><option>Em aberto</option></select></label>
          <label>Estado civil<select className="is-readonly-select" disabled><option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viuvo(a)</option><option>Uniao estavel</option></select></label>
          <label>Tipo de renda
            <select className="is-readonly-select" value={perfilRenda} disabled onChange={(event) => setPerfilRenda(event.target.value)}>
              <option value="clt">CLT / Formal</option>
              <option value="informal">Informal / Autonomo</option>
              <option value="aposentado">Aposentado / Pensionista</option>
              <option value="domestico">Domestico / eSocial</option>
            </select>
          </label>
          <label>Tipo de dependente
            <select className="is-readonly-select" value={tipoDependente} disabled onChange={(event) => setTipoDependente(event.target.value)}>
              {dependentes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>Dependente casado?<select className="is-readonly-select" disabled><option>Nao</option><option>Sim</option></select></label>
        </div>
      </section>

      <div className="react-checklist-layout">
        <section className="react-card">
          {visibleSections.map((section) => {
            const total = section.docs.length;
            const approved = section.docs.filter(([id]) => ['Aprovado', 'Não se Aplica'].includes(docMap[`${section.key}.${id}`] || 'Aguardando')).length;

            return (
              <article className="react-doc-section" key={section.key}>
                <div className="react-doc-head">
                  <div><h2>{section.title}</h2><p>{section.subtitle}</p></div>
                  <span>{approved}/{total} concluidos</span>
                </div>
                <table>
                  <thead><tr><th>Documento</th><th>O que e aceito</th><th>Status</th></tr></thead>
                  <tbody>
                    {section.docs.map(([id, name, desc]) => {
                      const key = `${section.key}.${id}`;
                      const status = docMap[key] || 'Aguardando';
                      const uploadEnviado = Boolean(uploadsEnviados[key]);
                      return (
                        <tr key={key}>
                          <td><strong>{name}</strong></td>
                          <td>{desc}</td>
                          <td>
                            <select className={classForStatus(status)} value={status} onChange={(event) => updateDoc(key, event.target.value as DocStatus)}>
                              {docStatuses.map((item) => <option value={item} key={item}>{item}</option>)}
                            </select>
                            {status === 'Pendente' ? (
                              <div className="react-pendency-fields">
                                <textarea value={pendenciasDoc[key]?.descricao || ''} onChange={(event) => updatePendenciaDoc(key, 'descricao', event.target.value)} placeholder="Descricao da pendencia" />
                                <input type="datetime-local" value={pendenciasDoc[key]?.prazo || ''} onChange={(event) => updatePendenciaDoc(key, 'prazo', event.target.value)} />
                              </div>
                            ) : null}
                            {section.key === 'caixa' && caixa === 'emitindo_formularios' ? (
                              <label className="react-doc-upload">
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(event) => { void handleUploadCaixa(key, event); }}
                                />
                                {uploadEnviado ? 'Enviado' : 'Upload'}
                              </label>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </article>
            );
          })}

        </section>

        <aside className="react-card react-return">
          <h2>Retorno do Analista</h2>
          <p>Atualize observacoes e copie o resumo das pendencias visiveis.</p>
          <div className="react-cca-vinculado">
            <label>Agencia Vinculada
              <select defaultValue="">
                <option value="" disabled>Selecione...</option>
                {agenciasVinculadas.map((agencia) => <option value={agencia} key={agencia}>{agencia}</option>)}
              </select>
            </label>
            <button type="button" hidden={!temDocumentoEnviado}>Abrir</button>
          </div>
          <label>Observacao do analista<textarea placeholder="Ex.: falta extrato bancario, IRPF ilegivel..." /></label>
          <label>Resumo automatico<textarea readOnly value={`${doneDocs}/${allDocs.length} documentos concluidos nas secoes visiveis.`} /></label>
          {kitPdfDisponivel ? (
            <a
              className="react-doc-upload"
              href={apiUrl(`/api/processos/${encodeURIComponent(reserva)}/uploads?merge=1`)}
              download={`KIT_DOCUMENTAL_RESERVA_${reserva}.pdf`}
            >
              Baixar PDF unico
            </a>
          ) : null}
          <button type="button">Salvar tudo</button>
        </aside>
      </div>
    </main>
  );
}

export default function AnalistaChecklistPage() {
  return (
    <Suspense fallback={<main className="analista-checklist-react">Carregando checklist do analista...</main>}>
      <AnalistaChecklistContent />
    </Suspense>
  );
}
