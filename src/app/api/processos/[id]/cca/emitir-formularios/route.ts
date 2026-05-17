import { NextRequest } from 'next/server';

import { mutateProcesso, type ProcessoRouteContext } from '../../../../../../lib/workflow/api';
import { emitirFormulariosCca } from '../../../../../../lib/workflow/engine';

export async function POST(request: NextRequest, context: ProcessoRouteContext) {
  return mutateProcesso(request, context, (processo, body) =>
    emitirFormulariosCca(
      processo,
      Array.isArray(body.formularios)
        ? (body.formularios as Array<{ nome: string; arquivoUrl: string }>)
        : [],
    ),
  );
}
