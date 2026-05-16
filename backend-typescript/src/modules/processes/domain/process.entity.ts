import {
  AgehabStatus,
  BinaryOperationalStatus,
  CaixaStatus,
  CommercialStage,
  CurrentQueue,
  GeneralStatus,
  TransferStage,
} from './process-status';

export interface ProcessProps {
  id: string;
  clientName: string;
  empreendimento: string;
  corretor?: string;
  imobiliaria?: string;
  commercialStage: CommercialStage;
  transferStage?: TransferStage;
  generalStatus: GeneralStatus;
  caixaStatus: CaixaStatus;
  agehabStatus: AgehabStatus;
  sinalStatus: BinaryOperationalStatus;
  fiadorStatus: BinaryOperationalStatus;
  createdAt: Date;
}

const REPASSE_COMMERCIAL_STAGES = new Set<CommercialStage>([
  CommercialStage.ASSINATURA_DIRETORIA,
  CommercialStage.AUTORIZACAO_DIRETORIA,
  CommercialStage.ENVIO_SIENGE,
  CommercialStage.VENDA_FINALIZADA,
]);

export class CreditProcess {
  constructor(private readonly props: ProcessProps) {}

  get id(): string {
    return this.props.id;
  }

  get snapshot(): ProcessProps {
    return { ...this.props };
  }

  currentQueue(): CurrentQueue {
    return REPASSE_COMMERCIAL_STAGES.has(this.props.commercialStage)
      ? CurrentQueue.REPASSE
      : CurrentQueue.COMERCIAL;
  }

  isFinalized(): boolean {
    return [GeneralStatus.APROVADO, GeneralStatus.REPROVADO, GeneralStatus.DISTRATO, GeneralStatus.CANCELADO].includes(
      this.props.generalStatus,
    );
  }

  isEligibleForSignature(): boolean {
    const caixaReady = [
      CaixaStatus.APROVADO,
      CaixaStatus.DAR_QV,
      CaixaStatus.CONFORME,
      CaixaStatus.TRATANDO_PRODUTO,
      CaixaStatus.AGENDADO,
      CaixaStatus.ASSINATURA_CAIXA,
      CaixaStatus.FINALIZADO,
    ].includes(this.props.caixaStatus);

    return (
      this.props.commercialStage === CommercialStage.VENDA_FINALIZADA &&
      ![GeneralStatus.CANCELADO, GeneralStatus.DISTRATO, GeneralStatus.REPROVADO].includes(this.props.generalStatus) &&
      this.props.agehabStatus === AgehabStatus.VALIDADO_AGEHAB &&
      [BinaryOperationalStatus.NAO_TEM, BinaryOperationalStatus.PAGO].includes(this.props.sinalStatus) &&
      [BinaryOperationalStatus.NAO_TEM, BinaryOperationalStatus.FINALIZADO, BinaryOperationalStatus.APROVADO].includes(
        this.props.fiadorStatus,
      ) &&
      caixaReady
    );
  }
}
