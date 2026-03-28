import KpiCards from './KpiCards';
import RequestsBarChart from './RequestsBarChart';
import StatusPieChart from './StatusPieChart';
import { ANALYTICS_COLORS } from './chartTheme';

export default function AnalyticsOverview({
  title = 'Analytics Overview',
  loading = false,
  error = '',
  data = null,
  includeDraft = false,
}) {
  if (loading) {
    return (
      <section className="card section-card">
        <div className="section-header">
          <h3 className="section-title">{title}</h3>
        </div>
        <div className="analytics-empty-state">Loading analytics...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card section-card">
        <div className="section-header">
          <h3 className="section-title">{title}</h3>
        </div>
        <div className="analytics-empty-state analytics-error-state">{error}</div>
      </section>
    );
  }

  const kpis = [
    { label: 'Total', value: data?.totalRequests ?? 0, color: ANALYTICS_COLORS.bar },
    { label: 'Approved', value: data?.approved ?? 0, color: ANALYTICS_COLORS.approved },
    { label: 'Rejected', value: data?.rejected ?? 0, color: ANALYTICS_COLORS.rejected },
    { label: 'Pending', value: data?.pending ?? 0, color: ANALYTICS_COLORS.pending },
  ];

  if (includeDraft) {
    kpis.push({ label: 'Draft', value: data?.draft ?? 0, color: ANALYTICS_COLORS.draft });
  }

  return (
    <section className="section-card analytics-stack">
      <KpiCards items={kpis} />
      <div className="analytics-grid">
        <StatusPieChart data={data?.statusBreakdown || []} />
        <RequestsBarChart data={data?.monthlyTrend || []} />
      </div>
    </section>
  );
}
