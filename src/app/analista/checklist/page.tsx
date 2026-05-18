'use client';

import { useEffect, useMemo, useState } from 'react';

type DocumentoStatus = 'IDLE' | 'ENVIADO' | 'EM_ANALISE' | 'PENDENTE' | 'APROVADO';

interface DocumentoWorkflow {
  docId: string;
  nome: string;
  categoria: string;
  cliente: string;
  reserva: string;
  status: DocumentoStatus;
  fileName?: string;
  fileUrl?: string;
  observacao?: string;
  updatedAt?: string;
  visualizadoEm?: string;
}

const workflowStorageKey = 'maq2_document_workflow_v1';

const documentosBase: DocumentoWorkflow[] = [
  {
    docId: 'documentos-do-proponente-identidade-e-cpf-1',
    nome: 'Identidade e CPF',
    categoria: 'Proponente',
    cliente: 'Ana Paula Ribeiro',
    reserva: '458713',
    status: 'IDLE',
  },
  {
    docId: 'documentos-do-proponente-comprovante-de-residencia-3',
    nome: 'Comprovante de residencia',
    categoria: 'Proponente',
    cliente: 'Ana Paula Ribeiro',
    reserva: '458713',
    status: 'IDLE',
  },
  {
    docId: 'documentos-do-proponente-extrato-fgts-5',
    nome: 'Extrato FGTS',
    categoria: 'Renda',
    cliente: 'Matheus Alves de Melo',
    reserva: '458712',
    status: 'IDLE',
  },
  {
    docId: 'documentos-agehab-ficha-agehab-6',
    nome: 'Ficha Agehab',
    categoria: 'Agehab',
    cliente: 'Carlos Henrique Souza',
    reserva: '458714',
    status: 'IDLE',
  },
];

function readWorkflowState(): Record<string, DocumentoWorkflow> {
  if (typeof window === 'undefined') return {};

  try {
    return JSON.parse(window.localStorage.getItem(workflowStorageKey) || '{}') as Record<string, DocumentoWorkflow>;
  } catch {
    return {};
  }
}

function writeWorkflowState(nextState: Record<string, DocumentoWorkflow>) {
  window.localStorage.setItem(workflowStorageKey, JSON.stringify(nextState));
  window.dispatchEvent(new Event('maq2-workflow-updated'));
}

function statusLabel(status: DocumentoStatus) {
  const labels: Record<DocumentoStatus, string> = {
    IDLE: 'Aguardando',
    ENVIADO: 'Abrir documento',
    EM_ANALISE: 'Em analise',
    PENDENTE: 'Pendenciado',
    APROVADO: 'Aprovado',
  };

  return labels[status];
}

export default function ChecklistAnalistaPage() {
  const [workflow, setWorkflow] = useState<Record<string, DocumentoWorkflow>>({});
  const [openedDoc, setOpenedDoc] = useState<DocumentoWorkflow | null>(null);
  const [viewedDocs, setViewedDocs] = useState<Record<string, boolean>>({});

  const documentos = useMemo(() => {
    const merged = new Map<string, DocumentoWorkflow>();

    documentosBase.forEach((doc) => {
      merged.set(doc.docId, { ...doc, ...(workflow[doc.docId] || {}) });
    });

    Object.values(workflow).forEach((doc) => {
      merged.set(doc.docId, doc);
    });

    return Array.from(merged.values()).sort((a, b) => {
      const aReady = a.status === 'ENVIADO' || a.status === 'EM_ANALISE' ? 0 : 1;
      const bReady = b.status === 'ENVIADO' || b.status === 'EM_ANALISE' ? 0 : 1;
      return aReady - bReady || a.cliente.localeCompare(b.cliente);
    });
  }, [workflow]);

  const enviados = documentos.filter((doc) => doc.status === 'ENVIADO' || doc.status === 'EM_ANALISE').length;
  const pendentes = documentos.filter((doc) => doc.status === 'PENDENTE').length;
  const aprovados = documentos.filter((doc) => doc.status === 'APROVADO').length;

  useEffect(() => {
    const refresh = () => setWorkflow(readWorkflowState());
    refresh();

    const interval = window.setInterval(refresh, 2500);
    window.addEventListener('storage', refresh);
    window.addEventListener('maq2-workflow-updated', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('maq2-workflow-updated', refresh);
    };
  }, []);

  const updateDoc = (docId: string, patch: Partial<DocumentoWorkflow>) => {
    const current = readWorkflowState();
    const base = documentos.find((doc) => doc.docId === docId) || documentosBase.find((doc) => doc.docId === docId);
    if (!base) return;

    const next = {
      ...current,
      [docId]: {
        ...base,
        ...(current[docId] || {}),
        ...patch,
        docId,
        updatedAt: new Date().toISOString(),
      },
    };

    writeWorkflowState(next);
    setWorkflow(next);
  };

  const openDocument = (doc: DocumentoWorkflow) => {
    updateDoc(doc.docId, {
      status: 'EM_ANALISE',
      visualizadoEm: new Date().toISOString(),
    });
    setOpenedDoc({ ...doc, status: 'EM_ANALISE' });
  };

  const closeDocument = () => {
    if (openedDoc) {
      setViewedDocs((current) => ({ ...current, [openedDoc.docId]: true }));
    }
    setOpenedDoc(null);
  };

  const decideDocument = (doc: DocumentoWorkflow, status: 'APROVADO' | 'PENDENTE') => {
    updateDoc(doc.docId, {
      status,
      observacao: status === 'PENDENTE' ? 'Documento pendenciado pelo analista. Corrigir e reenviar.' : '',
    });
    setViewedDocs((current) => ({ ...current, [doc.docId]: true }));
  };

  return (
    <main className="analyst-review-page">
      <header className="analyst-review-hero">
        <div>
          <span>Analise documental</span>
          <h1>Checklist do Analista</h1>
          <p>Valide os documentos enviados pelo corretor antes de liberar o processo para o CCA.</p>
        </div>
        <a href="/painel/acompanhamento">Acompanhamento</a>
      </header>

      <section className="analyst-review-kpis" aria-label="Resumo documental">
        <article>
          <span>Recebidos</span>
          <strong>{enviados}</strong>
          <small>Aguardando abertura ou decisao</small>
        </article>
        <article>
          <span>Pendenciados</span>
          <strong>{pendentes}</strong>
          <small>Liberam novo envio ao corretor</small>
        </article>
        <article>
          <span>Aprovados</span>
          <strong>{aprovados}</strong>
          <small>Prontos para seguir ao CCA</small>
        </article>
      </section>

      <section className="analyst-review-board">
        <div className="analyst-review-head">
          <div>
            <span>Fila documental</span>
            <h2>Documentos por cliente</h2>
          </div>
          <strong>{documentos.length} itens</strong>
        </div>

        <div className="analyst-review-list">
          {documentos.map((doc) => {
            const canOpen = doc.status === 'ENVIADO' || doc.status === 'EM_ANALISE';
            const canDecide = viewedDocs[doc.docId] || doc.status === 'APROVADO' || doc.status === 'PENDENTE';

            return (
              <article className={`analyst-review-card status-${doc.status.toLowerCase()}`} key={doc.docId}>
                <div className="analyst-review-card-main">
                  <span className="analyst-review-reserva">Reserva {doc.reserva || '-'}</span>
                  <h3>{doc.cliente || '-'}</h3>
                  <p>{doc.nome}</p>
                  <div className="analyst-review-meta">
                    <span>{doc.categoria}</span>
                    {doc.fileName ? <span>{doc.fileName}</span> : <span>Sem arquivo recebido</span>}
                  </div>
                </div>

                <div className="analyst-review-action">
                  {canOpen && !canDecide ? (
                    <button className="analyst-doc-open" type="button" onClick={() => openDocument(doc)}>
                      Abrir documento
                    </button>
                  ) : (
                    <span className={`analyst-review-state analyst-doc-status-${doc.status.toLowerCase()}`}>
                      {statusLabel(doc.status)}
                    </span>
                  )}

                  {canDecide ? (
                    <select
                      className="analyst-doc-decision"
                      value={doc.status === 'APROVADO' || doc.status === 'PENDENTE' ? doc.status : ''}
                      onChange={(event) => {
                        const nextStatus = event.target.value;
                        if (nextStatus === 'APROVADO' || nextStatus === 'PENDENTE') {
                          decideDocument(doc, nextStatus);
                        }
                      }}
                    >
                      <option value="">Selecionar decisao</option>
                      <option value="APROVADO">Aprovado</option>
                      <option value="PENDENTE">Pendenciado</option>
                    </select>
                  ) : (
                    <small>{canOpen ? 'Abra para liberar a decisao' : 'Aguardando envio do corretor'}</small>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {openedDoc ? (
        <div className="analyst-doc-modal" role="dialog" aria-modal="true" aria-label="Auditoria de documento">
          <div className="analyst-doc-modal-card">
            <div className="analyst-doc-modal-head">
              <div>
                <span>Auditoria de documento</span>
                <h3>{openedDoc.nome}</h3>
                <p>{openedDoc.cliente} - reserva {openedDoc.reserva || '-'}</p>
              </div>
              <button type="button" onClick={closeDocument}>Fechar e avaliar</button>
            </div>
            <div className="analyst-doc-viewer">
              <iframe
                src={openedDoc.fileUrl || '/checklist_documentos_upload_com_formulario.html'}
                title={`Documento ${openedDoc.nome}`}
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
