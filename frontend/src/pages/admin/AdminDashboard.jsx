import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { adminService } from '../../services/adminService';
import ToastMessage from '../../components/ToastMessage';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await adminService.getStats();
        if (active) setStats(res.data.data);
        const activityRes = await adminService.getActivity();
        if (active) setActivity(activityRes.data.data || []);
      } catch (_err) {
        if (active) setToast({ message: 'Failed to load stats', type: 'error' });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <AdminLayout title="Dashboard" activeKey="dashboard">
        {loading ? (
          <div className="card section-card">
            <div className="analytics-loading-state">
              <div className="analytics-spinner" />
              <p>Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid-4">
              <StatCard label="Total Requests" value={stats?.total ?? 0} />
              <StatCard label="Pending" value={stats?.pending ?? 0} />
              <StatCard label="Fully Approved" value={stats?.approved ?? 0} />
              <StatCard label="Rejected" value={stats?.rejected ?? 0} />
              <StatCard label="Due Today" value={stats?.dueToday ?? 0} />
              <StatCard label="Overdue" value={stats?.overdue ?? 0} />
            </div>

            <section className="card section-card">
              <div className="section-header">
                <h3 className="section-title">Recent Activity Timeline</h3>
              </div>
              <div className="activity-feed">
                {activity.length === 0 ? (
                  <EmptyState
                    title="No recent activity"
                    description="System actions and workflow updates will appear here as soon as users start interacting with requests."
                    icon={Activity}
                  />
                ) : (
                  activity.slice(0, 10).map((row, idx) => (
                    <div key={`${row.request_id}-${idx}`} className="activity-item">
                      <div className="activity-dot" />
                      <div>
                        <div><strong>{row.user}</strong> - {row.action}</div>
                        <div className="hint">Request #{row.request_id} - {row.timestamp}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </AdminLayout>

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
