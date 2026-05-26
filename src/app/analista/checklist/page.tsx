'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api/proxy';
import { logAppError } from '@/lib/observability/logger';
import { montarPayloadPendencia, validarRoteamentoPendencia } from '@/lib/governanca-pendencias';
import { dependentes, docStatuses, relStatuses, relacionamento, sections, type DocStatus, type PendenciaDoc, type RelStatus } from '@/domain/checklist/contracts';

const ccasVinculados = ['Endy Carvalho', 'CCA Externo', 'CCA Supera', 'CCA Agiliza', 'Federal CCA', 'CCA Impacta'];

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

const corretorToAnalistaDocKey: Record<string, string> = {
  'documentos-do-proponente-identidade-e-cpf-1': 'proponente.identidade',
  'documentos-do-proponente-comp-de-estado-civil-2': 'proponente.estado-civil',
  'documentos-do-proponente-comprovante-de-residencia-3': 'proponente.residencia',
  'documentos-do-proponente-extrato-fgts-5': 'proponente.fgts',
  'documentos-do-proponente-ctps-carteira-6': 'rendaclt.carteira',
  'dependente-filhos-menores-de-18-anos-certidao-de-nascimento-1': 'depmenor.certidao',
  'dependente-filhos-maiores-parentes-ate-3-grau-identidade-e-cpf-1': 'depmaior.identidade',
  'dependente-filhos-maiores-parentes-ate-3-grau-comp-de-estado-civil-2': 'depmaior.estado-civil',
  'dependente-filhos-maiores-parentes-ate-3-grau-declaracao-de-parentesco-3': 'depmaior.parentesco',
  'renda-formal-clt-vinculo-holerites-1': 'rendaclt.holerite',
  'renda-informal-autonomo-liberal-extrato-bancario-1': 'rendainf.extrato',
  'documentos-agehab-declaracao-renda-informal-2': 'rendainf.declaracao',
  'documentos-caixa-damp-1': 'caixa.damp',
  'documentos-caixa-ficha-de-cadastro-caixa-2': 'caixa.ficha',
  'documentos-caixa-abertura-de-conta-3': 'caixa.abertura',
  'documentos-caixa-mo-4': 'caixa.mo',
  'documentos-caixa-formulario-cheque-azul-5': 'caixa.cheque-especial',
  'documentos-caixa-formulario-cartao-6': 'caixa.cartao-credito',
};

function normalizarDocKey(key: string) {
  return corretorToAnalistaDocKey[key] || key;
}

function originalDocKey(key: string) {
  return Object.entries(corretorToAnalistaDocKey).find(([, analistaKey]) => analistaKey === key)?.[0] || key;
}

function classForStatus(status: string) {
  const normalized = status.toLowerCase();
  // Comparacao em minusculo para evitar divergencia de acentuacao entre fontes.
  if (['aprovado', 'não se aplica', 'sim'].includes(normalized)) return 'ok';
  if (['pendente', 'bloqueado', 'nao'].includes(normalized)) return 'bad';
  return 'warn';
}

function StageTimeline({
  label,
  value,
  onChange,
  stages,
  tone,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  stages: readonly (readonly [string, string])[];
  tone: 'caixa' | 'agehab';
  disabled?: boolean;
}) {
  const currentIndex = Math.max(0, stages.findIndex(([stage]) => stage === value));
  const progress = ((currentIndex + 1) / stages.length) * 100;

  return (
    <div className="react-stage">
      <div className="react-stage-head">
        <strong>{label}</strong>
        <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
          {stages.map(([stage, text]) => (
            <option value={stage} key={stage}>{text}</option>
          ))}
        </select>
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
  const [caixa, setCaixa] = useState('');
  const [agehab, setAgehab] = useState('');
  const [perfilRenda, setPerfilRenda] = useState('clt');
  const [tipoDependente, setTipoDependente] = useState('nao-definido');
  const [docMap, setDocMap] = useState<Record<string, DocStatus>>({});
  const [relMap, setRelMap] = useState<Record<string, RelStatus>>({});
  const [pendenciasDoc, setPendenciasDoc] = useState<Record<string, PendenciaDoc>>({});
  const [temDocumentoEnviado, setTemDocumentoEnviado] = useState(false);
  const [uploadsCca, setUploadsCca] = useState<Record<string, { name: string; data: string }>>({});
  const [salvando, setSalvando] = useState(false);
  const [avisoSalvar, setAvisoSalvar] = useState('');
  const [dadosCarregados, setDadosCarregados] = useState(false);

  const cliente = params.get('cliente') || '';
  const reserva = params.get('reserva') || '';
  const corretor = params.get('corretor') || '';

  useEffect(() => {
    if (!reserva) return;
    let ativo = true;

    const carregarDados = async () => {
      try {
        const response = await fetch(`/api/processos/${encodeURIComponent(reserva)}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Erro ao carregar processo: ${response.status}`);
        }

        const data = await response.json() as {
          caixa?: string;
          agehab?: string;
          documentos?: Record<string, DocStatus>;
          relacionamento?: Record<string, RelStatus>;
          pendencias?: Record<string, PendenciaDoc>;
          uploadsCca?: Record<string, { name: string; data: string }>;
          temDocumentoEnviado?: boolean;
        };

        if (!ativo) return;
        setCaixa(data.caixa || 'reserva');
        setAgehab(data.agehab || 'reserva');
        if (data.documentos) {
          const documentosNormalizados = Object.entries(data.documentos).reduce<Record<string, DocStatus>>((acc, [key, status]) => {
            acc[normalizarDocKey(key)] = status as DocStatus;
            return acc;
          }, {});
          setDocMap(documentosNormalizados);
        }
        if (data.relacionamento) setRelMap(data.relacionamento);
        if (data.pendencias) {
          const pendenciasNormalizadas = Object.entries(data.pendencias).reduce<Record<string, PendenciaDoc>>((acc, [key, pendencia]) => {
            acc[normalizarDocKey(key)] = pendencia as PendenciaDoc;
            return acc;
          }, {});
          setPendenciasDoc(pendenciasNormalizadas);
        }
        const uploadsNormalizados = Object.entries(data.uploadsCca || {}).reduce<Record<string, { name: string; data: string }>>((acc, [key, upload]) => {
          acc[normalizarDocKey(key)] = upload as { name: string; data: string };
          return acc;
        }, {});
        setUploadsCca(uploadsNormalizados);
        setTemDocumentoEnviado(Boolean(data.temDocumentoEnviado || params.get('upload') === '1' || params.get('documento') === 'enviado'));
        setDadosCarregados(true);
      } catch (error) {
        logAppError('', error);
        if (ativo) {
          setTemDocumentoEnviado(params.get('upload') === '1' || params.get('documento') === 'enviado');
          setDadosCarregados(true);
        }
      }
    };

    carregarDados();
    window.addEventListener('focus', carregarDados);
    return () => {
      ativo = false;
      window.removeEventListener('focus', carregarDados);
    };
  }, [params, reserva]);

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
        const backendKey = originalDocKey(key);
        void apiClient.put(`/api/processos/${encodeURIComponent(reserva)}/documentos/${encodeURIComponent(backendKey)}`, {
          // TODO FastAPI: persistir status do documento no endpoint definitivo.
          status: value,
        }).catch((error) => logAppError('Erro ao salvar documento na API FastAPI', error));

        if (value !== 'Pendente') {
          setPendenciasDoc((pendenciasAtuais) => {
          const { [key]: _removida, [backendKey]: _removidaOriginal, ...restante } = pendenciasAtuais;
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
        const validacao = validarRoteamentoPendencia('analista', 'corretor');
        if (!validacao.ok) {
          logAppError('Governanca: roteamento de pendencia invalido', new Error(validacao.motivo || 'Roteamento invalido'));
          return next;
        }

        const backendKey = originalDocKey(key);
        const documentoNome = backendKey.split('.').pop() || backendKey;
        const payloadGovernanca = montarPayloadPendencia({
          cliente,
          reserva,
          cadastro: reserva,
          corretor,
          origem: 'analista',
          destino: 'corretor',
          documentoId: backendKey,
          documentoNome,
          mensagem: next[key].descricao,
          prazo: next[key].prazo,
        });

        void apiClient.put(`/api/processos/${encodeURIComponent(reserva)}/documentos/${encodeURIComponent(backendKey)}/pendencia`, {
          ...next[key],
          ...payloadGovernanca,
        }).catch((error) => logAppError('Erro ao salvar pendencia na API FastAPI', error));
      }

      return next;
    });
  }

  async function updateCaixa(value: string) {
    const etapaAtual = caixaStages.findIndex(([stage]) => stage === caixa);
    const novaEtapa = caixaStages.findIndex(([stage]) => stage === value);
    const etapaEmitindo = caixaStages.findIndex(([stage]) => stage === 'emitindo_formularios');
    const voltandoAntesDosFormularios = etapaAtual >= etapaEmitindo && novaEtapa < etapaEmitindo;
    let temAnexoCaixa = false;

    if (reserva) {
      try {
        // TODO FastAPI: endpoint para verificar anexos Caixa do processo.
        const data = await apiClient.get<{ temAnexoCaixa?: boolean; uploads?: unknown[] }>(`/api/processos/${encodeURIComponent(reserva)}/uploads?grupo=caixa`);
        temAnexoCaixa = Boolean(data.temAnexoCaixa || data.uploads?.length);
      } catch (error) {
        logAppError('', error);
      }
    }

    if (reserva && voltandoAntesDosFormularios && temAnexoCaixa) {
      const confirmar = window.confirm('O formulario que esta em anexo sera perdido. Deseja continuar?');
      if (!confirmar) return;
      try {
        // TODO FastAPI: endpoint para remover anexos Caixa ao voltar etapa.
        await apiClient.delete(`/api/processos/${encodeURIComponent(reserva)}/uploads?grupo=caixa`);
      } catch (error) {
        logAppError('', error);
      }
      setUploadsCca({});
      setTemDocumentoEnviado(false);
    }

    setCaixa(value);
    if (reserva) {
      try {
        // TODO FastAPI: persistir status Caixa no endpoint definitivo.
        await apiClient.put(`/api/processos/${encodeURIComponent(reserva)}`, { caixa: value });
        localStorage.setItem('siocred_status_update', JSON.stringify({
          reserva,
          campo: 'caixa',
          valor: value,
          updatedAt: new Date().toISOString(),
        }));
      } catch (error) {
        logAppError('', error);
      }
    }
  }

  async function updateAgehab(value: string) {
    setAgehab(value);
    if (reserva) {
      try {
        // TODO FastAPI: persistir status Agehab no endpoint definitivo.
        await apiClient.put(`/api/processos/${encodeURIComponent(reserva)}`, { agehab: value });
        localStorage.setItem('siocred_status_update', JSON.stringify({
          reserva,
          campo: 'agehab',
          valor: value,
          updatedAt: new Date().toISOString(),
        }));
      } catch (error) {
        logAppError('', error);
      }
    }
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

  function isSafeDownloadUrl(url: string) {
    if (!url) return false;
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.protocol === 'https:' || parsed.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  async function salvarTudo() {
    if (!reserva || salvando || !dadosCarregados) return;
    setSalvando(true);
    setAvisoSalvar('Salvando checklist...');

    try {
      await apiClient.put(`/api/processos/${encodeURIComponent(reserva)}`, { caixa, agehab });

      await Promise.all([
        ...Object.entries(docMap).map(([key, status]) => (
          apiClient.put(`/api/processos/${encodeURIComponent(reserva)}/documentos/${encodeURIComponent(originalDocKey(key))}`, {
            status,
            updated_by: 'analista',
          })
        )),
        ...Object.entries(relMap).map(([key, status]) => (
          apiClient.put(`/api/processos/${encodeURIComponent(reserva)}/relacionamento/${encodeURIComponent(key)}`, {
            status,
            updated_by: 'analista',
          })
        )),
      ]);

      setAvisoSalvar('Checklist salvo com sucesso.');
      window.setTimeout(() => setAvisoSalvar(''), 3500);
    } catch (error) {
      logAppError('Erro ao salvar checklist do analista', error);
      setAvisoSalvar('Nao foi possivel salvar. Tente novamente.');
    } finally {
      setSalvando(false);
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
          <button className="react-save-top" type="button" onClick={salvarTudo} disabled={salvando || !dadosCarregados}>
            {salvando ? 'Salvando...' : dadosCarregados ? 'Salvar' : 'Carregando...'}
          </button>
          <a className="react-back-button" href="/analista">Voltar</a>
        </aside>
      </header>
      {avisoSalvar ? <div className="react-save-notice">{avisoSalvar}</div> : null}

      {dadosCarregados ? (
        <section className="react-stage-grid">
          <StageTimeline label="Kit Caixa" value={caixa || 'reserva'} onChange={updateCaixa} stages={caixaStages} tone="caixa" disabled={salvando} />
          <StageTimeline label="Kit Agehab" value={agehab || 'reserva'} onChange={updateAgehab} stages={agehabStages} tone="agehab" disabled={salvando} />
        </section>
      ) : (
        <section className="react-stage-grid">
          <div className="react-card react-loading-status">Carregando status Caixa e Agehab...</div>
        </section>
      )}

      <section className="react-card">
        <div className="react-section-head">
          <span>Proponente</span>
          <b>Identificacao do processo</b>
        </div>
        <div className="react-form-grid">
          <label>Nome completo<input value={cliente} readOnly placeholder="Nome do proponente" /></label>
          <label>Nº da reserva<input value={reserva} readOnly placeholder="Ex: 458712" /></label>
          <label>Cidade<input placeholder="Ex: Aguas Lindas de Goias" /></label>
          <label>Empreendimento<input placeholder="Nome do empreendimento" /></label>
          <label>Corretor responsavel<input placeholder="Nome do corretor" /></label>
          <label>Sinal ok?<select><option>Nao tem</option><option>Sim</option><option>Nao</option></select></label>
          <label>Fiador ok?<select><option>Nao tem</option><option>Sim</option><option>Nao</option></select></label>
          <label>Produto?<select><option>Pago</option><option>Negociado</option><option>Em aberto</option></select></label>
          <label>Estado civil<select><option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viuvo(a)</option><option>Uniao estavel</option></select></label>
          <label>Tipo de renda
            <select value={perfilRenda} onChange={(event) => setPerfilRenda(event.target.value)}>
              <option value="clt">CLT / Formal</option>
              <option value="informal">Informal / Autonomo</option>
              <option value="aposentado">Aposentado / Pensionista</option>
              <option value="domestico">Domestico / eSocial</option>
            </select>
          </label>
          <label>Tipo de dependente
            <select value={tipoDependente} onChange={(event) => setTipoDependente(event.target.value)}>
              {dependentes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>Dependente casado?<select><option>Nao</option><option>Sim</option></select></label>
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
                      const uploadCca = uploadsCca[key];
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
                            {uploadCca && isSafeDownloadUrl(uploadCca.data) ? (
                              <a className="react-doc-upload" href={uploadCca.data} target="_blank" rel="noreferrer">
                                {status === 'Enviado' ? 'Abrir para analise' : 'Baixar'}
                              </a>
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

          <article className="react-doc-section">
            <div className="react-doc-head">
              <div><h2>Relacionamento com o banco e produto</h2><p>Confirmacoes operacionais registradas com Sim, Nao ou N/A.</p></div>
            </div>
            <table>
              <thead><tr><th>Pergunta</th><th>Categoria</th><th>Status</th></tr></thead>
              <tbody>
                {relacionamento.map(([id, question, category]) => {
                  const status = relMap[id] || 'Não se Aplica';
                  return (
                    <tr key={id}>
                      <td><strong>{question}</strong></td>
                      <td>{category}</td>
                      <td>
                        <select className={classForStatus(status)} value={status} onChange={(event) => updateRel(id, event.target.value as RelStatus)}>
                          {relStatuses.map((item) => <option value={item} key={item}>{item === 'sim' ? 'Sim' : item === 'nao' ? 'Nao' : 'N/A'}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </article>
        </section>

        <aside className="react-card react-return">
          <h2>Retorno do Analista</h2>
          <p>Atualize observacoes e copie o resumo das pendencias visiveis.</p>
          <div className="react-cca-vinculado">
            <label>CCA Vinculado
              <select defaultValue="">
                <option value="" disabled>Selecione...</option>
                {ccasVinculados.map((cca) => <option value={cca} key={cca}>{cca}</option>)}
              </select>
            </label>
          </div>
          <label>Observacao do analista<textarea placeholder="Ex.: falta extrato bancario, IRPF ilegivel..." /></label>
          <label>Resumo automatico<textarea readOnly value={`${doneDocs}/${allDocs.length} documentos concluidos nas secoes visiveis.`} /></label>
          <button type="button" onClick={salvarTudo} disabled={salvando || !dadosCarregados}>
            {salvando ? 'Salvando...' : dadosCarregados ? 'Salvar tudo' : 'Carregando...'}
          </button>
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




