import { BarChart3, ClipboardList, LayoutDashboard, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

const items = [
  { name: 'Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
  { name: 'Pending Requests', path: '/manager/dashboard', icon: ClipboardList },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const name = localStorage.getItem('name') || 'Manager';
  const role = localStorage.getItem('role') || 'User';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <aside style={styles.sidebar}>
      <h2 style={styles.logo}>SmartCR Portal</h2>
      <div style={styles.profile}>
        <div style={styles.avatar}>{name[0]?.toUpperCase() || 'U'}</div>
        <p style={{ margin: 0 }}><strong>{name}</strong></p>
        <small>{role.toUpperCase()}</small>
      </div>

      <nav style={styles.nav}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              style={({ isActive }) => ({
                ...styles.link,
                ...(isActive ? styles.linkActive : {}),
              })}
            >
              <Icon size={16} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <button onClick={handleLogout} style={styles.logoutBtn}>
        <LogOut size={16} />
        <span>Logout</span>
      </button>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '250px',
    background: '#1e293b',
    color: 'white',
    height: '100vh',
    position: 'fixed',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
  },
  logo: {
    textAlign: 'center',
    color: '#3b82f6',
    marginBottom: '30px',
    borderBottom: '1px solid #334155',
    paddingBottom: '10px',
  },
  profile: {
    textAlign: 'center',
    marginBottom: '30px',
    padding: '15px',
    background: '#334155',
    borderRadius: '10px',
  },
  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: '#3b82f6',
    margin: '0 auto 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'white',
    textDecoration: 'none',
    padding: '10px 12px',
    borderRadius: '8px',
    background: '#1e293b',
  },
  linkActive: {
    background: '#334155',
    color: '#93c5fd',
  },
  logoutBtn: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
};
