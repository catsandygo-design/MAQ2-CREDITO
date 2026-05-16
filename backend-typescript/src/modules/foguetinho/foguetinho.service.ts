import { Injectable } from '@nestjs/common';

import type { FoguetinhoContext } from './domain/foguetinho-context';
import { FoguetinhoRule } from './domain/foguetinho-rule';
import { CltFgtsRule } from './domain/rules/clt-fgts.rule';
import { FinancialCompositionRule } from './domain/rules/financial-composition.rule';
import { IncomeProofRule } from './domain/rules/income-proof.rule';
import { RequiredDocumentsRule } from './domain/rules/required-documents.rule';
import { RuleSeverity, type RuleHit } from './domain/rule-hit';

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

    if (hits.some((hit) => hit.severity === RuleSeverity.BLOCK)) {
      return {
        status: 'bloquear',
        summary: 'Bloqueado por regra objetiva do Foguetinho.',
        hits,
      };
    }

    if (hits.length > 0) {
      return {
        status: 'ajustar',
        summary: 'Existem pontos de atencao antes de avancar.',
        hits,
      };
    }

    return {
      status: 'viavel',
      summary: 'Pode avancar: nenhuma pendencia critica encontrada.',
      hits: [],
    };
  }
}
