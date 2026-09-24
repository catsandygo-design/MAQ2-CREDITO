type ChangeHandler = () => void;

export function subscribeProcessoChanges(onChange: ChangeHandler, reserva?: string) {
  if (typeof window === 'undefined' || !('EventSource' in window)) return () => undefined;

  const params = new URLSearchParams();
  if (reserva) params.set('reserva', reserva);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');
  const source = new EventSource(`${baseUrl}/api/processos/events${params.size ? `?${params}` : ''}`);

  source.addEventListener('change', onChange);

  return () => source.close();
}
