import { Injectable } from '@nestjs/common';

import { DocumentChecklistItem } from './domain/document-checklist-item.entity';
import { DocumentCreditStatus, DocumentStatus } from './domain/document-status';

@Injectable()
export class DocumentsService {
  createExampleDocument(): DocumentChecklistItem {
    return new DocumentChecklistItem({
      id: 'demo-documento-001',
      processId: 'demo-processo-001',
      name: 'Comprovante de renda',
      category: 'proponente',
      status: DocumentStatus.PENDENTE,
      creditStatus: DocumentCreditStatus.PENDENCIADO,
      pendingReason: 'Renda informada precisa de comprovante legivel.',
    });
  }
}
