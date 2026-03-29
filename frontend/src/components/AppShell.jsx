import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  FolderClock,
  Gauge,
  History,
  LayoutDashboard,
  Menu,
  UserRound,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import CopilotPanel from './CopilotPanel';

export default function AppShell({ title, subtitle, navItems = [], children }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);

  const name = localStorage.getItem('name') || 'User';
  const role = localStorage.getItem('role') || '';
  const dashboardThemePaths = new Set([
    '/employee/dashboard',
    '/teamlead/dashboard',
    '/manager/dashboard',
    '/admin/dashboard',
    '/analytics',
    '/employee-dashboard',
    '/teamlead-dashboard',
    '/manager-dashboard',
    '/admin-dashboard',
  ]);
  const showThemeToggle = dashboardThemePaths.has(location.pathname);
  const showCopilot = role === 'EMPLOYEE' && location.pathname === '/employee/dashboard';
  const finalNavItems = navItems.some((item) => item.key === 'analytics')
    ? navItems
    : [
        ...navItems,
        {
          key: 'analytics',
          label: 'Analytics',
          active: location.pathname === '/analytics',
          onClick: () => navigate('/analytics'),
        },
      ];

  const logout = () => {
    localStorage.clear();
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
    <div className="page-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">SmartCR Portal</div>
        <div className="nav-list">
          {finalNavItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${item.active ? 'active' : ''}`}
              onClick={() => {
                item.onClick?.();
                setOpen(false);
              }}
            >
              <span className="nav-item-icon">{resolveNavIcon(item.key)}</span>
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" className="mobile-menu" onClick={() => setOpen(!open)}>
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div className="topbar-left">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>
          <div className="topbar-right">
            {showThemeToggle ? <ThemeToggle /> : null}
            <NotificationBell />
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="avatar-btn"
                title="Profile"
                onClick={() => setProfileOpen((value) => !value)}
              >
                {name[0]?.toUpperCase() || 'U'}
              </button>
              {profileOpen && (
                <div style={styles.profileMenu}>
                  <button type="button" style={styles.profileItem} onClick={() => { setProfileOpen(false); navigate('/profile'); }}>
                    View Profile
                  </button>
                  <button type="button" style={styles.profileItem} onClick={() => { setProfileOpen(false); navigate('/profile', { state: { section: 'password' } }); }}>
                    Change Password
                  </button>
                  <button type="button" style={styles.profileItem} onClick={logout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <section className="page-content fade-in">{children}</section>
        {showCopilot ? <CopilotPanel /> : null}
      </main>
    </div>
  );
}

function resolveNavIcon(key) {
  const value = String(key || '').toLowerCase();
  if (value.includes('analytics')) return <BarChart3 size={16} />;
  if (value.includes('history')) return <History size={16} />;
  if (value.includes('pending')) return <FolderClock size={16} />;
  if (value.includes('dashboard')) return <LayoutDashboard size={16} />;
  if (value.includes('profile')) return <UserRound size={16} />;
  if (value.includes('new')) return <ClipboardList size={16} />;
  return <Gauge size={16} />;
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
