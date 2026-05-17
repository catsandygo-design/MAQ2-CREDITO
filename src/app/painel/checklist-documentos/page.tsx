'use client';

import { useEffect } from 'react';

export default function ChecklistDocumentosPage() {
  useEffect(() => {
    window.location.replace(`/checklist_documentos_upload_com_formulario.html${window.location.search}`);
  }, []);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#020617', color: '#e5e7eb', fontFamily: 'Inter, Arial, sans-serif' }}>
      <p>Carregando checklist documental...</p>
    </main>
  );
}
