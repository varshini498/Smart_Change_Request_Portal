export const ANALYTICS_COLORS = {
  approved: '#16a34a',
  rejected: '#dc2626',
  pending: '#f59e0b',
  draft: '#64748b',
  bar: '#2563eb',
  barSoft: 'rgba(37, 99, 235, 0.2)',
  grid: 'rgba(148, 163, 184, 0.18)',
};

export const getStatusColor = (status) => {
  const key = String(status || '').trim().toUpperCase();
  if (key === 'APPROVED' || key === 'FULLY_APPROVED') return ANALYTICS_COLORS.approved;
  if (key === 'REJECTED') return ANALYTICS_COLORS.rejected;
  if (key === 'PENDING' || key === 'ESCALATED') return ANALYTICS_COLORS.pending;
  return ANALYTICS_COLORS.draft;
};
