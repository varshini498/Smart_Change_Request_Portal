import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import { adminService } from '../../services/adminService';
import ToastMessage from '../../components/ToastMessage';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await adminService.getStats();
        if (active) setStats(res.data.data);
        const analyticsRes = await adminService.getAnalytics();
        if (active) setAnalytics(analyticsRes.data.data);
        const activityRes = await adminService.getActivity();
        if (active) setActivity(activityRes.data.data || []);
      } catch (err) {
        if (active) setToast({ message: 'Failed to load stats', type: 'error' });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  return (
    <>
      <AdminLayout title="Dashboard" activeKey="dashboard">
        {loading ? (
          <div className="card section-card">Loading dashboard...</div>
        ) : (
          <>
            <div className="grid-4">
              <div className="stat-card">
                <div className="stat-label">Total Requests</div>
                <div className="stat-value">{stats?.total ?? 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Pending</div>
                <div className="stat-value">{stats?.pending ?? 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Fully Approved</div>
                <div className="stat-value">{stats?.approved ?? 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Rejected</div>
                <div className="stat-value">{stats?.rejected ?? 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Due Today</div>
                <div className="stat-value">{stats?.dueToday ?? 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Overdue</div>
                <div className="stat-value">{stats?.overdue ?? 0}</div>
              </div>
            </div>
            <section className="card section-card">
              <div className="section-header">
                <h3 className="section-title">Recent Activity Timeline</h3>
              </div>
              <div style={{ padding: 14 }}>
                {activity.length === 0 ? (
                  <p className="hint" style={{ margin: 0 }}>No recent activity</p>
                ) : activity.slice(0, 10).map((row, idx) => (
                  <div key={`${row.request_id}-${idx}`} style={{ borderLeft: '2px solid var(--border)', paddingLeft: 10, marginBottom: 10 }}>
                    <div><strong>{row.user}</strong> - {row.action}</div>
                    <div className="hint">Request #{row.request_id} • {row.timestamp}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card section-card">
              <div className="section-header">
                <h3 className="section-title">Analytics</h3>
              </div>
              <div style={{ padding: 14 }}>
                <h4 style={{ marginTop: 0 }}>Requests by Status</h4>
                {(analytics?.by_status || []).map((item) => (
                  <div key={item.status} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>{item.status}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div style={{ height: 8, background: 'var(--line)', borderRadius: 999 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${analytics?.total_requests ? Math.min(100, (item.count / analytics.total_requests) * 100) : 0}%`,
                          background: 'var(--primary)',
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <h4 style={{ marginTop: 14 }}>Requests by Category</h4>
                {(analytics?.by_category || []).map((item) => (
                  <div key={item.category} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>{item.category}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div style={{ height: 8, background: 'var(--line)', borderRadius: 999 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${analytics?.total_requests ? Math.min(100, (item.count / analytics.total_requests) * 100) : 0}%`,
                          background: '#0ea5e9',
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </AdminLayout>

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
