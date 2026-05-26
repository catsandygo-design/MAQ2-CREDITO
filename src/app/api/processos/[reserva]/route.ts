import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ reserva: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function proxy(request: NextRequest, context: RouteContext) {
  const { reserva } = await context.params;
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const response = await fetch(`${API_BASE}/api/processos/${encodeURIComponent(reserva)}`, {
    method: request.method,
    headers: {
      Accept: request.headers.get('Accept') || 'application/json',
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
    },
    body,
    cache: 'no-store',
  });
  const data = await response.text();
  return new NextResponse(data, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
