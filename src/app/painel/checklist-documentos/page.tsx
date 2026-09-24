import ChecklistDocumentosForm from '@/components/ChecklistDocumentosForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ChecklistDocumentosPage() {
  return <ChecklistDocumentosForm perfil="corretor" modo="envio" ocultarAteInicializar />;
}
