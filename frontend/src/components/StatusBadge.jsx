export default function StatusBadge({ status, overdue = false }) {
  const raw = String(status || 'PENDING');
  const key = raw.trim().toUpperCase().replace(/\s+/g, '_');
  const normalized =
    key === 'FULLY_APPROVED' || key === 'APPROVED'
      ? 'approved'
      : key === 'REJECTED' || key === 'WITHDRAWN'
      ? 'rejected'
      : 'pending';
  const display = key === 'FULLY_APPROVED'
    ? 'Request Accepted'
    : key === 'REJECTED'
    ? 'Request Rejected'
    : key === 'WITHDRAWN'
    ? 'Withdrawn'
    : key === 'ESCALATED'
    ? 'Escalated'
    : 'Waiting for Approval';
  const className = `status status-${normalized}`;

  if (overdue) {
    return <span className="status status-overdue">Overdue</span>;
  }

  return <span className={className}>{display}</span>;
}
