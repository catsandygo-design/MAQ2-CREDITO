import { apiUrl } from './api/proxy';
import { createClient } from './supabase/client';

export interface DocumentAnalysisResult {
  status: "APROVADO" | "PENDENTE" | "REJEITADO";
  motivo: string;
  dadosExtraidos: string;
  tipoIdentificado: string;
  tipoConfere: boolean;
  dataEmissao?: string | null;
  dataNascimento?: string | null;
  dataReferencia?: string | null;
  validadeAte?: string | null;
  validacoes: Array<{
    regra: string;
    resultado: 'APROVADO' | 'PENDENTE' | 'REJEITADO';
    detalhe: string;
  }>;
}

/**
 * Analisa um documento usando o backend FastAPI; a chave fica somente no servidor.
 * A chave da API fica APENAS no servidor — nunca no navegador.
 */
export async function analyzeDocument(
  file: File,
  documentType: string
): Promise<DocumentAnalysisResult> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Faça login novamente para usar a triagem por IA.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);

  const response = await fetch(apiUrl('/api/processos/gemini/analyze'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.detail || 'Não foi possível analisar o documento.');
  }
  return body as DocumentAnalysisResult;
}
