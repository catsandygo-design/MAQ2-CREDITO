import type {
  DocumentoProcesso,
  FormularioCredito,
  ProcessoCredito,
  ProcessoEvento,
  ProcessoStatus,
  UserRole,
  WorkflowActionResult,
} from './types';

function now() {
  return new Date().toISOString();
}

function event(
  ator: UserRole,
  acao: string,
  de?: ProcessoStatus,
  para?: ProcessoStatus,
  observacao?: string,
): ProcessoEvento {
  return {
    id: crypto.randomUUID(),
    ator,
    acao,
    de,
    para,
    observacao,
    criadoEm: now(),
  };
}

function transition(
  processo: ProcessoCredito,
  para: ProcessoStatus,
  ator: UserRole,
  acao: string,
  observacao?: string,
  uploadLiberadoCorretor = processo.uploadLiberadoCorretor,
): ProcessoCredito {
  const de = processo.status;

  return {
    ...processo,
    status: para,
    uploadLiberadoCorretor,
    atualizadoEm: now(),
    eventos: [event(ator, acao, de, para, observacao), ...processo.eventos],
  };
}

function assertRole(role: UserRole, allowed: UserRole[]) {
  if (!allowed.includes(role)) {
    throw new Error(`Acao nao permitida para perfil ${role}.`);
  }
}

function assertStatus(processo: ProcessoCredito, allowed: ProcessoStatus[]) {
  if (!allowed.includes(processo.status)) {
    throw new Error(`Status atual nao permite esta acao: ${processo.status}.`);
  }
}

export function criarProcessoCv(input: {
  reserva: string;
  cliente: string;
  corretor: string;
  documentos?: DocumentoProcesso[];
}): ProcessoCredito {
  const createdAt = now();

  return {
    id: crypto.randomUUID(),
    reserva: input.reserva,
    cliente: input.cliente,
    corretor: input.corretor,
    origem: 'cv',
    status: 'aguardando_upload_corretor',
    uploadLiberadoCorretor: true,
    documentos: input.documentos ?? documentosPadrao(),
    formularios: [],
    eventos: [event('sistema', 'Cliente recebido da integracao CV', undefined, 'aguardando_upload_corretor')],
    criadoEm: createdAt,
    atualizadoEm: createdAt,
  };
}

export function enviarDocumentosCorretor(
  processo: ProcessoCredito,
  arquivos: Array<{ documentoId: string; arquivoUrl: string }>,
): WorkflowActionResult {
  assertRole('corretor', ['corretor']);

  if (!processo.uploadLiberadoCorretor) {
    throw new Error('Upload bloqueado. Aguarde analise ou nova pendencia.');
  }

  assertStatus(processo, ['aguardando_upload_corretor', 'pendente_corretor', 'pendente_cca_corretor']);

  const enviados = new Map(arquivos.map((arquivo) => [arquivo.documentoId, arquivo.arquivoUrl]));
  const documentos = processo.documentos.map((doc) => {
    const arquivoUrl = enviados.get(doc.id);
    if (!arquivoUrl) return doc;

    return {
      ...doc,
      status: 'enviado' as const,
      arquivoUrl,
      pendencia: undefined,
      enviadoEm: now(),
    };
  });

  return {
    processo: transition(
      { ...processo, documentos },
      'em_analise_analista',
      'corretor',
      'Documentacao enviada para analise do analista',
      undefined,
      false,
    ),
    mensagem: 'Documentacao enviada. Upload do corretor bloqueado ate nova pendencia.',
  };
}

export function aprovarDocumentacaoAnalista(processo: ProcessoCredito, analista: string): WorkflowActionResult {
  assertStatus(processo, ['em_analise_analista', 'documentacao_enviada']);

  const documentos = processo.documentos.map((doc) =>
    doc.status === 'enviado' ? { ...doc, status: 'aprovado_analista' as const, analisadoEm: now() } : doc,
  );

  return {
    processo: transition(
      { ...processo, analista, documentos },
      'em_analise_cca',
      'analista',
      'Analista aprovou documentacao e enviou para o CCA analisar',
      undefined,
      false,
    ),
    mensagem: 'Documentacao aprovada pelo analista e enviada ao CCA.',
  };
}

export function pendenciarDocumentacaoAnalista(
  processo: ProcessoCredito,
  documentoIds: string[],
  motivo: string,
): WorkflowActionResult {
  assertStatus(processo, ['em_analise_analista', 'documentacao_enviada']);

  const pendencias = new Set(documentoIds);
  const documentos = processo.documentos.map((doc) =>
    pendencias.has(doc.id)
      ? { ...doc, status: 'pendenciado_analista' as const, pendencia: motivo, analisadoEm: now() }
      : doc,
  );

  return {
    processo: transition(
      { ...processo, documentos },
      'pendente_corretor',
      'analista',
      'Analista pendenciou documentacao e liberou novo upload ao corretor',
      motivo,
      true,
    ),
    mensagem: 'Pendencia aberta pelo analista. Upload liberado ao corretor.',
  };
}

export function aprovarDocumentacaoCca(processo: ProcessoCredito, cca: string): WorkflowActionResult {
  assertStatus(processo, ['em_analise_cca']);

  const documentos = processo.documentos.map((doc) =>
    doc.status === 'aprovado_analista' || doc.status === 'enviado'
      ? { ...doc, status: 'aprovado_cca' as const, analisadoEm: now() }
      : doc,
  );

  return {
    processo: transition(
      { ...processo, cca, documentos },
      'aprovado_cca',
      'cca',
      'CCA validou documentos',
      undefined,
      false,
    ),
    mensagem: 'Documentacao validada pelo CCA. Formularios podem ser emitidos.',
  };
}

export function pendenciarDocumentacaoCca(
  processo: ProcessoCredito,
  documentoIds: string[],
  motivo: string,
): WorkflowActionResult {
  assertStatus(processo, ['em_analise_cca']);

  const pendencias = new Set(documentoIds);
  const documentos = processo.documentos.map((doc) =>
    pendencias.has(doc.id)
      ? { ...doc, status: 'pendenciado_cca' as const, pendencia: motivo, analisadoEm: now() }
      : doc,
  );

  return {
    processo: transition(
      { ...processo, documentos },
      'pendente_cca_corretor',
      'cca',
      'CCA pendenciou documentacao e liberou novo upload ao corretor',
      motivo,
      true,
    ),
    mensagem: 'Pendencia aberta pelo CCA. Upload liberado ao corretor.',
  };
}

export function emitirFormulariosCca(
  processo: ProcessoCredito,
  formularios: Array<Pick<FormularioCredito, 'nome' | 'arquivoUrl'>>,
): WorkflowActionResult {
  assertStatus(processo, ['aprovado_cca']);

  return {
    processo: transition(
      {
        ...processo,
        formularios: formularios.map((formulario) => ({
          id: crypto.randomUUID(),
          nome: formulario.nome,
          arquivoUrl: formulario.arquivoUrl,
          status: 'emitido',
          emitidoEm: now(),
        })),
      },
      'formularios_emitidos',
      'cca',
      'CCA emitiu formularios para credito e corretor',
      undefined,
      false,
    ),
    mensagem: 'Formularios emitidos. Corretor pode baixar, colher assinatura e reenviar.',
  };
}

export function enviarFormulariosAssinados(
  processo: ProcessoCredito,
  assinados: Array<{ formularioId: string; assinadoUrl: string }>,
): WorkflowActionResult {
  assertStatus(processo, ['formularios_emitidos']);

  const assinadosMap = new Map(assinados.map((formulario) => [formulario.formularioId, formulario.assinadoUrl]));
  const formularios = processo.formularios.map((formulario) => {
    const assinadoUrl = assinadosMap.get(formulario.id);
    if (!assinadoUrl) return formulario;

    return {
      ...formulario,
      status: 'assinado_enviado' as const,
      assinadoUrl,
      enviadoAssinadoEm: now(),
    };
  });

  const todosAssinados = formularios.length > 0 && formularios.every((formulario) => formulario.status === 'assinado_enviado');

  return {
    processo: transition(
      { ...processo, formularios },
      todosAssinados ? 'kit_caixa_reserva_finalizado' : 'formularios_assinados_enviados',
      'corretor',
      todosAssinados ? 'Kit Caixa Reserva finalizado' : 'Corretor enviou formularios assinados',
      undefined,
      false,
    ),
    mensagem: todosAssinados ? 'Processo Kit Caixa Reserva finalizado.' : 'Formularios assinados recebidos.',
  };
}

export function documentosPadrao(): DocumentoProcesso[] {
  return [
    ['rg-cpf', 'RG e CPF do proponente', 'proponente'],
    ['comprovante-residencia', 'Comprovante de residencia', 'proponente'],
    ['comprovante-renda', 'Comprovante de renda', 'renda'],
    ['extrato-fgts', 'Extrato FGTS', 'renda'],
    ['ficha-agehab', 'Ficha Agehab', 'agehab'],
    ['produto', 'Ciencia do produto', 'produto'],
  ].map(([id, nome, categoria]) => ({
    id,
    nome,
    categoria: categoria as DocumentoProcesso['categoria'],
    status: 'nao_enviado',
  }));
}
