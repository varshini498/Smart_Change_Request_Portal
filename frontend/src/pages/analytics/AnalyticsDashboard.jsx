import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarRange, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import AdminLayout from '../admin/AdminLayout';
import ToastMessage from '../../components/ToastMessage';
import KpiCard from '../../components/analytics/KpiCard';
import DonutChart from '../../components/analytics/DonutChart';
import BarChart from '../../components/analytics/BarChart';
import LineChart from '../../components/analytics/LineChart';
import analyticsService from '../../services/analyticsService';
import { ROLES, normalizeRole } from '../../constants/roles';

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '365', label: 'Last 1 year' },
];

const getFromDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - Number(days));
  return date.toISOString().split('T')[0];
};

const buildNavItems = (role, navigate) => {
  if (role === ROLES.EMPLOYEE) {
    return [
      { key: 'dashboard', label: 'My Requests', active: false, onClick: () => navigate('/employee/dashboard') },
      { key: 'analytics', label: 'Analytics', active: true, onClick: () => navigate('/analytics') },
    ];
  }

  if (role === ROLES.TEAM_LEAD) {
    return [
      { key: 'dashboard', label: 'Dashboard', active: false, onClick: () => navigate('/teamlead/dashboard') },
      { key: 'pending', label: 'Pending Approvals', active: false, onClick: () => navigate('/teamlead/pending') },
      { key: 'history', label: 'Approval History', active: false, onClick: () => navigate('/teamlead/history') },
      { key: 'analytics', label: 'Analytics', active: true, onClick: () => navigate('/analytics') },
    ];
  }

  return [
    { key: 'pending', label: 'Pending', active: false, onClick: () => navigate('/manager/dashboard') },
    { key: 'analytics', label: 'Analytics', active: true, onClick: () => navigate('/analytics') },
    { key: 'profile', label: 'Profile', active: false, onClick: () => navigate('/profile') },
  ];
};

function AnalyticsContent({
  loading,
  error,
  analytics,
  range,
  setRange,
  refresh,
}) {
  if (loading) {
    return (
      <section className="card analytics-hero-card">
        <div className="analytics-loading-state">
          <div className="analytics-spinner" />
          <p>Loading analytics...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card analytics-hero-card">
        <div className="analytics-empty-state">
          <h3>Analytics could not be loaded</h3>
          <p>{error}</p>
          <button className="btn btn-secondary" type="button" onClick={refresh}>Try again</button>
        </div>
      </section>
    );
  }

  const totalRequests = Number(analytics?.totalRequests || 0);
  const hasData = totalRequests > 0;

  if (!hasData) {
    return (
      <section className="card analytics-hero-card">
        <div className="analytics-empty-state">
          <BarChart3 size={28} />
          <h3>No analytics data yet</h3>
          <p>Once requests start moving through the workflow, charts and KPI cards will appear here.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="card analytics-hero-card">
        <div className="analytics-hero-copy">
          <span className="analytics-eyebrow">Insights</span>
          <h2>Request analytics overview</h2>
          <p>Track request volume, approval outcomes, and category patterns from one dedicated page.</p>
        </div>
        <div className="analytics-toolbar">
          <label className="analytics-filter">
            <CalendarRange size={16} />
            <select className="select" value={range} onChange={(e) => setRange(e.target.value)}>
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-secondary" type="button" onClick={refresh}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      <section className="analytics-kpi-grid">
        <KpiCard label="Total Requests" value={analytics.totalRequests || 0} tone="total" />
        <KpiCard label="Approved" value={analytics.approved || 0} tone="approved" />
        <KpiCard label="Rejected" value={analytics.rejected || 0} tone="rejected" />
        <KpiCard label="Pending" value={analytics.pending || 0} tone="pending" />
      </section>

      <section className="analytics-chart-grid analytics-chart-grid-top">
        <DonutChart title="Approval Distribution" data={analytics.statusBreakdown || []} total={analytics.totalRequests || 0} />
        <BarChart title="Monthly Request Trend" data={analytics.monthlyTrend || []} dataKey="count" nameKey="month" color="#2563eb" />
      </section>

      <section className="analytics-chart-grid">
        <LineChart title="Request Growth Over Time" data={analytics.monthlyTrend || []} dataKey="count" nameKey="month" color="#7c3aed" />
        <BarChart title="Requests by Category" data={analytics.categoryData || analytics.byCategory || []} dataKey="count" nameKey="category" color="#0ea5e9" />
      </section>
    </>
  );
}

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const role = normalizeRole(localStorage.getItem('role') || '');
  const [range, setRange] = useState('30');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const params = useMemo(() => ({ from: getFromDate(range) }), [range]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const response =
        role === ROLES.EMPLOYEE
          ? await analyticsService.getEmployeeAnalytics(params)
          : await analyticsService.getOverviewAnalytics(params);

      setAnalytics(response.data?.data || null);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load analytics data';
      setError(message);
      setToast({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const content = (
    <AnalyticsContent
      loading={loading}
      error={error}
      analytics={analytics}
      range={range}
      setRange={setRange}
      refresh={fetchAnalytics}
    />
  );

  return (
    <>
      {role === ROLES.ADMIN ? (
        <AdminLayout title="Analytics" activeKey="analytics">
          {content}
        </AdminLayout>
      ) : (
        <AppShell
          title="Analytics"
          subtitle="Dedicated visual analytics page"
          navItems={buildNavItems(role, navigate)}
        >
          {content}
        </AppShell>
      )}

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
