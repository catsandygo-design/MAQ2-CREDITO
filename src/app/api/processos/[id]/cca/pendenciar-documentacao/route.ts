import { NextRequest } from 'next/server';

import { mutateProcesso, type ProcessoRouteContext } from '../../../../../../lib/workflow/api';
import { pendenciarDocumentacaoCca } from '../../../../../../lib/workflow/engine';

export async function POST(request: NextRequest, context: ProcessoRouteContext) {
  return mutateProcesso(request, context, (processo, body) =>
    pendenciarDocumentacaoCca(
      processo,
      Array.isArray(body.documentoIds) ? (body.documentoIds as string[]) : [],
      String(body.motivo ?? 'Documentacao pendenciada pelo CCA.'),
    ),
  );
}
