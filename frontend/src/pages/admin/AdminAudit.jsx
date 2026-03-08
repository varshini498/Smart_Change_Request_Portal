import { useEffect, useMemo, useState } from 'react';
import AdminLayout from './AdminLayout';
import { adminService } from '../../services/adminService';
import ToastMessage from '../../components/ToastMessage';

const PAGE_SIZE = 10;

export default function AdminAudit() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ user: '', action: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await adminService.getAuditLogs({
        user: filters.user || undefined,
        action: filters.action || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setRows(res.data.data || []);
    } catch (err) {
      setToast({ message: 'Failed to load audit logs', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page]
  );

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  return (
    <>
      <AdminLayout title="Audit Logs" activeKey="audit">
        <section className="card section-card">
          <div className="section-header">
            <h3 className="section-title">Audit Logs</h3>
          </div>

          <div className="controls-row">
            <input
              className="input"
              placeholder="User ID"
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
            />
            <input
              className="input"
              placeholder="Action"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
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
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>Loading...</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: '#64748b' }}>No logs found</td></tr>
                ) : (
                  pageRows.map((log) => (
                    <tr key={log.id}>
                      <td>{log.timestamp}</td>
                      <td>{log.user_id}</td>
                      <td>{log.action}</td>
                      <td>{log.target_id ?? '-'}</td>
                      <td>{log.comment || '-'}</td>
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

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
