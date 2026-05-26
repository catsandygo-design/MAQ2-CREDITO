export type Papel = 'cca' | 'analista' | 'gestor' | 'corretor';

export type TipoPendencia =
  | 'KIT_CAIXA'
  | 'FORMULARIOS'
  | 'RENDA'
  | 'AGEHAB'
  | 'ASSINATURA';

export interface PendenciaHistoricoEvento {
  tipo: 'criada' | 'respondida' | 'resolvida' | 'reaberta';
  quando: string;
  ator: Papel;
}

export interface PendenciaGovernancaPayload {
  cliente: string;
  reserva: string;
  cadastro: string;
  corretor: string;
  origem: Papel;
  destino: Papel;
  documento_id: string;
  documento_nome: string;
  mensagem: string;
  prazo: string;
  tipo_pendencia: TipoPendencia;
  historico: PendenciaHistoricoEvento[];
}

const cadeiaOficial: Record<Papel, Papel[]> = {
  cca: ['analista'],
  analista: ['corretor', 'gestor', 'cca'],
  gestor: ['analista', 'corretor'],
  corretor: ['analista', 'gestor'],
};

function agoraIso() {
  return new Date().toISOString();
}

function limpar(valor: string) {
  return valor.trim();
}

export function validarRoteamentoPendencia(origem: Papel, destino: Papel): { ok: boolean; motivo?: string } {
  if (origem === destino) {
    return { ok: false, motivo: 'Governanca: origem e destino nao podem ser iguais.' };
  }

  if (!cadeiaOficial[origem].includes(destino)) {
    return { ok: false, motivo: `Governanca: ${origem} nao pode encaminhar pendencia para ${destino}.` };
  }

  return { ok: true };
}

export function registrarEventoHistorico(
  historicoAtual: PendenciaHistoricoEvento[],
  tipo: PendenciaHistoricoEvento['tipo'],
  ator: Papel,
) {
  return [...historicoAtual, { tipo, ator, quando: agoraIso() }];
}

export function inferirTipoPendencia(documentoKey: string): TipoPendencia {
  const key = documentoKey.toLowerCase();
  if (key.includes('agehab')) return 'AGEHAB';
  if (key.includes('renda') || key.includes('fgts') || key.includes('holerite')) return 'RENDA';
  if (key.includes('formulario') || key.includes('damp') || key.includes('ficha')) return 'FORMULARIOS';
  if (key.includes('assinatura') || key.includes('mo')) return 'ASSINATURA';
  return 'KIT_CAIXA';
}

export function montarPayloadPendencia(params: {
  cliente: string;
  reserva: string;
  cadastro: string;
  corretor: string;
  origem: Papel;
  destino: Papel;
  documentoId: string;
  documentoNome: string;
  mensagem: string;
  prazo: string;
}): PendenciaGovernancaPayload {
  const validacao = validarRoteamentoPendencia(params.origem, params.destino);
  if (!validacao.ok) {
    throw new Error(validacao.motivo || 'Governanca: roteamento invalido.');
  }

  return {
    cliente: limpar(params.cliente),
    reserva: limpar(params.reserva),
    cadastro: limpar(params.cadastro),
    corretor: limpar(params.corretor),
    origem: params.origem,
    destino: params.destino,
    documento_id: limpar(params.documentoId),
    documento_nome: limpar(params.documentoNome),
    mensagem: limpar(params.mensagem),
    prazo: limpar(params.prazo),
    tipo_pendencia: inferirTipoPendencia(params.documentoId),
    historico: [
      {
        tipo: 'criada',
        quando: agoraIso(),
        ator: params.origem,
      },
    ],
  };
}
