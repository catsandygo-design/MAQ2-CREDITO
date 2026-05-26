import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ reserva: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

function copyResponse(response: Response, body: BodyInit | null) {
  return new NextResponse(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Content-Disposition': response.headers.get('Content-Disposition') || '',
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { reserva } = await context.params;
  const url = new URL(request.url);
  const response = await fetch(`${API_BASE}/api/processos/${encodeURIComponent(reserva)}/uploads${url.search}`, {
    headers: { Accept: request.headers.get('Accept') || 'application/json' },
    cache: 'no-store',
  });
  return copyResponse(response, await response.arrayBuffer());
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { reserva } = await context.params;
  const formData = await request.formData();
  const response = await fetch(`${API_BASE}/api/processos/${encodeURIComponent(reserva)}/uploads`, {
    method: 'POST',
    body: formData,
    cache: 'no-store',
  });
  return copyResponse(response, await response.text());
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { reserva } = await context.params;
  const url = new URL(request.url);
  const response = await fetch(`${API_BASE}/api/processos/${encodeURIComponent(reserva)}/uploads${url.search}`, {
    method: 'DELETE',
    cache: 'no-store',
  });
  return copyResponse(response, response.status === 204 ? null : await response.text());
}
