import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(apiKey);

// We use gemini-1.5-flash as requested, good for multimodal tasks and free tier
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export interface DocumentAnalysisResult {
  status: "APROVADO" | "PENDENTE" | "REJEITADO";
  motivo: string;
  dadosExtraidos: string;
}

/**
 * Função para converter um arquivo File (PDF ou Imagem) em um formato legível pelo Gemini.
 */
async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type
    },
  };
}

/**
 * Analisa um documento usando o Gemini 1.5 Flash.
 * @param file O arquivo a ser analisado
 * @param documentType O tipo de documento selecionado
 * @returns Um objeto JSON contendo status, motivo e dadosExtraidos
 */
export async function analyzeDocument(file: File, documentType: string): Promise<DocumentAnalysisResult> {
  try {
    const prompt = `Você é o MAQ2 Triagem Assistant, especialista em documentos de crédito imobiliário Caixa e Agehab.
Analise o documento anexado do tipo "${documentType}" e verifique sua legibilidade, validade e coerência.

Por favor, extraia os seguintes dados, se aplicável ao tipo de documento:
- Para RG/CNH: Nome completo, CPF, RG, Data de Nascimento e Data de Emissão.
- Para Comprovante de Endereço: CEP, Logradouro, Bairro, Cidade, Estado e Data de Vencimento/Emissão (deve ser menor que 3 meses).
- Para Comprovante de Renda (Holerite): Nome da Empresa, Salário Bruto, Salário Líquido e Mês de Referência.

Responda ESTRITAMENTE em formato JSON com o seguinte esquema exato:
{
  "status": "APROVADO" | "PENDENTE" | "REJEITADO",
  "motivo": "Parecer claro e resumido do motivo da aprovação ou rejeição",
  "dadosExtraidos": "Resumo em texto ou chave-valor dos principais dados identificados. Se faltar algo crítico, mencione."
}`;

    const filePart = await fileToGenerativePart(file);

    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    const text = response.text();

    // Em alguns casos a IA pode retornar o JSON dentro de blocos de código markdown (```json ... ```)
    const jsonStr = text.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(jsonStr) as DocumentAnalysisResult;
    
    // Garantir que os campos existam para evitar quebras na UI
    return {
      status: parsed.status || "PENDENTE",
      motivo: parsed.motivo || "Não foi possível extrair um parecer.",
      dadosExtraidos: parsed.dadosExtraidos || "",
    };
  } catch (error) {
    console.error("Erro na análise do documento pelo Gemini:", error);
    return {
      status: "PENDENTE",
      motivo: "Erro ao processar o documento com IA.",
      dadosExtraidos: "",
    };
  }
}
