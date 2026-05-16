export interface FoguetinhoFinancialContext {
  saleValue: number;
  guaranteedValue: number;
  chequeMoradia: number;
  grossIncome?: number;
}

export interface FoguetinhoDocumentContext {
  rgCpfSent: boolean;
  proofOfResidenceSent: boolean;
  incomeProofSent: boolean;
  fgtsValidated: boolean;
  incomeProfile: 'CLT' | 'AUTONOMO' | 'APOSENTADO' | 'OUTRO';
}

export interface FoguetinhoContext {
  financial: FoguetinhoFinancialContext;
  documents: FoguetinhoDocumentContext;
}
