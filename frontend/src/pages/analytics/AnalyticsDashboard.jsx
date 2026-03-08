import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import API from '../../api/axios';
import AppShell from '../../components/AppShell';
import StatCard from '../../components/StatCard';
import ToastMessage from '../../components/ToastMessage';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const defaultFilters = { from: '', to: '', department: 'All' };

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || '';

  const [filters, setFilters] = useState(defaultFilters);
  const [overview, setOverview] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [overdueTrends, setOverdueTrends] = useState([]);
  const [approvalTime, setApprovalTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const allowed = role === 'ADMIN';

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.department && filters.department !== 'All') params.append('department', filters.department);
    return params.toString();
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const suffix = queryString ? `?${queryString}` : '';
      const [overviewRes, deptRes, approvalRes, overdueRes] = await Promise.all([
        API.get(`/analytics/overview${suffix}`),
        API.get(`/analytics/department-stats${suffix}`),
        API.get(`/analytics/approval-time${suffix}`),
        API.get(`/analytics/overdue-trends${suffix}`),
      ]);

      setOverview(overviewRes.data.overview || null);
      setStatusData(overviewRes.data.status || []);
      setDepartmentData(deptRes.data.departmentStats || []);
      setApprovalTime(approvalRes.data.approvalTime || null);
      setOverdueTrends(overdueRes.data.overdueTrends || []);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to load analytics', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!allowed) return;
    fetchAnalytics();
  }, [queryString, allowed]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, queryString, allowed]);

  const handleExport = async (type) => {
    try {
      const suffix = queryString ? `?${queryString}` : '';
      const res = await API.get(`/analytics/export/${type}${suffix}`, { responseType: 'blob' });
      const blob = new Blob([res.data], {
        type:
          type === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'pdf' ? 'analytics_report.pdf' : 'analytics_report.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setToast({ message: err.response?.data?.message || `Failed to export ${type}`, type: 'error' });
    }
  };

  if (!allowed) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Access Denied</h1>
          <p className="auth-subtitle">Analytics is available for Admin role only.</p>
          <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  const departmentChartData = {
    labels: departmentData.map((x) => x.department),
    datasets: [{ label: 'Requests', data: departmentData.map((x) => x.count), backgroundColor: '#2563eb' }],
  };

  const statusChartData = {
    labels: statusData.map((x) => x.status),
    datasets: [
      {
        data: statusData.map((x) => x.count),
        backgroundColor: ['#f59e0b', '#16a34a', '#dc2626', '#64748b'],
      },
    ],
  };

  const overdueChartData = {
    labels: overdueTrends.map((x) => x.day),
    datasets: [
      {
        label: 'Overdue Requests',
        data: overdueTrends.map((x) => x.count),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.12)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const priorityChartData = {
    labels: (overview?.priorities || []).map((x) => x.priority),
    datasets: [{ label: 'Requests', data: (overview?.priorities || []).map((x) => x.count), backgroundColor: '#0ea5e9' }],
  };

  return (
    <>
      <AppShell
        title="Dashboard Analytics"
        subtitle="Performance insights and exportable reports"
        navItems={[
          { key: 'overview', label: 'Analytics', active: true },
          { key: 'admin', label: 'Admin Dashboard', onClick: () => navigate('/admin/dashboard') },
        ]}
      >
        <section className="card section-card">
          <div className="section-header">
            <h3 className="section-title">Filters & Export</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" type="button" onClick={() => handleExport('excel')}>Download as Excel</button>
              <button className="btn btn-secondary" type="button" onClick={() => handleExport('pdf')}>Download as PDF</button>
            </div>
          </div>
          <div className="controls-row">
            <input className="input" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} style={{ maxWidth: 180 }} />
            <input className="input" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} style={{ maxWidth: 180 }} />
            <input className="input" placeholder="Department (optional)" value={filters.department === 'All' ? '' : filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value || 'All' })} style={{ maxWidth: 220 }} />
            <button className="btn btn-secondary" type="button" onClick={() => setFilters(defaultFilters)}>Reset</button>
            <label className="hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Auto refresh (30s)
            </label>
          </div>
        </section>

        <div className="grid-3">
          <StatCard label="Total Requests" value={overview?.totalRequests || 0} />
          <StatCard label="Avg Approval Hours" value={overview?.avgApprovalHours || '0.00'} />
          <StatCard label="Overdue Requests" value={overview?.overdueCount || 0} />
        </div>

        {loading ? (
          <section className="card section-card">
            <div style={{ padding: 16 }} className="hint">Loading analytics...</div>
          </section>
        ) : (
          <>
            <div className="grid-3">
              <section className="card section-card">
                <div className="section-header"><h3 className="section-title">Requests per Department</h3></div>
                <div style={{ padding: 16, minHeight: 260 }}><Bar data={departmentChartData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
              </section>

              <section className="card section-card">
                <div className="section-header"><h3 className="section-title">Requests by Status</h3></div>
                <div style={{ padding: 16, minHeight: 260 }}><Pie data={statusChartData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
              </section>

              <section className="card section-card">
                <div className="section-header"><h3 className="section-title">Requests by Priority</h3></div>
                <div style={{ padding: 16, minHeight: 260 }}><Bar data={priorityChartData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
              </section>
            </div>

            <section className="card section-card">
              <div className="section-header"><h3 className="section-title">Overdue Request Trends</h3></div>
              <div style={{ padding: 16, minHeight: 280 }}><Line data={overdueChartData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
            </section>

            <section className="card section-card">
              <div className="section-header"><h3 className="section-title">Approval Time Summary</h3></div>
              <div style={{ padding: 16 }}>
                <p className="hint" style={{ marginTop: 0 }}>
                  Approved Requests: {approvalTime?.summary?.approvedRequests || 0} | Min: {approvalTime?.summary?.minApprovalHours || '0.00'}h | Max: {approvalTime?.summary?.maxApprovalHours || '0.00'}h
                </p>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Department</th><th>Avg Approval Hours</th></tr>
                    </thead>
                    <tbody>
                      {(approvalTime?.byDepartment || []).map((row) => (
                        <tr key={row.department}>
                          <td>{row.department}</td>
                          <td>{row.avgApprovalHours}</td>
                        </tr>
                      ))}
                      {(approvalTime?.byDepartment || []).length === 0 && (
                        <tr><td colSpan="2" style={{ textAlign: 'center', color: '#64748b' }}>No approved request data</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </AppShell>
      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
