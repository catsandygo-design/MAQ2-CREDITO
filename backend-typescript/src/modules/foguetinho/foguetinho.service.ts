import { Injectable } from '@nestjs/common';

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

export interface FoguetinhoContext {
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
    incomeProfile: 'CLT' | 'AUTONOMO' | 'APOSENTADO' | 'OUTRO';
  };
}

export interface RuleHit {
  code: string;
  title: string;
  category: string;
  severity: 'ATTENTION' | 'BLOCK';
  autonomyLevel: AutonomyLevel;
  message: string;
  affectedField?: string;
  suggestedAction?: string;
}

abstract class FoguetinhoRule {
  abstract readonly code: string;
  abstract readonly title: string;
  abstract evaluate(context: FoguetinhoContext): RuleHit | null;
}

class FinancialCompositionRule extends FoguetinhoRule {
  readonly code = 'FRK-VALOR-001';
  readonly title = 'Composicao financeira insuficiente';

  evaluate(context: FoguetinhoContext): RuleHit | null {
    const coverage = context.financial.guaranteedValue + context.financial.chequeMoradia;
    if (coverage >= context.financial.saleValue) return null;
    const missingValue = context.financial.saleValue - coverage;
    return {
      code: this.code,
      title: this.title,
      category: 'financeiro',
      severity: 'ATTENTION',
      autonomyLevel: 1,
      message: `Faltam R$ ${missingValue.toFixed(2)} para sustentar o valor da venda.`,
      affectedField: 'saleValue',
      suggestedAction: 'Revisar valor, garantido ou composicao financeira antes de avancar.',
    };
  }
}

class RequiredDocumentsRule extends FoguetinhoRule {
  readonly code = 'FRK-DOC-001';
  readonly title = 'Documentos basicos nao enviados';

  evaluate(context: FoguetinhoContext): RuleHit | null {
    const missing: string[] = [];
    if (!context.documents.rgCpfSent) missing.push('RG/CPF');
    if (!context.documents.proofOfResidenceSent) missing.push('comprovante de residencia');
    if (missing.length === 0) return null;
    return {
      code: this.code,
      title: this.title,
      category: 'documental',
      severity: 'ATTENTION',
      autonomyLevel: 1,
      message: `Atencao: falta ${missing.join(' e ')}.`,
      affectedField: 'documents',
      suggestedAction: 'Completar dossie documental antes de avancar.',
    };
  }
}

class IncomeProofRule extends FoguetinhoRule {
  readonly code = 'FRK-RENDA-001';
  readonly title = 'Renda nao comprovada';

  evaluate(context: FoguetinhoContext): RuleHit | null {
    if (context.documents.incomeProofSent) return null;
    return {
      code: this.code,
      title: this.title,
      category: 'renda',
      severity: 'BLOCK',
      autonomyLevel: 4,
      message: 'Bloqueado: renda informada sem comprovante.',
      affectedField: 'incomeProofSent',
      suggestedAction: 'Solicitar comprovante de renda antes de enviar para CCA.',
    };
  }
}

class CltFgtsRule extends FoguetinhoRule {
  readonly code = 'FRK-FGTS-001';
  readonly title = 'FGTS nao validado para CLT';

  evaluate(context: FoguetinhoContext): RuleHit | null {
    if (context.documents.incomeProfile !== 'CLT' || context.documents.fgtsValidated) return null;
    return {
      code: this.code,
      title: this.title,
      category: 'fgts',
      severity: 'ATTENTION',
      autonomyLevel: 1,
      message: 'Atencao: perfil CLT sem FGTS validado.',
      affectedField: 'fgtsValidated',
      suggestedAction: 'Validar FGTS ou registrar motivo para seguir sem uso.',
    };
  }
}

export interface FoguetinhoEvaluation {
  status: 'viavel' | 'ajustar' | 'bloquear';
  summary: string;
  hits: RuleHit[];
}

@Injectable()
export class FoguetinhoService {
  private readonly rules: FoguetinhoRule[] = [
    new FinancialCompositionRule(),
    new RequiredDocumentsRule(),
    new IncomeProofRule(),
    new CltFgtsRule(),
  ];

  evaluate(context: FoguetinhoContext): FoguetinhoEvaluation {
    const hits = this.rules.flatMap((rule) => {
      const hit = rule.evaluate(context);
      return hit ? [hit] : [];
    });

    if (hits.some((hit) => hit.severity === 'BLOCK')) {
      return { status: 'bloquear', summary: 'Bloqueado por regra objetiva do Foguetinho.', hits };
    }
    if (hits.length > 0) {
      return { status: 'ajustar', summary: 'Existem pontos de atencao antes de avancar.', hits };
    }
    return { status: 'viavel', summary: 'Pode avancar: nenhuma pendencia critica encontrada.', hits: [] };
  }
}
