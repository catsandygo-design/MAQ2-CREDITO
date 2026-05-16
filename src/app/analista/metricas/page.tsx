import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MetricCard } from '@/components/dashboard/metric-card';

export default function MetricasPage() {
  return (
    <DashboardShell title="Metricas Operacionais" description="Indicadores de velocidade, qualidade e gargalos do processo.">
      <div className="maq-grid-4">
        <MetricCard title="First Time Right" value="91%" />
        <MetricCard title="Indice de Retrabalho" value="7%" />
        <MetricCard title="Processos Ativos" value="421" />
        <MetricCard title="Gargalos" value="12" />
      </div>
    </DashboardShell>
  );
}
