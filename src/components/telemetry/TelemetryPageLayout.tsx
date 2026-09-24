import type { ReactNode } from 'react';

type TelemetryPageLayoutProps = {
  children: ReactNode;
};

export function TelemetryPageLayout({ children }: TelemetryPageLayoutProps) {
  return (
    <main className="telemetry-page cor-page cor-page-premium min-h-screen overflow-x-hidden" data-layout-version="telemetry-v1">
      {children}
    </main>
  );
}
