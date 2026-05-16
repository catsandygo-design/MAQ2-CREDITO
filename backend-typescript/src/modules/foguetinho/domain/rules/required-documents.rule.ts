import type { FoguetinhoContext } from '../foguetinho-context';
import { FoguetinhoRule } from '../foguetinho-rule';
import { RuleSeverity, type RuleHit } from '../rule-hit';

export class RequiredDocumentsRule extends FoguetinhoRule {
  readonly code = 'FRK-DOC-001';
  readonly title = 'Documentos basicos nao enviados';

  evaluate(context: FoguetinhoContext): RuleHit | null {
    const missing: string[] = [];

    if (!context.documents.rgCpfSent) {
      missing.push('RG/CPF');
    }

    if (!context.documents.proofOfResidenceSent) {
      missing.push('comprovante de residencia');
    }

    if (missing.length === 0) {
      return null;
    }

    return {
      code: this.code,
      title: this.title,
      category: 'documental',
      severity: RuleSeverity.ATTENTION,
      autonomyLevel: 1,
      message: `Atencao: falta ${missing.join(' e ')}.`,
      affectedField: 'documents',
      suggestedAction: 'Completar dossie documental antes de avancar.',
    };
  }
}
