import type { ReactNode } from 'react';

type TelemetryCardProps = {
  label: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  scroll?: boolean;
};

export function TelemetryCard({
  label,
  badge,
  children,
  className = '',
  contentClassName = '',
  scroll = false,
}: TelemetryCardProps) {
  return (
    <article className={`telemetry-card ${className}`.trim()}>
      <div className="telemetry-card-head">
        <div>
          <small>{label}</small>
        </div>
        {badge ? <strong className="cor-urgent-pill">{badge}</strong> : null}
      </div>
      <div className={`telemetry-card-content ${contentClassName}`.trim()}>
        {scroll ? <div className="telemetry-scroll-area">{children}</div> : children}
      </div>
    </article>
  );
}
