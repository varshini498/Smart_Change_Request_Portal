import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import ToastMessage from '../../components/ToastMessage';
import ApprovalFlowTimeline from '../../components/ApprovalFlowTimeline';
import EmptyState from '../../components/EmptyState';
import { FolderSearch } from 'lucide-react';
import { getDisplayRequestNumber } from '../../utils/requestDisplay';

const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High', 'Critical'];
const PAGE_SIZE = 10;

export default function TeamLeadPending() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('All');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const loadPending = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await API.get('/teamlead/pending', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('STATUS:', res.status);
      console.log('RESPONSE:', res.data);
      if (res.data?.success) {
        const next = Array.isArray(res.data.data) ? res.data.data : [];
        console.log('SET REQUESTS:', next);
        setRequests(next);
      } else {
        console.error('API returned failure:', res.data?.message);
      }
    } catch (err) {
      console.error('Error loading pending approvals:', err);
      setToast({ message: 'Failed to load pending approvals', type: 'error' });
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  useEffect(() => {
    console.log('REQUESTS STATE:', requests);
  }, [requests]);

  useEffect(() => {
    setPage(1);
  }, [search, priority, sortOrder]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = requests.filter((req) => {
      const idMatch = String(getDisplayRequestNumber(req)).includes(query);
      const titleMatch = (req.title || '').toLowerCase().includes(query);
      const priorityMatch = priority === 'All' || (req.priority || '') === priority;
      return (idMatch || titleMatch) && priorityMatch;
    });

    rows = rows.sort((a, b) => {
      const aDate = new Date(a.dateCreated || a.created_at || 0).getTime();
      const bDate = new Date(b.dateCreated || b.created_at || 0).getTime();
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    });
    return rows;
  }, [requests, search, priority, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAction = async (id, action) => {
    if (!comment.trim()) {
      setToast({ message: 'Comment is required', type: 'error' });
      return;
    }
    if (action === 'reject') {
      const confirm = window.confirm('Reject this request? This cannot be undone.');
      if (!confirm) return;
    }

    try {
      setProcessing(true);
      await API.post(`/requests/${id}/${action}`, { comment: comment.trim() });
      setToast({ message: `Request ${action}ed`, type: 'success' });
      setSelected(null);
      setComment('');
      await loadPending();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Action failed', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickAction = async (id, action) => {
    const userComment = window.prompt(`Enter ${action} comment`);
    if (!userComment || !userComment.trim()) {
      setToast({ message: 'Comment is required', type: 'error' });
      return;
    }
    if (action === 'reject') {
      const confirmed = window.confirm('Reject this request? This cannot be undone.');
      if (!confirmed) return;
    }
    try {
      await API.post(`/requests/${id}/${action}`, { comment: userComment.trim() });
      setToast({ message: `Request ${action}ed`, type: 'success' });
      await loadPending();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Action failed', type: 'error' });
    }
  };

  return (
    <>
      <AppShell
        title="Team Lead Approvals"
        subtitle="Pending Level 1 requests"
        navItems={[
          { key: 'dashboard', label: 'Dashboard', active: false, onClick: () => navigate('/teamlead/dashboard') },
          { key: 'pending', label: 'Pending Approvals', active: true, onClick: () => navigate('/teamlead/pending') },
          { key: 'history', label: 'Approval History', active: false, onClick: () => navigate('/teamlead/history') },
        ]}
      >
        <section className="card section-card">
          <div className="section-header">
            <h3 className="section-title">Pending Approvals</h3>
          </div>

          <div className="controls-row">
            <input
              className="input"
              style={{ maxWidth: 260 }}
              placeholder="Search by ID or title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ maxWidth: 200 }}>
              {PRIORITY_OPTIONS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select className="select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
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
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <EmptyState
                        title="No matching approvals"
                        description="Try a different search term or priority filter. New approval requests will show up here automatically."
                        icon={FolderSearch}
                      />
                    </td>
                  </tr>
                ) : (
                  pageRows.map((req) => (
                    <tr key={req.id}>
                      <td>{getDisplayRequestNumber(req)}</td>
                      <td>{req.title}</td>
                      <td>{req.type || req.category || '-'}</td>
                      <td>{req.employee_name || req.requestedBy || req.createdBy || '-'}</td>
                      <td>{req.department || '-'}</td>
                      <td>{req.priority || '-'}</td>
                      <td>{req.dateCreated || req.created_at || '-'}</td>
                      <td><StatusBadge status={req.status} /></td>
                      <td>
                        <div className="actions-row">
                          <button className="btn btn-success" type="button" onClick={() => handleQuickAction(req.id, 'approve')}>
                            Approve
                          </button>
                          <button className="btn btn-danger" type="button" onClick={() => handleQuickAction(req.id, 'reject')}>
                            Reject
                          </button>
                          <button className="btn btn-secondary" type="button" onClick={() => navigate(`/teamlead/request/${req.id}`)}>
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span className="hint">Page {page} of {totalPages}</span>
            <div className="actions-row">
              <button className="btn btn-secondary" type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <button className="btn btn-secondary" type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          </div>
        </section>
      </AppShell>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Request Details</h3>
            <p><strong>Title:</strong> {selected.title}</p>
            <p><strong>Description:</strong> {selected.description}</p>
            <p><strong>Type:</strong> {selected.type || selected.category || '-'}</p>
            <p><strong>Priority:</strong> {selected.priority || '-'}</p>
            <p><strong>Attachments:</strong> {selected.attachment || 'None'}</p>
            <p><strong>Submitted By:</strong> {selected.requestedBy || selected.createdBy || '-'}</p>
            <p><strong>Created Date:</strong> {selected.dateCreated || selected.created_at || '-'}</p>

            <ApprovalFlowTimeline requestId={selected.id} />

            <div className="field">
              <label>Comment *</label>
              <textarea
                className="textarea"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add your approval/rejection comment"
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" type="button" onClick={() => navigate(`/teamlead/request/${selected.id}`)}>
                View Details
              </button>
              <button className="btn btn-danger" type="button" disabled={processing} onClick={() => handleAction(selected.id, 'reject')}>
                Reject
              </button>
              <button className="btn btn-success" type="button" disabled={processing} onClick={() => handleAction(selected.id, 'approve')}>
                Approve
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
