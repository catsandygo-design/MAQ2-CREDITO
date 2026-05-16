import { DashboardShell } from '@/components/layout/dashboard-shell';

const columns = ['Recebido', 'Em Analise', 'Pendencia', 'CCA', 'Minuta'];

export default function WorkflowPage() {
  return (
    <DashboardShell title="Workflow Operacional" description="Fluxo completo do processo de credito.">
      <div className="maq-workflow-grid">
        {columns.map((column) => (
          <div key={column} className="maq-card maq-workflow-column">
            <h2>{column}</h2>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
