import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const formatLabel = (templateKey, metaJson) => {
  let meta = null;
  try {
    meta = metaJson ? JSON.parse(metaJson) : null;
  } catch (_error) {
    meta = null;
  }

  const title = meta?.title ? `: ${meta.title}` : '';
  switch (templateKey) {
    case 'request_submitted':
      return `Your request was submitted${title}`;
    case 'request_created':
      return `New request created${title}`;
    case 'request_approved':
      return `Your request was approved${title}`;
    case 'request_rejected':
      return `Your request was rejected${title}`;
    case 'request_commented':
      return `Manager added a comment${title}`;
    case 'request_next_level':
      return `Request moved to next approval level${title}`;
    case 'request_level_advanced':
      return `Your request progressed to next level${title}`;
    case 'request_withdrawn':
      return `A request was withdrawn${title}`;
    case 'sla_overdue_escalation':
      return `SLA escalation triggered${title}`;
    default:
      return templateKey || 'Notification';
  }
};

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      const res = await API.get('/notifications?limit=20&unreadOnly=true');
      setItems(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error?.response?.data || error.message);
    }
  };

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const topItems = useMemo(() => items.slice(0, 5), [items]);

  const routeForNotification = (requestId) => {
    if (!requestId) return null;
    return `/requests/${requestId}`;
  };

  const markOneRead = async (item) => {
    try {
      await API.put(`/notifications/${item.id}/read`);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      const target = routeForNotification(item.requestId);
      if (target) {
        setOpen(false);
        navigate(target);
      }
    } catch (_error) {
      // no-op
    }
  };

  const markAllRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setItems([]);
      setUnreadCount(0);
    } catch (_error) {
      // no-op
    }
  };

  return (
    <div style={styles.wrapper} ref={panelRef}>
      <button
        type="button"
        style={styles.bellButton}
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) loadNotifications();
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div style={styles.panel}>
          <div style={styles.header}>
            <strong>Notifications</strong>
            <button type="button" style={styles.markAllBtn} onClick={markAllRead}>Mark all read</button>
          </div>

          <div style={styles.list}>
            {topItems.length === 0 ? (
              <div style={styles.empty}>No notifications</div>
            ) : (
              topItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  style={{
                    ...styles.item,
                    background: item.status === 'unread' ? '#eff6ff' : '#ffffff',
                  }}
                  onClick={() => markOneRead(item)}
                >
                  <div style={styles.itemText}>{item.message || formatLabel(item.templateKey, item.metaJson)}</div>
                  <div style={styles.itemTime}>{new Date(item.createdAt).toLocaleString()}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { position: 'relative' },
  bellButton: {
    position: 'relative',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    borderRadius: '0.875rem',
    padding: '0.7rem 0.8rem',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 700,
    boxShadow: '0 6px 14px rgba(15, 23, 42, 0.05)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
  },
  badge: {
    marginLeft: '8px',
    background: '#ef4444',
    color: '#fff',
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '2px 6px',
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: '44px',
    width: '22.5rem',
    background: 'var(--surface)',
    borderRadius: '1rem',
    border: '1px solid var(--border)',
    boxShadow: '0 18px 45px rgba(2, 6, 23, 0.28)',
    zIndex: 3500,
    color: 'var(--text)',
    animation: 'slide-down 0.25s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.9rem 1rem',
    borderBottom: '1px solid var(--border)',
    fontSize: '0.95rem',
  },
  markAllBtn: {
    border: 'none',
    background: 'transparent',
    color: 'var(--primary)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 700,
  },
  list: {
    maxHeight: '20rem',
    overflowY: 'auto',
  },
  empty: {
    padding: '1rem',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  item: {
    width: '100%',
    border: 'none',
    borderBottom: '1px solid var(--line)',
    textAlign: 'left',
    padding: '0.85rem 1rem',
    cursor: 'pointer',
  },
  itemText: {
    fontSize: '0.95rem',
    color: 'var(--text)',
    marginBottom: '0.3rem',
  },
  itemTime: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
};
