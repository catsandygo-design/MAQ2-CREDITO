import React, { useEffect, useState } from 'react';
import AnalistaClient from './AnalistaClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function AppAnalistaPage() {
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarFilaAnalista() {
      try {
        const response = await fetch(`${API_BASE}/api/processos?destino=analista`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          setProcessos([]);
          return;
        }

        const data = await response.json();
        setProcessos(Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : []);
      } catch {
        setProcessos([]);
      } finally {
        setLoading(false);
      }
    }

    carregarFilaAnalista();
  }, []);

  if (loading) {
    return <div className="p-10 text-center">Carregando processos...</div>;
  }

  return <AnalistaClient initialProcessos={processos} />;
}
