import { Injectable } from '@nestjs/common';

import { CreditProcess } from '../processes/domain/process.entity';

export interface SignatureEligibilityResult {
  eligible: boolean;
  blockingReasons: string[];
}

@Injectable()
export class WorkflowService {
  evaluateSignatureEligibility(process: CreditProcess): SignatureEligibilityResult {
    if (process.isEligibleForSignature()) {
      return {
        eligible: true,
        blockingReasons: [],
      };
    }

    const snapshot = process.snapshot;
    const blockingReasons: string[] = [];

    if (snapshot.commercialStage !== 'VENDA_FINALIZADA') {
      blockingReasons.push('Comercial ainda nao esta em venda finalizada.');
    }

    if (snapshot.agehabStatus !== 'VALIDADO_AGEHAB') {
      blockingReasons.push('Agehab ainda nao validada.');
    }

    if (!['NAO_TEM', 'PAGO'].includes(snapshot.sinalStatus)) {
      blockingReasons.push('Sinal pendente.');
    }

    if (!['NAO_TEM', 'FINALIZADO', 'APROVADO'].includes(snapshot.fiadorStatus)) {
      blockingReasons.push('Fiador pendente.');
    }

    return {
      eligible: false,
      blockingReasons,
    };
  }
}
