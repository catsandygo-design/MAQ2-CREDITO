import { DomainError } from '../../../shared/domain/domain-error';
import { DocumentCreditStatus, DocumentStatus } from './document-status';

export interface DocumentChecklistItemProps {
  id: string;
  processId: string;
  name: string;
  category: string;
  status: DocumentStatus;
  creditStatus: DocumentCreditStatus;
  pendingReason?: string;
}

export class DocumentChecklistItem {
  constructor(private readonly props: DocumentChecklistItemProps) {
    this.validate();
  }

  get snapshot(): DocumentChecklistItemProps {
    return { ...this.props };
  }

  private validate(): void {
    const needsReason = [DocumentCreditStatus.PENDENCIADO, DocumentCreditStatus.REPROVADO].includes(
      this.props.creditStatus,
    );

    if (needsReason && !this.props.pendingReason?.trim()) {
      throw new DomainError('Documento pendenciado ou reprovado exige motivo.', 'DOCUMENT_PENDING_REASON_REQUIRED');
    }
  }

  isOperationallyResolved(): boolean {
    return [DocumentStatus.APROVADO, DocumentStatus.NAO_APLICA].includes(this.props.status);
  }
}
