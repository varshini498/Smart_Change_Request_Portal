import { CheckCircle2, Clock3, FileText, XCircle } from 'lucide-react';

const ICONS = {
  total: FileText,
  approved: CheckCircle2,
  rejected: XCircle,
  pending: Clock3,
};

export default function KpiCard({ label, value, tone = 'total' }) {
  const Icon = ICONS[tone] || FileText;

  return (
    <div className={`analytics-kpi-card analytics-kpi-${tone}`}>
      <div className="analytics-kpi-icon">
        <Icon size={18} />
      </div>
      <div>
        <div className="analytics-kpi-label">{label}</div>
        <div className="analytics-kpi-value">{value}</div>
      </div>
    </div>
  );
}
