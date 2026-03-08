import { useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { key: 'users', label: 'Users', path: '/admin/users' },
  { key: 'requests', label: 'Requests', path: '/admin/requests' },
  { key: 'categories', label: 'Categories', path: '/admin/categories' },
  { key: 'audit', label: 'Audit Logs', path: '/admin/audit' },
  { key: 'settings', label: 'Settings', path: '/admin/settings' },
];

export default function AdminLayout({ title, activeKey, children }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    navigate('/login');
  };

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
          <button className="btn btn-secondary" type="button" onClick={handleLogout}>
            Logout
          </button>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
