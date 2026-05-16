import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MetricCard } from '@/components/dashboard/metric-card';

export default function GovernancaPage() {
  return (
    <DashboardShell
      title="Governança Operacional"
      description="Visibilidade total do fluxo operacional."
    >
      <div className="maq-grid-4">
        <MetricCard title="Tempo Médio" value="02:14h" />
        <MetricCard title="First Time Right" value="91%" />
        <MetricCard title="Retrabalho" value="7%" />
        <MetricCard title="SLA" value="94%" />
      </div>
    </DashboardShell>
  );
}
