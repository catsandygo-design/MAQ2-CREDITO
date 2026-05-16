import type { FoguetinhoContext } from '../foguetinho-context';
import { FoguetinhoRule } from '../foguetinho-rule';
import { RuleSeverity, type RuleHit } from '../rule-hit';

export class CltFgtsRule extends FoguetinhoRule {
  readonly code = 'FRK-FGTS-001';
  readonly title = 'FGTS nao validado para CLT';

  evaluate(context: FoguetinhoContext): RuleHit | null {
    if (context.documents.incomeProfile !== 'CLT' || context.documents.fgtsValidated) {
      return null;
    }

    return {
      code: this.code,
      title: this.title,
      category: 'fgts',
      severity: RuleSeverity.ATTENTION,
      autonomyLevel: 1,
      message: 'Atencao: perfil CLT sem FGTS validado.',
      affectedField: 'fgtsValidated',
      suggestedAction: 'Validar FGTS ou registrar motivo para seguir sem uso.',
    };
  }
}
