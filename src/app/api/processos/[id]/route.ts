import { NextResponse } from 'next/server';

import { getProcesso } from '../../../../lib/workflow/store';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const processo = getProcesso(id);

  if (!processo) {
    return NextResponse.json({ error: 'Processo nao encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ data: processo });
}
