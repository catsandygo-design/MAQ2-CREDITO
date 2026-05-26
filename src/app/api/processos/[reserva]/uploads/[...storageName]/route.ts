import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ reserva: string; storageName: string[] }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(_request: NextRequest, context: RouteContext) {
  const { reserva, storageName } = await context.params;
  const storagePath = storageName.map(encodeURIComponent).join('/');
  const response = await fetch(`${API_BASE}/api/processos/${encodeURIComponent(reserva)}/uploads/${storagePath}`, {
    cache: 'no-store',
  });

  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Disposition': response.headers.get('Content-Disposition') || '',
    },
  });
}
