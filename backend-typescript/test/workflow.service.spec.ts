import { CreditProcess } from '../src/modules/processes/domain/process.entity';
import {
  AgehabStatus,
  BinaryOperationalStatus,
  CaixaStatus,
  CommercialStage,
  GeneralStatus,
} from '../src/modules/processes/domain/process-status';
import { WorkflowService } from '../src/modules/workflow/workflow.service';

describe('WorkflowService', () => {
  it('explica bloqueio de assinatura quando Agehab nao esta validada', () => {
    const service = new WorkflowService();
    const process = new CreditProcess({
      id: 'p1',
      clientName: 'Cliente Teste',
      empreendimento: 'Vila Girassol',
      commercialStage: CommercialStage.VENDA_FINALIZADA,
      generalStatus: GeneralStatus.EM_ANDAMENTO,
      caixaStatus: CaixaStatus.APROVADO,
      agehabStatus: AgehabStatus.PENDENTE_AGEHAB,
      sinalStatus: BinaryOperationalStatus.PAGO,
      fiadorStatus: BinaryOperationalStatus.NAO_TEM,
      createdAt: new Date(),
    });

    const result = service.evaluateSignatureEligibility(process);

    expect(result.eligible).toBe(false);
    expect(result.blockingReasons).toContain('Agehab ainda nao validada.');
  });
});
