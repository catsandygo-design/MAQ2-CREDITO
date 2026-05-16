import type { VercelRequest, VercelResponse } from '@vercel/node';

type IncomeProfile = 'CLT' | 'AUTONOMO' | 'APOSENTADO' | 'OUTRO';

type FoguetinhoContext = {
  financial: {
    saleValue: number;
    guaranteedValue: number;
    chequeMoradia: number;
    grossIncome?: number;
  };
  documents: {
    rgCpfSent: boolean;
    proofOfResidenceSent: boolean;
    incomeProofSent: boolean;
    fgtsValidated: boolean;
    incomeProfile: IncomeProfile;
  };
};

type RuleHit = {
  code: string;
  title: string;
  category: string;
  severity: 'ATTENTION' | 'BLOCK';
  autonomyLevel: 0 | 1 | 2 | 3 | 4;
  message: string;
  affectedField?: string;
  suggestedAction?: string;
};

function evaluate(context: FoguetinhoContext) {
  const hits: RuleHit[] = [];
  const coverage = context.financial.guaranteedValue + context.financial.chequeMoradia;

  if (coverage < context.financial.saleValue) {
    const missingValue = context.financial.saleValue - coverage;
    hits.push({
      code: 'FRK-VALOR-001',
      title: 'Composicao financeira insuficiente',
      category: 'financeiro',
      severity: 'ATTENTION',
      autonomyLevel: 1,
      message: `Faltam R$ ${missingValue.toFixed(2)} para sustentar o valor da venda.`,
      affectedField: 'saleValue',
      suggestedAction: 'Revisar valor, garantido ou composicao financeira antes de avancar.',
    });
  }

  const missingDocuments: string[] = [];
  if (!context.documents.rgCpfSent) missingDocuments.push('RG/CPF');
  if (!context.documents.proofOfResidenceSent) missingDocuments.push('comprovante de residencia');
  if (missingDocuments.length > 0) {
    hits.push({
      code: 'FRK-DOC-001',
      title: 'Documentos basicos nao enviados',
      category: 'documental',
      severity: 'ATTENTION',
      autonomyLevel: 1,
      message: `Atencao: falta ${missingDocuments.join(' e ')}.`,
      affectedField: 'documents',
      suggestedAction: 'Completar dossie documental antes de avancar.',
    });
  }

  if (!context.documents.incomeProofSent) {
    hits.push({
      code: 'FRK-RENDA-001',
      title: 'Renda nao comprovada',
      category: 'renda',
      severity: 'BLOCK',
      autonomyLevel: 4,
      message: 'Bloqueado: renda informada sem comprovante.',
      affectedField: 'incomeProofSent',
      suggestedAction: 'Solicitar comprovante de renda antes de enviar para CCA.',
    });
  }

  if (context.documents.incomeProfile === 'CLT' && !context.documents.fgtsValidated) {
    hits.push({
      code: 'FRK-FGTS-001',
      title: 'FGTS nao validado para CLT',
      category: 'fgts',
      severity: 'ATTENTION',
      autonomyLevel: 1,
      message: 'Atencao: perfil CLT sem FGTS validado.',
      affectedField: 'fgtsValidated',
      suggestedAction: 'Validar FGTS ou registrar motivo para seguir sem uso.',
    });
  }

  if (hits.some((hit) => hit.severity === 'BLOCK')) {
    return { status: 'bloquear', summary: 'Bloqueado por regra objetiva do Foguetinho.', hits };
  }
  if (hits.length > 0) {
    return { status: 'ajustar', summary: 'Existem pontos de atencao antes de avancar.', hits };
  }
  return { status: 'viavel', summary: 'Pode avancar: nenhuma pendencia critica encontrada.', hits };
}

export default function handler(request: VercelRequest, response: VercelResponse): void {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Metodo nao permitido' });
    return;
  }

  const context = request.body as FoguetinhoContext;
  response.status(200).json(evaluate(context));
}
