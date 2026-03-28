import { Link, useNavigate } from 'react-router-dom';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const name = localStorage.getItem('name') || 'Manager';

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="page-shell">
      <aside className="sidebar open">
        <div className="brand">SmartCR Portal</div>
        <div className="nav-list">
          <Link className="nav-item active" to="/manager/dashboard">Dashboard</Link>
          <Link className="nav-item" to="/manager/pending">Pending Requests</Link>
          <Link className="nav-item" to="/manager/all">All Requests</Link>
          <Link className="nav-item" to="/analytics">Analytics</Link>
          <Link className="nav-item" to="/profile">Profile</Link>
        </div>
        <div className="sidebar-footer">
          <div style={{ padding: '0 10px 8px', fontWeight: 600 }}>{name}</div>
          <button type="button" className="btn btn-secondary" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="main-panel">
        <section className="page-content">{children}</section>
      </main>
    </div>
  );
}
