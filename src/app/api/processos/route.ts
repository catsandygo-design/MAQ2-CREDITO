import { NextRequest, NextResponse } from 'next/server';

import { criarProcessoCv } from '../../../lib/workflow/engine';
import { listProcessos, saveProcesso } from '../../../lib/workflow/store';

export async function GET() {
  return NextResponse.json({ data: listProcessos() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const processo = criarProcessoCv({
      reserva: String(body.reserva ?? ''),
      cliente: String(body.cliente ?? ''),
      corretor: String(body.corretor ?? ''),
    });

    if (!processo.reserva || !processo.cliente || !processo.corretor) {
      return NextResponse.json({ error: 'reserva, cliente e corretor sao obrigatorios.' }, { status: 400 });
    }

    saveProcesso(processo);
    return NextResponse.json({ data: processo }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao criar processo.' }, { status: 400 });
  }
}
