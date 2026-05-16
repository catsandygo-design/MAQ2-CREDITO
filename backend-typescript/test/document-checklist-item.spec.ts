import { DomainError } from '../src/shared/domain/domain-error';
import { DocumentChecklistItem } from '../src/modules/documents/domain/document-checklist-item.entity';
import { DocumentCreditStatus, DocumentStatus } from '../src/modules/documents/domain/document-status';

describe('DocumentChecklistItem', () => {
  it('exige motivo quando o documento esta pendenciado', () => {
    expect(
      () =>
        new DocumentChecklistItem({
          id: 'd1',
          processId: 'p1',
          name: 'Comprovante de renda',
          category: 'proponente',
          status: DocumentStatus.PENDENTE,
          creditStatus: DocumentCreditStatus.PENDENCIADO,
        }),
    ).toThrow(DomainError);
  });
});
