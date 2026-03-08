export default function StatCard({ label, value }) {
  return (
    <article className="card stat-card">
      <p className="stat-label">{label}</p>
      <h2 className="stat-value">{value}</h2>
    </article>
  );
}
