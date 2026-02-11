import { useNavigate, Link } from 'react-router-dom';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const name = localStorage.getItem('name') || "Manager";
  const role = localStorage.getItem('role') || "Manager";

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>SmartCR Portal</div>
        
        <div style={styles.nav}>
          <Link to="/manager/dashboard" style={styles.navLink}>📊 Dashboard</Link>
          <Link to="/manager/pending" style={styles.navLink}>⏳ Pending Requests</Link>
          <Link to="/manager/all" style={styles.navLink}>📁 All Requests</Link>
        </div>

        <div style={styles.profileBox}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#60a5fa' }}>{name}</p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>{role.toUpperCase()}</p>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.main}>
        <div style={styles.header}>
          <h2 style={{margin: 0}}>Hi, {name} 👋</h2>
          <p style={{margin: 0, color: '#64748b'}}>Welcome to your Command Center</p>
        </div>
        {children}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
  sidebar: { width: '260px', background: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh' },
  logo: { padding: '30px', fontSize: '22px', fontWeight: 'bold', borderBottom: '1px solid #334155', textAlign: 'center', color: '#3b82f6' },
  nav: { flex: 1, padding: '20px' },
  navLink: { display: 'block', color: 'white', textDecoration: 'none', padding: '12px', borderRadius: '8px', marginBottom: '8px', background: '#334155' },
  profileBox: { padding: '20px', background: '#0f172a', borderTop: '1px solid #334155' },
  logoutBtn: { marginTop: '10px', background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
  main: { marginLeft: '260px', flex: 1, padding: '40px' },
  header: { marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }
};