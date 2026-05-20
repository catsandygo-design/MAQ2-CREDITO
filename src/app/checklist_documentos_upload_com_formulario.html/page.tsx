'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

function ChecklistDocumentosUploadComFormularioContent() {
  const params = useSearchParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const src = useMemo(() => {
    const nextParams = new URLSearchParams(params.toString());
    const origem = nextParams.get('origem');
    const arquivo = origem === 'cca'
      ? 'cca_checklist_documentos_upload.html'
      : 'corretor_checklist_documentos_upload_com_formulario.html';

    return `/${arquivo}?${nextParams.toString()}`;
  }, [params]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const ajustarAltura = () => {
      const documento = iframe.contentDocument;
      if (!documento) return;
      iframe.style.height = `${documento.documentElement.scrollHeight}px`;
    };

    iframe.addEventListener('load', ajustarAltura);
    const timer = window.setInterval(ajustarAltura, 500);

    return () => {
      iframe.removeEventListener('load', ajustarAltura);
      window.clearInterval(timer);
    };
  }, [src]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title="Checklist de Documentos - Upload"
      style={{
        width: '100%',
        minHeight: '100vh',
        border: 0,
        display: 'block',
        background: '#ffffff',
      }}
    />
  );
}

export default function ChecklistDocumentosUploadComFormularioPage() {
  return (
    <Suspense fallback={null}>
      <ChecklistDocumentosUploadComFormularioContent />
    </Suspense>
  );
}
