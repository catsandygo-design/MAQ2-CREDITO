import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function ChecklistPage() {
  return (
    <DashboardShell title="Checklist da Verdade" description="Validacoes obrigatorias antes da minuta.">
      <div className="maq-grid-2">
        <div className="maq-card">Conformidade CAIXA</div>
        <div className="maq-card">Produto Pago</div>
        <div className="maq-card">Agehab Validada</div>
        <div className="maq-card">Documentacao Completa</div>
      </div>
    </DashboardShell>
  );
}
