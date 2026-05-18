import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const referer = request.headers.get('referer') || '';
  const isCorretor = url.searchParams.get('origem') === 'corretor' || referer.includes('/painel/');
  const fileName = isCorretor
    ? 'corretor_checklist_documentos_upload_com_formulario.html'
    : 'cca_checklist_documentos_upload.html';
  const htmlPath = path.join(process.cwd(), 'public', fileName);
  const html = await readFile(htmlPath, 'utf8');

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
