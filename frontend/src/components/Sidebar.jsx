import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Sidebar() {
  const navigate = useNavigate();
  const name = localStorage.getItem('name') || "Manager";
  const role = localStorage.getItem('role') || "User";

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={styles.sidebar}>
      <h2 style={styles.logo}>SmartCR Portal</h2>
      <div style={styles.profile}>
        <div style={styles.avatar}>{name[0]}</div>
        <p><strong>{name}</strong></p>
        <small>{role.toUpperCase()}</small>
      </div>
      <nav style={styles.nav}>
        <Link to="/manager/dashboard" style={styles.link}>📊 Dashboard</Link>
        <Link to="/manager/dashboard" style={styles.link}>⏳ Pending Requests</Link>
      </nav>
      <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
    </div>
  );
}

const styles = {
  sidebar: { width: '250px', background: '#1e293b', color: 'white', height: '100vh', position: 'fixed', display: 'flex', flexDirection: 'column', padding: '20px' },
  logo: { textAlign: 'center', color: '#3b82f6', marginBottom: '30px', borderBottom: '1px solid #334155', paddingBottom: '10px' },
  profile: { textAlign: 'center', marginBottom: '30px', padding: '15px', background: '#334155', borderRadius: '10px' },
  avatar: { width: '50px', height: '50px', borderRadius: '50%', background: '#3b82f6', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' },
  nav: { flex: 1 },
  link: { display: 'block', color: 'white', textDecoration: 'none', marginBottom: '15px', padding: '10px', borderRadius: '5px', background: '#1e293b' },
  logoutBtn: { background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }
};