import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import ToastMessage from '../../components/ToastMessage';
import { getDisplayRequestNumber } from '../../utils/requestDisplay';

const levelLabel = (level) => {
  const normalized = Number(level);
  if (normalized === 1) return 'TEAM_LEAD';
  if (normalized === 2) return 'MANAGER';
  if (normalized === 3) return 'ADMIN';
  return '-';
};

export default function TeamLeadHistory() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const loadHistory = async () => {
    try {
      const res = await API.get('/teamlead/approved-history');
      setRequests(res.data.data || []);
    } catch (err) {
      setToast({ message: 'Failed to load approval history', type: 'error' });
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((req) => {
      const idMatch = String(getDisplayRequestNumber(req)).includes(query);
      const titleMatch = (req.title || '').toLowerCase().includes(query);
      return idMatch || titleMatch;
    });
  }, [requests, search]);

  return (
    <>
      <AppShell
        title="Team Lead History"
        subtitle="Your approval decisions"
        navItems={[
          { key: 'dashboard', label: 'Dashboard', active: false, onClick: () => navigate('/teamlead/dashboard') },
          { key: 'pending', label: 'Pending Approvals', active: false, onClick: () => navigate('/teamlead/pending') },
          { key: 'history', label: 'Approval History', active: true, onClick: () => navigate('/teamlead/history') },
        ]}
      >
        <section className="card section-card">
          <div className="section-header">
            <h3 className="section-title">Approved History</h3>
          </div>

          <div className="controls-row">
            <input
              className="input"
              style={{ maxWidth: 260 }}
              placeholder="Search by ID or title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Employee</th>
                  <th>Current Status</th>
                  <th>Current Level</th>
                  <th>Approved Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', color: '#64748b' }}>
                      No approved history
                    </td>
                  </tr>
                ) : (
                  filtered.map((req) => (
                    <tr key={`${req.id}-${req.approved_at || ''}`}>
                      <td>{getDisplayRequestNumber(req)}</td>
                      <td>{req.title}</td>
                      <td>{req.type || req.category || '-'}</td>
                      <td>{req.priority || '-'}</td>
                      <td>{req.employee_name || '-'}</td>
                      <td><StatusBadge status={req.status} /></td>
                      <td>{levelLabel(req.current_level)}</td>
                      <td>{req.approved_at || '-'}</td>
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
