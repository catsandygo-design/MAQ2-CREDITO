import type { FoguetinhoContext } from '../foguetinho-context';
import { FoguetinhoRule } from '../foguetinho-rule';
import { RuleSeverity, type RuleHit } from '../rule-hit';

export class IncomeProofRule extends FoguetinhoRule {
  readonly code = 'FRK-RENDA-001';
  readonly title = 'Renda nao comprovada';

  evaluate(context: FoguetinhoContext): RuleHit | null {
    if (context.documents.incomeProofSent) {
      return null;
    }

    return {
      code: this.code,
      title: this.title,
      category: 'renda',
      severity: RuleSeverity.BLOCK,
      autonomyLevel: 4,
      message: 'Bloqueado: renda informada sem comprovante.',
      affectedField: 'incomeProofSent',
      suggestedAction: 'Solicitar comprovante de renda antes de enviar para CCA.',
    };
  }
}
