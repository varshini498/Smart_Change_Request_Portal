import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { adminService } from '../../services/adminService';
import ToastMessage from '../../components/ToastMessage';
import DeadlineBadge from '../../components/DeadlineBadge';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { FolderSearch } from 'lucide-react';

const STATUS_OPTIONS = ['All', 'Pending', 'Escalated', 'Fully Approved', 'Rejected', 'Withdrawn'];
const PAGE_SIZE = 10;

const levelLabel = (value) => {
  if (value === 1) return 'TEAM_LEAD';
  if (value === 2) return 'MANAGER';
  return '-';
};

export default function AdminRequests() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('approve');
  const [filters, setFilters] = useState({ status: 'All', employee: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [override, setOverride] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('Fully Approved');
  const [overrideReason, setOverrideReason] = useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await adminService.getRequests({
        status: filters.status === 'All' ? undefined : filters.status,
        employee: filters.employee || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        limit: PAGE_SIZE,
      });
      const payload = res.data.data;
      setRows(payload.rows || []);
      setTotal(payload.total || 0);
    } catch (err) {
      setToast({ message: 'Failed to load requests', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filters, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleOverride = async () => {
    if (!overrideReason.trim()) {
      setToast({ message: 'Override reason is required', type: 'error' });
      return;
    }
    try {
      await adminService.overrideRequest(override.id, {
        status: overrideStatus,
        reason: overrideReason.trim(),
      });
      setOverride(null);
      setOverrideReason('');
      loadRequests();
    } catch (err) {
      setToast({ message: 'Override failed', type: 'error' });
    }
  };

  const handleEscalate = async (id) => {
    try {
      await adminService.escalateRequest(id);
      setToast({ message: 'Request escalated to Manager', type: 'success' });
      loadRequests();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Escalation failed', type: 'error' });
    }
  };

  const handleBulk = async () => {
    if (!selectedIds.length) {
      setToast({ message: 'Select requests for bulk action', type: 'error' });
      return;
    }
    try {
      await adminService.bulkAction({ action: bulkAction, request_ids: selectedIds });
      setToast({ message: `Bulk ${bulkAction} completed`, type: 'success' });
      setSelectedIds([]);
      loadRequests();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Bulk action failed', type: 'error' });
    }
  };

  const normalizeStatus = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  const canDeleteRequest = (req) => {
    const status = normalizeStatus(req.status);
    const level = Number(req.current_level);
    if (status === 'PENDING' && level === 1) return true;
    if (['FULLY_APPROVED', 'REJECTED', 'WITHDRAWN'].includes(status)) return true;
    if (status === 'PENDING' && level === 2) return false;
    return false;
  };

  const handleDelete = async (req) => {
    if (!canDeleteRequest(req)) {
      setToast({ message: 'Delete blocked: request is in Manager approval stage', type: 'error' });
      return;
    }
    if (!window.confirm(`Delete request #${req.id}?`)) return;
    try {
      await adminService.deleteRequest(req.id);
      setToast({ message: 'Request deleted', type: 'success' });
      loadRequests();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Delete failed', type: 'error' });
    }
  };

  const pageRows = useMemo(() => rows, [rows]);

  return (
    <>
      <AdminLayout title="Requests" activeKey="requests">
        <section className="card section-card">
          <div className="section-header">
            <h3 className="section-title">Global Requests</h3>
          </div>

          <div className="controls-row">
            <select
              className="select"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Employee name"
              value={filters.employee}
              onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
            />
            <input
              type="date"
              className="input"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
            <input
              type="date"
              className="input"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
            <select className="select" value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
              <option value="approve">Approve Selected</option>
              <option value="reject">Reject Selected</option>
              <option value="archive">Archive Selected</option>
            </select>
            <button className="btn btn-primary" type="button" onClick={handleBulk}>
              Apply Bulk
            </button>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={pageRows.length > 0 && pageRows.every((r) => selectedIds.includes(r.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const union = [...new Set([...selectedIds, ...pageRows.map((r) => r.id)])];
                          setSelectedIds(union);
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => !pageRows.some((r) => r.id === id)));
                        }
                      }}
                    />
                  </th>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Current Level</th>
                  <th>Created</th>
                  <th>Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center' }}>Loading...</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <EmptyState
                        title="No requests found"
                        description="Try changing the filters, or wait for new workflow activity to appear."
                        icon={FolderSearch}
                      />
                    </td>
                  </tr>
                ) : (
                  pageRows.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(req.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds((prev) => [...new Set([...prev, req.id])]);
                            else setSelectedIds((prev) => prev.filter((id) => id !== req.id));
                          }}
                        />
                      </td>
                      <td>{req.id}</td>
                      <td>{req.title}</td>
                      <td>{req.employee_name || '-'}</td>
                      <td><StatusBadge status={req.status} /></td>
                      <td>{levelLabel(req.current_level)}</td>
                      <td>{req.created_at || '-'}</td>
                      <td><DeadlineBadge status={req.deadline_status} /></td>
                      <td>
                        <div className="actions-row">
                          <button className="btn btn-secondary" type="button" onClick={() => handleEscalate(req.id)}>
                            Escalate
                          </button>
                          <button className="btn btn-secondary" type="button" onClick={() => setOverride(req)}>
                            Override
                          </button>
                          <button className="btn btn-secondary" type="button" onClick={() => navigate(`/requests/${req.id}`)}>
                            View
                          </button>
                          <button
                            className="btn btn-danger"
                            type="button"
                            disabled={!canDeleteRequest(req)}
                            onClick={() => handleDelete(req)}
                          >
                            Delete
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
            <button className="btn btn-secondary" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <span className="hint">Page {page} of {totalPages}</span>
            <button className="btn btn-secondary" type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </section>
      </AdminLayout>

      {override && (
        <div className="modal-backdrop" onClick={() => setOverride(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Override Request</h3>
            <p>Request #{override.id} - {override.title}</p>
            <div className="field">
              <label>Status</label>
              <select className="select" value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}>
                <option value="Fully Approved">Fully Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="field">
              <label>Reason</label>
              <textarea className="textarea" rows={4} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" type="button" onClick={() => setOverride(null)}>Cancel</button>
              <button className="btn btn-primary" type="button" onClick={handleOverride}>Submit</button>
            </div>
          </div>
        </div>
      )}

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
