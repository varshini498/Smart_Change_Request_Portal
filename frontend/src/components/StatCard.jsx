import { AlertTriangle, CheckCircle2, Clock3, FileText, XCircle } from 'lucide-react';

const resolveIcon = (label) => {
  const value = String(label || '').toLowerCase();
  if (value.includes('approve')) return CheckCircle2;
  if (value.includes('reject')) return XCircle;
  if (value.includes('overdue')) return AlertTriangle;
  if (value.includes('pending') || value.includes('due today') || value.includes('draft')) return Clock3;
  return FileText;
};

export default function StatCard({ label, value }) {
  const Icon = resolveIcon(label);
  const tone = String(label || '').toLowerCase().includes('approve')
    ? 'success'
    : String(label || '').toLowerCase().includes('reject') || String(label || '').toLowerCase().includes('overdue')
    ? 'danger'
    : 'primary';

  return (
    <article className={`card stat-card stat-card-${tone}`}>
      <div className="stat-icon-wrap">
        <Icon size={18} />
      </div>
      <p className="stat-label">{label}</p>
      <h2 className="stat-value">{value}</h2>
    </article>
  );
}
