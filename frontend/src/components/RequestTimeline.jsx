import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MessageSquare, PlusCircle, ShieldX, Edit3, Clock3 } from 'lucide-react';
import API from '../api/axios';

const colorByAction = (action) => {
  const key = String(action || '').toLowerCase();
  if (key.includes('approve')) return { dot: '#16a34a', bg: '#dcfce7', text: '#166534', icon: CheckCircle2 };
  if (key.includes('reject')) return { dot: '#dc2626', bg: '#fee2e2', text: '#991b1b', icon: ShieldX };
  if (key.includes('comment')) return { dot: '#2563eb', bg: '#dbeafe', text: '#1d4ed8', icon: MessageSquare };
  if (key.includes('update') || key.includes('edit')) return { dot: '#d97706', bg: '#ffedd5', text: '#9a3412', icon: Edit3 };
  if (key.includes('create')) return { dot: '#475569', bg: '#e2e8f0', text: '#334155', icon: PlusCircle };
  return { dot: '#64748b', bg: '#f1f5f9', text: '#334155', icon: Clock3 };
};

export default function RequestTimeline({ requestId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (!requestId) return;

    const loadTimeline = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await API.get(`/requests/${requestId}/activity`);
        setItems(res.data.activity || []);
      } catch (err) {
        try {
          const fallback = await API.get(`/requests/${requestId}/audit`);
          const mapped = (fallback.data.logs || []).map((log) => ({
            id: log.id,
            requestId: log.requestId,
            actionType: log.action,
            userId: log.actorId,
            userName: `User ${log.actorId}`,
            userRole: log.actorRole,
            comment: log.comment,
            timestamp: log.createdAt,
          }));
          setItems(mapped);
        } catch (_fallbackError) {
          setError(err.response?.data?.message || 'Failed to load activity');
        }
      } finally {
        setLoading(false);
      }
    };

    loadTimeline();
  }, [requestId]);

  const actionTypes = useMemo(() => {
    const set = new Set(items.map((item) => item.actionType).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'All') return items;
    return items.filter((item) => item.actionType === filter);
  }, [items, filter]);

  return (
    <div className="card" style={{ marginTop: 12, borderStyle: 'dashed' }}>
      <div className="section-header" style={{ borderBottom: '1px dashed #e2e8f0' }}>
        <h4 className="section-title">Activity Timeline</h4>
        <select className="select" style={{ maxWidth: 170 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          {actionTypes.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
      </div>

      <div style={{ padding: 12 }}>
        {loading && <p className="hint" style={{ margin: 0 }}>Loading timeline...</p>}
        {!loading && error && <p className="hint" style={{ margin: 0, color: '#b91c1c' }}>{error}</p>}
        {!loading && !error && filtered.length === 0 && <p className="hint" style={{ margin: 0 }}>No activity available.</p>}

        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((item) => {
              const style = colorByAction(item.actionType);
              const Icon = style.icon;
              return (
                <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ marginTop: 2 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: style.dot,
                        display: 'inline-block',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background: style.bg,
                          color: style.text,
                          borderRadius: 999,
                          padding: '2px 10px',
                        }}
                      >
                        <Icon size={12} />
                        {item.actionType}
                      </span>
                      <span className="hint" style={{ fontSize: 11 }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="hint" style={{ marginTop: 6 }}>
                      By <strong style={{ color: '#334155' }}>{item.userName}</strong> ({item.userRole})
                    </div>
                    {item.comment && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 13,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: 8,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {item.comment}
                      </div>
                    )}
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
