import { NextRequest } from 'next/server';

import { enviarDocumentosCorretor } from '../../../../../../lib/workflow/engine';
import { mutateProcesso, type ProcessoRouteContext } from '../../../../../../lib/workflow/api';

export async function POST(request: NextRequest, context: ProcessoRouteContext) {
  return mutateProcesso(request, context, (processo, body) =>
    enviarDocumentosCorretor(
      processo,
      Array.isArray(body.arquivos)
        ? (body.arquivos as Array<{ documentoId: string; arquivoUrl: string }>)
        : [],
    ),
  );
}
