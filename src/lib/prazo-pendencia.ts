export type PendenciaTone = 'critico' | 'medio' | 'ok';

function dataValida(valor: unknown) {
  if (!valor || typeof valor !== 'string') return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function tonePrazoPendencia(pendencia: any): PendenciaTone {
  const prazo = dataValida(pendencia?.prazo);
  const inicio = dataValida(pendencia?.created_at) || dataValida(pendencia?.updated_at);

  if (!prazo || !inicio) return 'ok';

  const total = prazo.getTime() - inicio.getTime();
  const decorrido = Date.now() - inicio.getTime();

  if (total <= 0) return Date.now() > prazo.getTime() ? 'critico' : 'medio';

  const percentual = (Math.max(0, decorrido) / total) * 100;
  if (percentual > 100) return 'critico';
  if (percentual > 70) return 'medio';
  return 'ok';
}

export function pendenciaResolvida(status: unknown) {
  const texto = String(status || '').toLowerCase();
  return texto.includes('enviado') || texto.includes('aprovado') || texto.includes('resolvido') || texto.includes('ok');
}
