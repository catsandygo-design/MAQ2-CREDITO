import AnalistaClient from './AnalistaClient';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function carregarFilaAnalista() {
  try {
    const response = await fetch(`${API_BASE}/api/processos?destino=analista`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];
  } catch {
    return [];
  }
}

export default async function AppAnalistaPage() {
  const processos = await carregarFilaAnalista();

  return <AnalistaClient initialProcessos={processos} />;
}
