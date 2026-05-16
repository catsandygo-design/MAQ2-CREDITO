export function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="maq-card maq-metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
