export default function DeadlineBadge({ status }) {
  const key = String(status || 'NORMAL').trim().toUpperCase();
  const className =
    key === 'OVERDUE'
      ? 'deadline-badge overdue'
      : key === 'DUE_TODAY'
      ? 'deadline-badge due-today'
      : 'deadline-badge normal';

  const label = key === 'OVERDUE' ? 'Overdue' : key === 'DUE_TODAY' ? 'Due Today' : 'Normal';

  return <span className={className}>{label}</span>;
}
