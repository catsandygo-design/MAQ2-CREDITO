import Link from 'next/link';
import type { ReactNode } from 'react';

const navItems = [
  { label: 'Governança', href: '/analista/governanca' },
  { label: 'SLA', href: '/analista/sla' },
  { label: 'Workflow', href: '/analista/workflow' },
  { label: 'Checklist', href: '/analista/checklist' },
  { label: 'Métricas', href: '/analista/metricas' },
  { label: 'Minuta', href: '/analista/minuta' },
];

export function DashboardShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="maq-dashboard-shell">
      <aside className="maq-sidebar">
        <div className="maq-brand">
          <strong>MAQ2 Crédito</strong>
          <span>Governança Operacional</span>
        </div>

        <nav className="maq-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="maq-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="maq-main">
        <header className="maq-topbar">
          <div>
            <p className="maq-eyebrow">Painel Analista</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="maq-live-pill">Atualização 60s</div>
        </header>

        <section className="maq-content">{children}</section>
      </main>
    </div>
  );
}
