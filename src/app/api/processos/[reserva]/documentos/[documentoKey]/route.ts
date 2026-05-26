import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ reserva: string; documentoKey: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function PUT(request: NextRequest, context: RouteContext) {
  const { reserva, documentoKey } = await context.params;
  const response = await fetch(
    `${API_BASE}/api/processos/${encodeURIComponent(reserva)}/documentos/${encodeURIComponent(documentoKey)}`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
      },
      body: await request.text(),
      cache: 'no-store',
    },
  );

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
  });
}
