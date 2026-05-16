import { FoguetinhoService } from '../src/modules/foguetinho/foguetinho.service';

describe('FoguetinhoService', () => {
  it('bloqueia quando a renda nao esta comprovada', () => {
    const service = new FoguetinhoService();

    const result = service.evaluate({
      financial: {
        saleValue: 200000,
        guaranteedValue: 190000,
        chequeMoradia: 10000,
        grossIncome: 5000,
      },
      documents: {
        rgCpfSent: true,
        proofOfResidenceSent: true,
        incomeProofSent: false,
        fgtsValidated: true,
        incomeProfile: 'CLT',
      },
    });

    expect(result.status).toBe('bloquear');
    expect(result.hits.some((hit) => hit.code === 'FRK-RENDA-001')).toBe(true);
  });

  it('retorna viavel quando nao ha pendencia critica', () => {
    const service = new FoguetinhoService();

    const result = service.evaluate({
      financial: {
        saleValue: 200000,
        guaranteedValue: 190000,
        chequeMoradia: 10000,
        grossIncome: 5000,
      },
      documents: {
        rgCpfSent: true,
        proofOfResidenceSent: true,
        incomeProofSent: true,
        fgtsValidated: true,
        incomeProfile: 'CLT',
      },
    });

    expect(result.status).toBe('viavel');
    expect(result.hits).toHaveLength(0);
  });
});
