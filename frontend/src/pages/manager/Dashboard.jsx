import React, { useEffect, useState, useContext } from 'react';
import API from '../../api/axios';
import { AuthContext } from '../../auth/AuthContext';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showProfile, setShowProfile] = useState(false); 
  const [view, setView] = useState('Pending'); 
  const [comment, setComment] = useState("");

  const name = user?.name || localStorage.getItem('name') || "asha";
  const email = localStorage.getItem('email') || "Not Found";
  const rollNo = localStorage.getItem('roll_no') || "Not Found";
  const role = localStorage.getItem('role') || "Manager";

  const loadData = async () => {
    try {
      const statsRes = await API.get('/requests/dashboard/counts');
      setStats(statsRes.data.counts || { pending: 0, approved: 0, rejected: 0 });
      const endpoint = view === 'Pending' ? '/requests/pending' : '/requests/all';
      const reqRes = await API.get(endpoint);
      const data = view === 'Pending' ? reqRes.data.requests : reqRes.data.requests.filter(r => r.status === view);
      setRequests(data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadData(); }, [view]);

  const handleAction = async (id, action) => {
    try {
      await API.put(`/requests/${id}/${action}`, { comment });
      setSelected(null);
      setComment("");
      loadData();
    } catch (err) { alert("Action failed"); }
  };

  return (
    <div style={styles.layout}>
      <div style={styles.sidebar}>
        <div style={styles.logoBox}>SmartCR Portal</div>
        <nav style={{ flex: 1 }}>
          <div style={view === 'Pending' ? styles.navActive : styles.navItem} onClick={() => setView('Pending')}>⏳ Pending Queue</div>
          <div style={view === 'Approved' ? styles.navActive : styles.navItem} onClick={() => setView('Approved')}>✅ Approved History</div>
          <div style={view === 'Rejected' ? styles.navActive : styles.navItem} onClick={() => setView('Rejected')}>❌ Rejected Archive</div>
        </nav>
      </div>

      <div style={styles.main}>
        <div style={styles.topHeader}>
          <div style={styles.headerTitle}>Manager Dashboard</div>
          <div style={styles.avatarCircle} onClick={() => setShowProfile(!showProfile)}>
            {name[0].toUpperCase()}
          </div>
        </div>

        <header style={{ marginBottom: '30px', marginTop: '20px' }}>
          <h1 style={{ margin: 0 }}>Hi, {name} 👋</h1>
          <p style={{ color: '#64748b' }}>Viewing <b>{view}</b> requests.</p>
        </header>

        <div style={styles.statsGrid}>
          <div style={{ ...styles.card, borderLeft: '6px solid orange', background: '#fff7ed' }}><p style={styles.cardLabel}>Pending</p><h2 style={styles.cardVal}>{stats.pending}</h2></div>
          <div style={{ ...styles.card, borderLeft: '6px solid #22c55e', background: '#f0fdf4' }}><p style={styles.cardLabel}>Approved</p><h2 style={styles.cardVal}>{stats.approved}</h2></div>
          <div style={{ ...styles.card, borderLeft: '6px solid #ef4444', background: '#fef2f2' }}><p style={styles.cardLabel}>Rejected</p><h2 style={styles.cardVal}>{stats.rejected}</h2></div>
        </div>

        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr><th style={styles.th}>SENDER ID</th><th style={styles.th}>TITLE</th><th style={styles.th}>{view === 'Pending' ? 'DUE DATE' : 'PROCESSED ON'}</th><th style={styles.th}>ACTION</th></tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} style={styles.tr}>
                  <td style={styles.td}><strong>{req.createdBy}</strong></td>
                  <td style={styles.td}>{req.title}</td>
                  <td style={styles.td}>{view === 'Pending' ? req.dueDate : new Date(req.actionDate).toLocaleDateString()}</td>
                  <td style={styles.td}><button onClick={() => setSelected(req)} style={styles.processBtn}>{view === 'Pending' ? 'Review' : 'View Info'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PROFILE DRAWER --- */}
      {showProfile && (
        <div style={styles.profileDrawerOverlay} onClick={() => setShowProfile(false)}>
          <div style={styles.profileDrawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}><h3>Manager Profile</h3><button onClick={() => setShowProfile(false)} style={styles.closeBtnX}>✕</button></div>
            <div style={styles.drawerBody}>
              <div style={styles.largeAvatar}>{name[0].toUpperCase()}</div>
              <h2 style={{ textAlign: 'center', marginBottom: '5px' }}>{name}</h2>
              <div style={styles.infoRow}><strong>Name:</strong> <span>{name}</span></div>
              <div style={styles.infoRow}><strong>Email:</strong> <span>{email}</span></div>
              <div style={styles.infoRow}><strong>Roll No:</strong> <span>{rollNo}</span></div>
              <div style={styles.infoRow}><strong>Profile:</strong> <span>{role}</span></div>
              <button onClick={() => { localStorage.clear(); window.location.href='/'; }} style={styles.logoutBtnFull}>Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL --- */}
      {selected && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{marginTop: 0}}>Request Details</h3>
            <div style={styles.infoBox}>
              <p><strong>Request ID:</strong> {selected.id}</p>
              <p><strong>Employee ID:</strong> {selected.createdBy}</p>
              <p><strong>Title:</strong> {selected.title}</p>
              <p><strong>Description:</strong> {selected.description}</p>
              <p><strong>Created On:</strong> {new Date(selected.dateCreated).toLocaleDateString()}</p>
            </div>
            {view === 'Pending' ? (
               <>
                <textarea placeholder="Comment..." style={styles.textarea} value={comment} onChange={(e) => setComment(e.target.value)} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button onClick={() => handleAction(selected.id, 'approve')} style={styles.approveBtn}>APPROVE</button>
                  <button onClick={() => handleAction(selected.id, 'reject')} style={styles.rejectBtn}>REJECT</button>
                  <button onClick={() => setSelected(null)} style={styles.closeBtn}>Cancel</button>
                </div>
               </>
            ) : (
              <div style={styles.historyBox}>
                <p><strong>Manager Comment:</strong> {selected.comment || "No comment."}</p>
                <button onClick={() => setSelected(null)} style={styles.closeBtn}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' },
  sidebar: { width: '260px', background: '#0f172a', color: 'white', padding: '30px', position: 'fixed', height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  logoBox: { fontSize: '24px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '50px' },
  navActive: { padding: '12px', background: '#1e293b', borderRadius: '10px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '10px', cursor: 'pointer' },
  navItem: { padding: '12px', color: '#94a3b8', marginBottom: '10px', cursor: 'pointer' },
  main: { marginLeft: '260px', flex: 1, padding: '30px 50px' },
  topHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' },
  headerTitle: { fontSize: '18px', fontWeight: 'bold' },
  avatarCircle: { width: '45px', height: '45px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer' },
  statsGrid: { display: 'flex', gap: '20px', marginBottom: '40px' },
  card: { flex: 1, padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  cardLabel: { margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#64748b' },
  cardVal: { margin: '10px 0 0', fontSize: '32px', fontWeight: '800' },
  tableCard: { background: 'white', borderRadius: '25px', boxShadow: '0 10px 15px rgba(0,0,0,0.05)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { textAlign: 'left', color: '#64748b', fontSize: '12px' },
  th: { padding: '20px' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '20px', fontSize: '14px' },
  processBtn: { background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  profileDrawerOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' },
  profileDrawer: { width: '350px', background: 'white', height: '100vh', padding: '40px', boxSizing: 'border-box' },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '30px' },
  largeAvatar: { width: '80px', height: '80px', borderRadius: '50%', background: '#3b82f6', color: 'white', fontSize: '30px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f8fafc', fontSize: '14px' },
  logoutBtnFull: { width: '100%', marginTop: '40px', background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '40px', borderRadius: '30px', width: '450px' },
  infoBox: { background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '15px', fontSize: '14px' },
  historyBox: { borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' },
  textarea: { width: '100%', height: '80px', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  approveBtn: { flex: 1, background: '#22c55e', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  rejectBtn: { flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' },
  closeBtnX: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }
};