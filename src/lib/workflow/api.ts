import { NextRequest, NextResponse } from 'next/server';

import { getProcesso, saveProcesso } from './store';
import type { ProcessoCredito, WorkflowActionResult } from './types';

export type ProcessoRouteContext = { params: Promise<{ id: string }> };

export async function mutateProcesso(
  request: NextRequest,
  context: ProcessoRouteContext,
  action: (processo: ProcessoCredito, body: Record<string, unknown>) => WorkflowActionResult,
) {
  try {
    const { id } = await context.params;
    const processo = getProcesso(id);

    if (!processo) {
      return NextResponse.json({ error: 'Processo nao encontrado.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const result = action(processo, body);
    saveProcesso(result.processo);

    return NextResponse.json({ data: result.processo, mensagem: result.mensagem });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao processar acao.' }, { status: 400 });
  }
}
