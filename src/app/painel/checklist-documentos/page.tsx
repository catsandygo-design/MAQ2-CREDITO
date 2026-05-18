'use client';

import { useEffect } from 'react';

export default function ChecklistDocumentosPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('origem', 'corretor');
    window.location.replace(`/checklist_documentos_upload_com_formulario.html?${params.toString()}`);
  }, []);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#ffffff', color: '#0f172a', fontFamily: 'Inter, Arial, sans-serif' }}>
      <p>Carregando checklist documental...</p>
    </main>
  );
}
