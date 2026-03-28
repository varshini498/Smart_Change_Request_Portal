export default function KpiCards({ items = [] }) {
  return (
    <div className="analytics-kpi-grid">
      {items.map((item) => (
        <div key={item.label} className="analytics-kpi-card">
          <div className="analytics-kpi-meta">
            <span className="analytics-kpi-dot" style={{ background: item.color }} />
            <span className="analytics-kpi-label">{item.label}</span>
          </div>
          <div className="analytics-kpi-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
