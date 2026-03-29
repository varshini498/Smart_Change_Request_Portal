import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import AppShell from '../../components/AppShell';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import DeadlineBadge from '../../components/DeadlineBadge';
import ToastMessage from '../../components/ToastMessage';
import EmptyState from '../../components/EmptyState';
import { FolderSearch } from 'lucide-react';
import { getDisplayRequestNumber } from '../../utils/requestDisplay';

export default function TeamLeadDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pendingCount: 0, approvedCount: 0, rejectedCount: 0, dueTodayCount: 0, overdueCount: 0 });
  const [pending, setPending] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const loadStats = async () => {
    try {
      const res = await API.get('/teamlead/stats');
      console.log('Team Lead stats response:', res);
      setStats(res.data || { pendingCount: 0, approvedCount: 0, rejectedCount: 0, dueTodayCount: 0, overdueCount: 0 });
    } catch (err) {
      setToast({ message: 'Failed to load team lead stats', type: 'error' });
    }
  };

  const loadPending = async () => {
    try {
      const res = await API.get('/teamlead/pending');
      setPending(res.data?.data || []);
    } catch (err) {
      setToast({ message: 'Failed to load pending approvals', type: 'error' });
    }
  };

  useEffect(() => {
    loadStats();
    loadPending();
  }, []);

  const recentPending = pending.slice(0, 5);

  return (
    <>
      <AppShell
        title="Team Lead Dashboard"
        subtitle="Level 1 approval overview"
        navItems={[
          { key: 'dashboard', label: 'Dashboard', active: true, onClick: () => navigate('/teamlead/dashboard') },
          { key: 'pending', label: 'Pending Approvals', active: false, onClick: () => navigate('/teamlead/pending') },
          { key: 'history', label: 'Approval History', active: false, onClick: () => navigate('/teamlead/history') },
        ]}
      >
        <div className="grid-4">
          <StatCard label="Pending Approvals" value={stats.pendingCount} />
          <StatCard label="Due Today" value={stats.dueTodayCount} />
          <StatCard label="Overdue" value={stats.overdueCount} />
          <StatCard label="Approved by Me" value={stats.approvedCount} />
          <StatCard label="Rejected by Me" value={stats.rejectedCount} />
        </div>

        <section className="card section-card">
          <div className="section-header">
            <h3 className="section-title">Recent Pending Requests</h3>
            <button className="btn btn-secondary" type="button" onClick={() => navigate('/teamlead/pending')}>
              View All
            </button>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Requested By</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Submission Date</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentPending.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <EmptyState
                        title="No pending requests"
                        description="Level 1 approvals assigned to you will appear here as soon as employees submit them."
                        icon={FolderSearch}
                      />
                    </td>
                  </tr>
                ) : (
                  recentPending.map((req) => (
                    <tr key={req.id}>
                      <td>{getDisplayRequestNumber(req)}</td>
                      <td>{req.title}</td>
                      <td>{req.type || req.category || '-'}</td>
                      <td>{req.requestedBy || req.createdBy || '-'}</td>
                      <td>{req.department || '-'}</td>
                      <td>{req.priority || '-'}</td>
                      <td>{req.dateCreated || req.created_at || '-'}</td>
                      <td><DeadlineBadge status={req.deadline_status} /></td>
                      <td><StatusBadge status={req.status} /></td>
                      <td>
                        <button className="btn btn-secondary" type="button" onClick={() => navigate(`/teamlead/request/${req.id}`)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </AppShell>

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
