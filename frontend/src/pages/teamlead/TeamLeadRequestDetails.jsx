import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../api/axios';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import ToastMessage from '../../components/ToastMessage';

const levelLabel = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'TEAM_LEAD') return 'TEAM_LEAD';
  if (normalized === 'MANAGER') return 'MANAGER';
  if (normalized === 'ADMIN') return 'ADMIN';
  return '-';
};

export default function TeamLeadRequestDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    let active = true;
    const fetchRequest = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/requests/${id}`);
        if (!active) return;
        if (res.data?.success) {
          setRequest(res.data.data);
        } else {
          setToast({ message: 'Failed to load request details', type: 'error' });
        }
      } catch (err) {
        if (active) {
          setToast({ message: err.response?.data?.message || 'Failed to load request details', type: 'error' });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRequest();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <>
      <AppShell
        title="Request Details"
        subtitle={`Request #${id}`}
        navItems={[
          { key: 'dashboard', label: 'Dashboard', active: false, onClick: () => navigate('/teamlead/dashboard') },
          { key: 'pending', label: 'Pending Approvals', active: false, onClick: () => navigate('/teamlead/pending') },
          { key: 'history', label: 'Approval History', active: false, onClick: () => navigate('/teamlead/history') },
        ]}
      >
        {loading ? (
          <section className="card section-card">
            <div className="section-header"><h3 className="section-title">Loading...</h3></div>
          </section>
        ) : !request ? (
          <section className="card section-card">
            <div className="section-header"><h3 className="section-title">Request not found</h3></div>
          </section>
        ) : (
          <>
            <section className="card section-card">
              <div className="section-header">
                <h3 className="section-title">Request Information</h3>
              </div>
              <div style={{ padding: 16 }}>
                <p><strong>Title:</strong> {request.title}</p>
                <p><strong>Description:</strong> {request.description}</p>
                <p><strong>Change Type:</strong> {request.change_type || '-'}</p>
                <p><strong>Priority:</strong> {request.priority || '-'}</p>
                <p><strong>Impact:</strong> {request.impact || '-'}</p>
                <p><strong>Status:</strong> <StatusBadge status={request.status} /></p>
                <p><strong>Current Level:</strong> {levelLabel(request.current_level)}</p>
                <p><strong>Created Date:</strong> {request.created_at || '-'}</p>
              </div>
            </section>

            <section className="card section-card">
              <div className="section-header">
                <h3 className="section-title">Employee Information</h3>
              </div>
              <div style={{ padding: 16 }}>
                <p><strong>Employee Name:</strong> {request.employee_name || '-'}</p>
                <p><strong>Email:</strong> {request.employee_email || '-'}</p>
                <p><strong>Department:</strong> {request.employee_department || '-'}</p>
              </div>
            </section>

            <section className="card section-card">
              <div className="section-header">
                <h3 className="section-title">Approval History</h3>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Approved By</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(request.approvals || []).length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>No approval records</td></tr>
                    ) : (
                      request.approvals.map((row, idx) => (
                        <tr key={`${row.role}-${idx}`}>
                          <td>{row.role}</td>
                          <td>{row.status}</td>
                          <td>{row.approved_by || row.approved_by_name || '-'}</td>
                          <td>{row.timestamp || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </AppShell>

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
