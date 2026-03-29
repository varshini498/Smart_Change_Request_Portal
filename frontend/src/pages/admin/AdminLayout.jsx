import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, FolderKanban, LayoutDashboard, Logs, Settings, Shapes, Users } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import NotificationBell from '../../components/NotificationBell';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { key: 'users', label: 'Users', path: '/admin/users' },
  { key: 'requests', label: 'Requests', path: '/admin/requests' },
  { key: 'analytics', label: 'Analytics', path: '/analytics' },
  { key: 'categories', label: 'Categories', path: '/admin/categories' },
  { key: 'audit', label: 'Audit Logs', path: '/admin/audit' },
  { key: 'settings', label: 'Settings', path: '/admin/settings' },
];

export default function AdminLayout({ title, activeKey, children }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const name = localStorage.getItem('name') || 'Admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    navigate('/login');
  };

  useEffect(() => {
    const onDocClick = (event) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          Smart CRP
          <span>Admin</span>
        </div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`admin-nav-item ${activeKey === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="admin-nav-icon">{resolveAdminIcon(item.key)}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <div>
            <h2>{title}</h2>
            <p>Administrative control panel</p>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <NotificationBell />
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="avatar-btn"
                title="Profile"
                onClick={() => setProfileOpen((value) => !value)}
              >
                {name[0]?.toUpperCase() || 'A'}
              </button>
              {profileOpen && (
                <div style={styles.profileMenu}>
                  <button type="button" style={styles.profileItem} onClick={() => { setProfileOpen(false); navigate('/profile'); }}>
                    View Profile
                  </button>
                  <button type="button" style={styles.profileItem} onClick={() => { setProfileOpen(false); navigate('/profile', { state: { section: 'password' } }); }}>
                    Change Password
                  </button>
                  <button type="button" style={styles.profileItem} onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="fade-in">{children}</main>
      </div>
    </div>
  );
}

const styles = {
  profileMenu: {
    position: 'absolute',
    right: 0,
    top: '44px',
    minWidth: '180px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow)',
    zIndex: 3400,
    overflow: 'hidden',
    animation: 'slide-down 0.25s ease',
  },
  profileItem: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    padding: '10px 12px',
    cursor: 'pointer',
    color: 'var(--text)',
  },
};

function resolveAdminIcon(key) {
  switch (key) {
    case 'dashboard':
      return <LayoutDashboard size={16} />;
    case 'users':
      return <Users size={16} />;
    case 'requests':
      return <FolderKanban size={16} />;
    case 'analytics':
      return <BarChart3 size={16} />;
    case 'categories':
      return <Shapes size={16} />;
    case 'audit':
      return <Logs size={16} />;
    case 'settings':
      return <Settings size={16} />;
    default:
      return <LayoutDashboard size={16} />;
  }
}
