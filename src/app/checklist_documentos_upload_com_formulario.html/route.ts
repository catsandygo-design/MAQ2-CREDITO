import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const referer = request.headers.get('referer') || '';
  const isCca = url.searchParams.get('origem') === 'cca' || referer.includes('/cca/');
  const fileName = isCca
    ? 'cca_checklist_documentos_upload.html'
    : 'corretor_checklist_documentos_upload_com_formulario.html';
  const htmlPath = path.join(process.cwd(), 'public', fileName);
  const html = await readFile(htmlPath, 'utf8');

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
