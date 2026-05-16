import type { FoguetinhoContext } from '../foguetinho-context';
import { FoguetinhoRule } from '../foguetinho-rule';
import { RuleSeverity, type RuleHit } from '../rule-hit';

export class FinancialCompositionRule extends FoguetinhoRule {
  readonly code = 'FRK-VALOR-001';
  readonly title = 'Composicao financeira insuficiente';

  evaluate(context: FoguetinhoContext): RuleHit | null {
    const coverage = context.financial.guaranteedValue + context.financial.chequeMoradia;

    if (coverage >= context.financial.saleValue) {
      return null;
    }

    const missingValue = context.financial.saleValue - coverage;

    return {
      code: this.code,
      title: this.title,
      category: 'financeiro',
      severity: RuleSeverity.ATTENTION,
      autonomyLevel: 1,
      message: `Faltam R$ ${missingValue.toFixed(2)} para sustentar o valor da venda.`,
      affectedField: 'saleValue',
      suggestedAction: 'Revisar valor, garantido ou composicao financeira antes de avancar.',
    };
  }
}
