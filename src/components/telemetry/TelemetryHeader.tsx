type TelemetryHeaderProps = {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  onExit?: () => void;
};

export function TelemetryHeader({ title, subtitle, onRefresh, onExit }: TelemetryHeaderProps) {
  return (
    <header className="telemetry-header">
      <div className="telemetry-title">
        <span className="telemetry-icon">&uarr;</span>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="telemetry-actions">
        <button type="button" onClick={onRefresh}>Atualizar</button>
        <button type="button" onClick={onExit}>Sair</button>
      </div>
    </header>
  );
}
