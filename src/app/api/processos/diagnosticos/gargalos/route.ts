import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/api/processos/diagnosticos/gargalos${url.search}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { error: 'Backend FastAPI indisponivel', apiBase: API_BASE },
      { status: 503 },
    );
  }

  const data = await response.text();
  return new NextResponse(data, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
  });
}
