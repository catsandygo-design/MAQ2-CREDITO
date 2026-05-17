import { NextRequest } from 'next/server';

import { mutateProcesso, type ProcessoRouteContext } from '../../../../../../lib/workflow/api';
import { aprovarDocumentacaoCca } from '../../../../../../lib/workflow/engine';

export async function POST(request: NextRequest, context: ProcessoRouteContext) {
  return mutateProcesso(request, context, (processo, body) =>
    aprovarDocumentacaoCca(processo, String(body.cca ?? 'CCA')),
  );
}
