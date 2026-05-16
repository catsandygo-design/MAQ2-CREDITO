import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function MinutaPage() {
  return (
    <DashboardShell title="Liberacao de Minuta" description="Controle de gates e liberacao operacional.">
      <div className="maq-card maq-section-card">
        <h2>Checklist obrigatorio</h2>
        <p>
          A minuta somente sera liberada quando todos os gates obrigatorios estiverem concluidos.
        </p>

        <button className="maq-button-disabled">
          Minuta Bloqueada
        </button>
      </div>
    </DashboardShell>
  );
}
