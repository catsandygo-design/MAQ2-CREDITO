import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ reserva: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

function messagesUrl(reserva: string) {
  return `${API_BASE}/api/processos/${encodeURIComponent(reserva)}/messages`;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { reserva } = await context.params;
  const response = await fetch(messagesUrl(reserva), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { reserva } = await context.params;
  const response = await fetch(messagesUrl(reserva), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
    },
    body: await request.text(),
    cache: 'no-store',
  });

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
  });
}
