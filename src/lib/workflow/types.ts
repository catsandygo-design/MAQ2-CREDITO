export type UserRole = 'corretor' | 'analista' | 'cca' | 'gestor' | 'sistema';

export type ProcessoStatus =
  | 'novo_cv'
  | 'aguardando_upload_corretor'
  | 'documentacao_enviada'
  | 'em_analise_analista'
  | 'pendente_corretor'
  | 'aprovado_analista'
  | 'em_analise_cca'
  | 'pendente_cca_corretor'
  | 'aprovado_cca'
  | 'formularios_emitidos'
  | 'formularios_assinados_enviados'
  | 'kit_caixa_reserva_finalizado';

export type DocumentoStatus =
  | 'nao_enviado'
  | 'enviado'
  | 'bloqueado'
  | 'pendenciado_analista'
  | 'aprovado_analista'
  | 'pendenciado_cca'
  | 'aprovado_cca';

export type FormularioStatus = 'nao_emitido' | 'emitido' | 'assinado_enviado';

export interface DocumentoProcesso {
  id: string;
  nome: string;
  categoria: 'proponente' | 'conjuge' | 'dependente' | 'renda' | 'agehab' | 'produto';
  status: DocumentoStatus;
  arquivoUrl?: string;
  pendencia?: string;
  enviadoEm?: string;
  analisadoEm?: string;
}

export interface FormularioCredito {
  id: string;
  nome: string;
  status: FormularioStatus;
  arquivoUrl?: string;
  assinadoUrl?: string;
  emitidoEm?: string;
  enviadoAssinadoEm?: string;
}

export interface ProcessoEvento {
  id: string;
  ator: UserRole;
  acao: string;
  de?: ProcessoStatus;
  para?: ProcessoStatus;
  observacao?: string;
  criadoEm: string;
}

export interface ProcessoCredito {
  id: string;
  reserva: string;
  cliente: string;
  corretor: string;
  analista?: string;
  cca?: string;
  origem: 'cv' | 'manual';
  status: ProcessoStatus;
  uploadLiberadoCorretor: boolean;
  documentos: DocumentoProcesso[];
  formularios: FormularioCredito[];
  eventos: ProcessoEvento[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface WorkflowActionResult {
  processo: ProcessoCredito;
  mensagem: string;
}
