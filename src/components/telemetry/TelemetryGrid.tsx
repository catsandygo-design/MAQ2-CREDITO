import type { ReactNode } from 'react';

type TelemetryGridProps = {
  children: ReactNode;
};

export function TelemetryGrid({ children }: TelemetryGridProps) {
  return (
    <section className="telemetry-grid">
      {children}
    </section>
  );
}
