import { CurrentQueue } from '../domain/process-status';
import type { ProcessProps } from '../domain/process.entity';

export class ProcessResponseDto {
  id: string;
  clientName: string;
  empreendimento: string;
  queue: CurrentQueue;
  eligibleForSignature: boolean;

  static fromDomain(snapshot: ProcessProps, queue: CurrentQueue, eligibleForSignature: boolean): ProcessResponseDto {
    return {
      id: snapshot.id,
      clientName: snapshot.clientName,
      empreendimento: snapshot.empreendimento,
      queue,
      eligibleForSignature,
    };
  }
}
