import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { nextUrl } = request;

  if (nextUrl.pathname === '/checklist_documentos_upload_com_formulario.html') {
    const referer = request.headers.get('referer') || '';
    const isCorretor = nextUrl.searchParams.get('origem') === 'corretor' || referer.includes('/painel/');

    if (!isCorretor) {
      const url = nextUrl.clone();
      url.pathname = '/cca/checklist';
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/checklist_documentos_upload_com_formulario.html'],
};
