import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ reserva: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(_request: NextRequest, context: RouteContext) {
  const { reserva } = await context.params;
  const response = await fetch(`${API_BASE}/api/processos/${encodeURIComponent(reserva)}/kit-caixa/download`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    const data = await response.json().catch(async () => ({ detail: await response.text().catch(() => '') }));
    return new NextResponse(data.detail || 'Não existem documentos do Kit Caixa disponíveis para download.', {
      status: response.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/pdf',
      'Content-Disposition': response.headers.get('Content-Disposition') || '',
    },
  });
}
