import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function SlaPage() {
  return (
    <DashboardShell
      title="SLA Operacional"
      description="Separação do tempo humano e sistêmico."
    >
      <div className="maq-card maq-table-card">
        <table className="maq-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Corretor</th>
              <th>Analista</th>
              <th>Tempo Humano</th>
              <th>Tempo Sistema</th>
              <th>Status</th>
            </tr>
          </thead>
        </table>
      </div>
    </DashboardShell>
  );
}
