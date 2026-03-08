import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <header className="topbar" style={{ position: 'static' }}>
      <div className="topbar-left">
        <h1>Smart Change Request Portal</h1>
      </div>
      <div className="topbar-right">
        <ThemeToggle />
        <NotificationBell />
        <button className="btn btn-secondary" type="button" onClick={() => navigate('/profile')}>Profile</button>
        <button className="btn btn-secondary" type="button" onClick={logout}>Logout</button>
      </div>
    </header>
  );
}
