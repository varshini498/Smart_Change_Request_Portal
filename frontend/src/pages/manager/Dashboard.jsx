import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import AppShell from '../../components/AppShell';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import DeadlineBadge from '../../components/DeadlineBadge';
import ToastMessage from '../../components/ToastMessage';
import RequestTimeline from '../../components/RequestTimeline';
import ApprovalFlowTimeline from '../../components/ApprovalFlowTimeline';
import EmptyState from '../../components/EmptyState';
import { SearchX } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [deadlineStats, setDeadlineStats] = useState({ dueToday: 0, overdue: 0 });
  const [requests, setRequests] = useState([]);
  const [view, setView] = useState('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const role = localStorage.getItem('role') || '';
  const roleLabel = role === 'TEAM_LEAD' ? 'Team Lead' : 'Manager';
  const normalizeStatus = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '_');

  const loadData = async () => {
    try {
      const statsRes = await API.get('/requests/dashboard/counts');
      setStats(statsRes.data.counts || { pending: 0, approved: 0, rejected: 0 });
      const pendingAlertsRes = await API.get('/requests/pending');
      const pendingAlerts = pendingAlertsRes.data.requests || [];
      setDeadlineStats({
        dueToday: pendingAlerts.filter((r) => r.deadline_status === 'DUE_TODAY').length,
        overdue: pendingAlerts.filter((r) => r.deadline_status === 'OVERDUE').length,
      });

      const endpoint = view === 'Pending' ? '/requests/pending' : '/requests/all';
      const reqRes = await API.get(endpoint);
      let data = reqRes.data.requests || [];

      if (view === 'Approved') {
        data = data.filter((r) => normalizeStatus(r.status) === 'FULLY_APPROVED' || normalizeStatus(r.status) === 'APPROVED');
      } else if (view !== 'Pending') {
        data = data.filter((r) => normalizeStatus(r.status) === normalizeStatus(view));
      }
      if (category !== 'All') data = data.filter((r) => (r.category || '') === category);
      setRequests(data);
    } catch (err) {
      setToast({ message: 'Failed to load manager data', type: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, [view, category]);

  const filtered = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return requests.filter(
      (req) => (req.title || '').toLowerCase().includes(query) || String(req.createdBy || '').includes(query)
    );
  }, [requests, searchTerm]);

  const isOverdue = (req) => normalizeStatus(req.status) === 'PENDING' && req.dueDate && new Date(req.dueDate) < new Date();

  const handleAction = async (requestId, action) => {
    if (!comment.trim()) {
      setToast({ message: 'Comment is required for approval/rejection', type: 'error' });
      return;
    }

    try {
      setProcessing(true);
      await API.put(`/requests/${requestId}/${action}`, { comment: comment.trim() });
      setSelected(null);
      setSelectedFlow(null);
      setComment('');
      setToast({ message: action === 'approve' ? 'Request Accepted' : 'Request Rejected', type: 'success' });
      loadData();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Action failed', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleCommentOnly = async (requestId) => {
    if (!comment.trim()) {
      setToast({ message: 'Comment is required', type: 'error' });
      return;
    }

    try {
      setProcessing(true);
      await API.post(`/requests/${requestId}/comment`, { comment: comment.trim() });
      setToast({ message: 'Comment sent to employee', type: 'success' });
      setComment('');
      setSelected(null);
      setSelectedFlow(null);
      loadData();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to add comment', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const exportToCSV = () => {
    if (filtered.length === 0) {
      setToast({ message: 'No data to export', type: 'error' });
      return;
    }

    const headers = 'ID,Employee ID,Title,Type,Priority,Status,Due Date,Processed Date\n';
    const rows = filtered
      .map(
        (req) =>
          `${req.id},${req.createdBy},"${req.title}","${req.type || req.category || ''}",${req.priority || ''},${req.status},${req.dueDate || ''},${req.actionDate || ''}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manager_${view.toLowerCase()}_requests.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <AppShell
        title={`${roleLabel} Dashboard`}
        subtitle="Review, approve, and monitor change requests"
        navItems={[
          { key: 'pending', label: 'Pending', active: view === 'Pending', onClick: () => setView('Pending') },
          { key: 'approved', label: 'Approved', active: view === 'Approved', onClick: () => setView('Approved') },
          { key: 'rejected', label: 'Rejected', active: view === 'Rejected', onClick: () => setView('Rejected') },
          { key: 'profile', label: 'Profile', active: false, onClick: () => navigate('/profile') },
        ]}
      >
        <div className="grid-3">
          <StatCard label="Pending" value={stats.pending} />
          <StatCard label="Due Today" value={deadlineStats.dueToday} />
          <StatCard label="Overdue" value={deadlineStats.overdue} />
          <StatCard label="Approved" value={stats.approved} />
          <StatCard label="Rejected" value={stats.rejected} />
        </div>

        <section className="card section-card">
          <div className="section-header">
            <h3 className="section-title">{view} Requests</h3>
            <button className="btn btn-secondary" type="button" onClick={exportToCSV}>Export CSV</button>
          </div>

          <div className="controls-row">
            <input className="input" style={{ maxWidth: 240 }} placeholder="Search by title or user" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <select className="select" style={{ maxWidth: 220 }} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="All">All categories</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Application">Application</option>
              <option value="Database">Database</option>
              <option value="Security">Security</option>
              <option value="Process">Process</option>
              <option value="Other">Other</option>
              <option value="UI Change">UI Change</option>
              <option value="Backend Update">Backend Update</option>
              <option value="Security Patch">Security Patch</option>
              <option value="Database Migration">Database Migration</option>
              <option value="Personal">Personal</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8">
                      <EmptyState
                        title="No matching requests"
                        description="Adjust the search or category filter to find what you need, or wait for more workflow activity."
                        icon={SearchX}
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((req) => (
                    <tr key={req.id} className={isOverdue(req) ? 'overdue' : ''}>
                      <td>{req.createdBy}</td>
                      <td>{req.title}</td>
                      <td>{req.type || req.category || '-'}</td>
                      <td>{req.priority || '-'}</td>
                      <td>{isOverdue(req) ? <StatusBadge status={req.status} overdue /> : <StatusBadge status={req.status} />}</td>
                      <td>{req.due_date || req.dueDate || '-'}</td>
                      <td><DeadlineBadge status={req.deadline_status} /></td>
                      <td>
                        <button className="btn btn-secondary" type="button" onClick={() => setSelected(req)}>
                          {view === 'Pending' ? 'Review' : 'View'}
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

      {selected && (
        <div className="modal-backdrop" onClick={() => { setSelected(null); setSelectedFlow(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Request Review</h3>
            <p><strong>Employee ID:</strong> {selected.createdBy}</p>
            <p><strong>Title:</strong> {selected.title}</p>
            <p><strong>Type:</strong> {selected.type || selected.category || '-'}</p>
            <p><strong>Priority:</strong> {selected.priority || '-'}</p>
            <p><strong>Description:</strong> {selected.description}</p>
            <p><strong>Attachment:</strong> {selected.attachment || 'None'}</p>
            <ApprovalFlowTimeline requestId={selected.id} onFlowLoaded={setSelectedFlow} />
            <RequestTimeline requestId={selected.id} />

            {view === 'Pending' && selectedFlow?.canAct ? (
              <>
                <div className="field">
                  <label>Approval Comment *</label>
                  <textarea className="textarea" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add mandatory review comment" />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" type="button" disabled={processing} onClick={() => handleCommentOnly(selected.id)}>Comment</button>
                  <button className="btn btn-danger" type="button" disabled={processing} onClick={() => handleAction(selected.id, 'reject')}>Reject</button>
                  <button className="btn btn-success" type="button" disabled={processing} onClick={() => handleAction(selected.id, 'approve')}>Approve</button>
                </div>
              </>
            ) : (
              <>
                {!selectedFlow?.canAct && (
                  <p className="hint" style={{ marginTop: 8 }}>
                    Current level approver role: <strong>{selectedFlow?.currentLevel?.roleName || 'N/A'}</strong>. You are logged in as <strong>{roleLabel}</strong>.
                  </p>
                )}
                <p><strong>Decision Comment:</strong> {selected.comment || 'No comment provided'}</p>
              </>
            )}
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-secondary" type="button" onClick={() => { setSelected(null); setSelectedFlow(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
