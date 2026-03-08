import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle, CircleEllipsis } from 'lucide-react';
import API from '../api/axios';

const iconForStatus = (status) => {
  const key = String(status || '').trim().toUpperCase();
  if (key === 'APPROVED') return { Icon: CheckCircle2, color: '#16a34a', label: 'Approved' };
  if (key === 'REJECTED') return { Icon: XCircle, color: '#dc2626', label: 'Rejected' };
  if (key === 'PENDING') return { Icon: Clock3, color: '#d97706', label: 'Pending' };
  return { Icon: CircleEllipsis, color: '#64748b', label: status || 'Waiting' };
};

export default function ApprovalFlowTimeline({ requestId, onFlowLoaded }) {
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!requestId) return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await API.get(`/requests/${requestId}/approval-status`);
        setFlow(res.data);
        onFlowLoaded?.(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load approval flow');
        onFlowLoaded?.(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [requestId, onFlowLoaded]);

  return (
    <div className="card" style={{ marginTop: 12, borderStyle: 'dashed' }}>
      <div className="section-header" style={{ borderBottom: '1px dashed var(--border)' }}>
        <h4 className="section-title">Approval Flow</h4>
      </div>
      <div style={{ padding: 12 }}>
        {loading && <p className="hint" style={{ margin: 0 }}>Loading approval flow...</p>}
        {!loading && error && <p className="hint" style={{ margin: 0, color: 'var(--danger-text)' }}>{error}</p>}
        {!loading && !error && flow?.timeline?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="hint" style={{ marginBottom: 4 }}>
              Overall Status: <strong style={{ color: 'var(--text)' }}>{flow.request?.status}</strong>
              {flow.currentLevel?.roleName ? (
                <> | Current Level: <strong style={{ color: 'var(--text)' }}>{flow.currentLevel.roleName}</strong></>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ marginTop: 2 }}>
                <CheckCircle2 size={16} color="#2563eb" />
              </div>
              <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>Created</strong>
                  <span className="hint">Submitted</span>
                </div>
                <div className="hint" style={{ marginTop: 4 }}>
                  {flow.request?.creatorName || 'Employee'}
                  {flow.request?.dateCreated ? ` • ${new Date(flow.request.dateCreated).toLocaleString()}` : ''}
                </div>
              </div>
            </div>

            {flow.timeline.map((step) => {
              const { Icon, color, label } = iconForStatus(step.status);
              return (
                <div key={`${step.levelNumber}-${step.roleName}`} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ marginTop: 2 }}>
                    <Icon size={16} color={color} />
                  </div>
                  <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong>{step.levelNumber}. {step.roleName}</strong>
                      <span className="hint">{label}</span>
                    </div>
                    <div className="hint" style={{ marginTop: 4 }}>
                      {step.approverName ? `By ${step.approverName}` : 'Awaiting action'}
                      {step.timestamp ? ` • ${new Date(step.timestamp).toLocaleString()}` : ''}
                    </div>
                    {step.comment ? (
                      <div style={{ marginTop: 8, background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, whiteSpace: 'pre-wrap' }}>
                        {step.comment}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
