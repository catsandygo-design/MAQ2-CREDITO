import type { FoguetinhoContext } from './foguetinho-context';
import type { RuleHit } from './rule-hit';

export abstract class FoguetinhoRule {
  abstract readonly code: string;
  abstract readonly title: string;

  abstract evaluate(context: FoguetinhoContext): RuleHit | null;
}
