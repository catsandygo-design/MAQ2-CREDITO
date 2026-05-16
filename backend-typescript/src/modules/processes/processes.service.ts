import { Injectable } from '@nestjs/common';

import {
  AgehabStatus,
  BinaryOperationalStatus,
  CaixaStatus,
  CommercialStage,
  GeneralStatus,
} from './domain/process-status';
import { CreditProcess } from './domain/process.entity';
import { ProcessResponseDto } from './dto/process-response.dto';

@Injectable()
export class ProcessesService {
  findExampleProcess(): ProcessResponseDto {
    const process = new CreditProcess({
      id: 'demo-processo-001',
      clientName: 'Cliente Demonstracao',
      empreendimento: 'Vila Girassol',
      commercialStage: CommercialStage.CREDITO,
      generalStatus: GeneralStatus.EM_ANDAMENTO,
      caixaStatus: CaixaStatus.ANALISE_CREDITO,
      agehabStatus: AgehabStatus.ANALISE_CREDITO,
      sinalStatus: BinaryOperationalStatus.NAO_TEM,
      fiadorStatus: BinaryOperationalStatus.NAO_TEM,
      createdAt: new Date(),
    });

    return ProcessResponseDto.fromDomain(process.snapshot, process.currentQueue(), process.isEligibleForSignature());
  }
}
