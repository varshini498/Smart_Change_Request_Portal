import React, { useState, useEffect } from 'react';
import API from '../../api/axios';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  
  // NEW: Interactive State for Sidebar Tabs and Profile
  const [activeTab, setActiveTab] = useState('oversight'); 
  const [showProfile, setShowProfile] = useState(false);
  
  const name = localStorage.getItem('name') || "Admin";
  const email = localStorage.getItem('email') || "admin@smartcr.com";
  const rollNo = localStorage.getItem('roll_no') || "Not Found";

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await API.get('/admin/users'); 
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Restoration failed.");
    }
  };

  // NEW: Handle Delete Functionality
  const handleDeleteUser = async (id) => {
  if (window.confirm("Are you sure you want to remove this user from the infrastructure?")) {
    try {
      // Ensure the ID is being passed correctly to the URL
      await API.delete(`/admin/users/${id}`); 
      alert("User removed successfully");
      fetchUsers(); // This refreshes the '8 Users' count to '7'
    } catch (err) {
      console.error("Delete Error:", err.response);
      alert("Action failed. Check admin permissions.");
    }
  }
};

  return (
    <div style={styles.layout}>
      {/* 1. FLOATING SIDEBAR (CYBER DESIGN) */}
      <div style={styles.sidebar}>
        <div style={styles.logoBox}>Admin Master Control</div>
        <nav style={{ flex: 1 }}>
          {/* UPDATED: Clickable Sidebar Tabs */}
          <div 
            style={activeTab === 'oversight' ? styles.navActive : styles.navItem} 
            onClick={() => setActiveTab('oversight')}
          >
            🛠️ Global Oversight
          </div>
          <div 
            style={activeTab === 'users' ? styles.navActive : styles.navItem} 
            onClick={() => setActiveTab('users')}
          >
            👥 User Management
          </div>
          <div 
            style={activeTab === 'analytics' ? styles.navActive : styles.navItem} 
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </div>
          <div 
            style={activeTab === 'logs' ? styles.navActive : styles.navItem} 
            onClick={() => setActiveTab('logs')}
          >
            📜 Security Logs
          </div>
        </nav>
        <div style={styles.sidebarFooter}>V 1.2.0 • Governance Root</div>
      </div>

      <div style={styles.main}>
        <header style={styles.topHeader}>
          <div>
            <h1 style={styles.welcomeText}>System Infrastructure</h1>
            <p style={styles.subtext}>
              {activeTab === 'oversight' ? "Managing all restored user identities." : "Advanced User Governance Console."}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={styles.healthBadge}>
                <div style={styles.pulse}></div> System Optimal
            </div>
            <div style={styles.avatarCircle} onClick={() => setShowProfile(true)}>
              {name[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* 2. KPI CARDS */}
        <div style={styles.statsGrid}>
          {['users', 'database', 'security'].map((type) => (
            <div 
              key={type}
              onMouseEnter={() => setHoveredCard(type)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                ...styles.card,
                transform: hoveredCard === type ? 'scale(1.05) translateY(-10px)' : 'scale(1)',
                boxShadow: hoveredCard === type ? '0 25px 40px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.1)'
              }}
            >
              <p style={styles.cardLabel}>{type.toUpperCase()}</p>
              <h2 style={styles.cardVal}>
                {type === 'users' ? users.length : type === 'database' ? '12%' : 'Active'}
              </h2>
            </div>
          ))}
        </div>

        {/* 3. USER INFORMATION REGISTRY WITH ACTION COLUMN */}
        <div style={styles.tableCard}>
          <h3 style={{padding: '25px 35px', margin: 0, color: '#0f172a', borderBottom: '1px solid #f1f5f9'}}>
            {activeTab === 'oversight' ? "Global User Registry" : "User Access Management"}
          </h3>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th>ROLL NO</th>
                <th>NAME</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>ACTIONS</th> {/* NEW: Actions Header */}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr 
                  key={u.roll_no} 
                  onMouseEnter={() => setHoveredRow(u.roll_no)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    ...styles.tr,
                    transform: hoveredRow === u.roll_no ? 'scale(1.01)' : 'scale(1)',
                    background: hoveredRow === u.roll_no ? '#ffffff' : 'transparent',
                    zIndex: hoveredRow === u.roll_no ? 1 : 0
                  }}
                >
                  <td style={styles.td}><strong>{u.roll_no}</strong></td>
                  <td style={styles.td}>{u.name}</td>
                  <td style={styles.td}>{u.role}</td>
                  <td style={styles.td}><span style={styles.statusPill}>● ACTIVE</span></td>
                  {/* NEW: Action Column */}
                  <td style={styles.td}>
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      style={styles.deleteBtn}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROFILE DRAWER */}
      {showProfile && (
        <div style={styles.profileDrawerOverlay} onClick={() => setShowProfile(false)}>
          <div style={styles.profileDrawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <h3 style={{color: '#0f172a'}}>Root Administrator</h3>
              <button onClick={() => setShowProfile(false)} style={styles.closeBtnX}>✕</button>
            </div>
            <div style={styles.drawerBody}>
              <div style={styles.largeAvatar}>{name[0].toUpperCase()}</div>
              <h2 style={{ textAlign: 'center', fontSize: '24px', margin: '10px 0', color: '#0f172a' }}>{name}</h2>
              <p style={{ textAlign: 'center', color: '#3b82f6', marginBottom: '30px', fontWeight: 'bold' }}>MASTER ACCESS</p>
              
              <div style={styles.infoRow}><strong>Admin ID</strong> <span style={{color: '#475569'}}>{rollNo}</span></div>
              <div style={styles.infoRow}><strong>Network Email</strong> <span style={{color: '#475569'}}>{email}</span></div>
              <div style={styles.infoRow}><strong>System Status</strong> <span style={{color: '#22c55e'}}>Online</span></div>
              
              <button 
                onClick={() => { localStorage.clear(); window.location.href='/'; }} 
                style={styles.logoutBtnFull}
              >
                Terminate Session (Logout)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', background: 'radial-gradient(circle at top left, #2d1b33 0%, #0f172a 40%, #020617 100%)', fontFamily: '"Inter", sans-serif' },
  sidebar: { width: '280px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', color: 'white', padding: '40px 20px', position: 'fixed', height: '94vh', margin: '3vh 20px', borderRadius: '30px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', zIndex: 10 },
  logoBox: { fontSize: '22px', fontWeight: '800', color: '#3b82f6', marginBottom: '60px' },
  navActive: { padding: '14px', background: 'rgba(59, 130, 246, 0.2)', borderLeft: '4px solid #3b82f6', borderRadius: '12px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '10px', cursor: 'pointer' },
  navItem: { padding: '14px', color: '#94a3b8', marginBottom: '10px', cursor: 'pointer', borderRadius: '12px', transition: 'all 0.3s ease' },
  sidebarFooter: { marginTop: 'auto', fontSize: '12px', color: '#64748b', textAlign: 'center' },
  main: { marginLeft: '320px', flex: 1, padding: '40px 60px', backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' },
  topHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  welcomeText: { fontSize: '32px', fontWeight: '800', color: '#f8fafc', margin: 0 },
  subtext: { color: '#94a3b8', fontSize: '16px' },
  healthBadge: { background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '12px 24px', borderRadius: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', border: '1px solid rgba(34, 197, 94, 0.2)' },
  pulse: { width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', marginRight: '12px', boxShadow: '0 0 10px #22c55e' },
  statsGrid: { display: 'flex', gap: '25px', marginBottom: '40px' },
  card: { flex: 1, padding: '25px', borderRadius: '24px', background: '#ffffff', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', cursor: 'pointer' },
  cardLabel: { margin: 0, fontSize: '14px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  cardVal: { margin: '10px 0 0', fontSize: '36px', fontWeight: '800', color: '#0f172a' },
  tableCard: { background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)', borderRadius: '28px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { textAlign: 'left', color: '#0f172a', fontSize: '14px', background: '#f8fafc', fontWeight: '800' },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'all 0.3s ease' },
  td: { padding: '20px 35px', fontSize: '16px', color: '#0f172a' },
  statusPill: { background: '#dcfce7', color: '#166534', padding: '6px 14px', borderRadius: '100px', fontSize: '11px', fontWeight: '800' },
  
  // NEW: Delete Button Style
  deleteBtn: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
  
  avatarCircle: { width: '55px', height: '55px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)', transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' },
  profileDrawerOverlay: { position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' },
  profileDrawer: { width: '400px', background: '#ffffff', color: '#0f172a', height: '100vh', padding: '40px', boxSizing: 'border-box', borderLeft: '1px solid rgba(255,255,255,0.1)', boxShadow: '-10px 0 30px rgba(0,0,0,0.3)' },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '30px' },
  largeAvatar: { width: '100px', height: '100px', borderRadius: '24px', background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', color: 'white', fontSize: '40px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 25px rgba(59, 130, 246, 0.4)' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #f8fafc', fontSize: '16px', color: '#1e293b' },
  logoutBtnFull: { width: '100%', marginTop: '40px', background: '#ef4444', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s ease' },
  closeBtnX: { background: 'none', border: 'none', fontSize: '24px', color: '#94a3b8', cursor: 'pointer' },
};