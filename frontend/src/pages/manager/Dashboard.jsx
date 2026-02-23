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
  
  const [filterCategory, setFilterCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState(""); 

  const name = user?.name || localStorage.getItem('name') || "Manager";
  const email = user?.email || localStorage.getItem('email') || "Not Registered";
  const rollNo = user?.roll_no || localStorage.getItem('roll_no') || "Not Found";
  const role = user?.role || localStorage.getItem('role') || "Manager";

  const loadData = async () => {
    try {
      const statsRes = await API.get('/requests/dashboard/counts');
      setStats(statsRes.data.counts || { pending: 0, approved: 0, rejected: 0 });
      const endpoint = view === 'Pending' ? '/requests/pending' : '/requests/all';
      const reqRes = await API.get(endpoint);
      
      let data = view === 'Pending' ? reqRes.data.requests : reqRes.data.requests.filter(r => r.status === view);
      
      if (filterCategory !== "All") {
        data = data.filter(r => r.category === filterCategory);
      }
      
      setRequests(data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadData(); }, [view, filterCategory]);

  const exportToCSV = () => {
    if (requests.length === 0) return alert("No data to export");
    const headers = "ID,Sender ID,Title,Category,Status,Due Date,Date Created\n";
    const rows = requests.map(req => 
      `${req.id},${req.createdBy},"${req.title}","${req.category || 'General'}",${req.status},${req.dueDate},${req.dateCreated}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartCR_${view}_Report.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredRequests = requests.filter(req => 
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    req.createdBy.toString().includes(searchTerm)
  );

  const getRowStyle = (dueDate, status) => {
    if (status !== 'Pending') return styles.tr;
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { ...styles.tr, borderLeft: '6px solid #ef4444', background: '#fff1f2' }; 
    if (diffDays <= 2) return { ...styles.tr, borderLeft: '6px solid #f59e0b', background: '#fffbeb' }; 
    return styles.tr;
  };

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
        <div style={styles.logoBox}>Smart Change Request Portal</div>
        <nav style={{ flex: 1 }}>
          <div style={view === 'Pending' ? styles.navActive : styles.navItem} onClick={() => setView('Pending')}>⏳ Pending Queue</div>
          <div style={view === 'Approved' ? styles.navActive : styles.navItem} onClick={() => setView('Approved')}>✅ Approved History</div>
          <div style={view === 'Rejected' ? styles.navActive : styles.navItem} onClick={() => setView('Rejected')}>❌ Rejected Archive</div>
        </nav>
        <div style={styles.sidebarFooter}>V 1.2.0 • Management Portal</div>
      </div>

      <div style={styles.main}>
        <div style={styles.topHeader}>
          <div>
            <h1 style={styles.welcomeText}>Review Center</h1>
            <p style={styles.subtext}>Managing <b>{view}</b> governance requests.</p>
          </div>
          <div style={styles.avatarCircle} onClick={() => setShowProfile(!showProfile)}>
            {name[0].toUpperCase()}
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={{ ...styles.card, borderTop: '4px solid orange', background: '#fff7ed' }}><p style={styles.cardLabel}>Awaiting Review</p><h2 style={styles.cardVal}>{stats.pending}</h2></div>
          <div style={{ ...styles.card, borderTop: '4px solid #22c55e', background: '#f0fdf4' }}><p style={styles.cardLabel}>Approved Total</p><h2 style={styles.cardVal}>{stats.approved}</h2></div>
          <div style={{ ...styles.card, borderTop: '4px solid #ef4444', background: '#fef2f2' }}><p style={styles.cardLabel}>Rejected Archive</p><h2 style={styles.cardVal}>{stats.rejected}</h2></div>
        </div>

        <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', width: '100%' }}>
            <div style={{ textAlign: 'left', flex: 2 }}>
               <label style={styles.filterLabel}>Search Requests</label>
               <input type="text" placeholder="Search title or ID..." style={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div style={{ textAlign: 'right', flex: 1 }}>
              <label style={styles.filterLabel}>Filter Category</label>
              <select style={styles.filterDropdown} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="All">All Categories</option>
                <option value="UI Change">UI Change</option>
                <option value="Backend Update">Backend Update</option>
                <option value="Security Patch">Security Patch</option>
                <option value="Database Migration">Database Migration</option>
                <option value="Personal">Personal</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>
        </header>

        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>SENDER ID</th>
                <th style={styles.th}>TITLE</th>
                <th style={styles.th}>CATEGORY</th>
                <th style={styles.th}>{view === 'Pending' ? 'DUE DATE' : 'PROCESSED ON'}</th>
                <th style={styles.th}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map(req => (
                  <tr key={req.id} style={getRowStyle(req.dueDate, req.status)}>
                    <td style={styles.td}><strong>{req.createdBy}</strong></td>
                    <td style={styles.td}>{req.title} {view === 'Pending' && new Date(req.dueDate) < new Date() && <span style={styles.overdueBadge}>OVERDUE</span>}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.categoryTag, background: req.category === 'Personal' ? '#f3e8ff' : '#e2e8f0', color: req.category === 'Personal' ? '#7e22ce' : '#475569' }}>
                        {req.category || 'General'}
                      </span>
                    </td>
                    <td style={styles.td}>{view === 'Pending' ? req.dueDate : new Date(req.actionDate).toLocaleDateString()}</td>
                    <td style={styles.td}><button onClick={() => setSelected(req)} style={styles.processBtn}>{view === 'Pending' ? 'Review' : 'View Info'}</button></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No results found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.bottomActionArea}><button onClick={exportToCSV} style={styles.exportBtn}>📥 Export {view} History to CSV</button></div>
      </div>

      {/* --- UPDATED PROFILE DRAWER --- */}
      {showProfile && (
        <div style={styles.profileDrawerOverlay} onClick={() => setShowProfile(false)}>
          <div style={styles.profileDrawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}><h3 style={{fontSize: '20px'}}>Manager Profile</h3><button onClick={() => setShowProfile(false)} style={styles.closeBtnX}>✕</button></div>
            <div style={styles.drawerBody}>
              <div style={styles.largeAvatar}>{name[0].toUpperCase()}</div>
              <h2 style={{ textAlign: 'center', fontSize: '24px', margin: '10px 0' }}>{name}</h2>
              <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '30px', fontWeight: 'bold' }}>{role}</p>
              <div style={styles.infoRow}><strong>Full Name</strong> <span>{name}</span></div>
              <div style={styles.infoRow}><strong>Email Address</strong> <span>{email}</span></div>
              <div style={styles.infoRow}><strong>Manager ID</strong> <span>{rollNo}</span></div>
              <div style={styles.infoRow}><strong>Department</strong> <span>AIML</span></div>
              <button onClick={() => { localStorage.clear(); window.location.href='/'; }} style={styles.logoutBtnFull}>Secure Logout</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{marginTop: 0, fontSize: '22px'}}>Review Request</h3>
            <div style={styles.timelineContainer}>
              <div style={styles.timelineStep}><div style={styles.circleActive}>1</div><p style={{fontSize: '11px', fontWeight: 'bold'}}>Submitted</p></div>
              <div style={{...styles.line, background: selected.status !== 'Pending' ? '#3b82f6' : '#e2e8f0'}} />
              <div style={styles.timelineStep}><div style={selected.status !== 'Pending' ? styles.circleActive : styles.circleInactive}>2</div><p style={{fontSize: '11px', fontWeight: 'bold'}}>Decision</p></div>
            </div>
            <div style={styles.infoBox}>
              <p><strong>Employee ID:</strong> {selected.createdBy}</p>
              <p><strong>Impact Area:</strong> {selected.category || 'General'}</p>
              <p><strong>Description:</strong> {selected.description}</p>
              {selected.attachment && <p><strong>Attachment:</strong> <a href={selected.attachment} target="_blank" rel="noreferrer" style={{color: '#3b82f6', textDecoration: 'underline'}}>View File</a></p>}
            </div>
            {view === 'Pending' ? (
               <>
                <textarea placeholder="Provide technical feedback or reasoning..." style={styles.textarea} value={comment} onChange={(e) => setComment(e.target.value)} />
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button onClick={() => handleAction(selected.id, 'approve')} style={styles.approveBtn}>APPROVE</button>
                  <button onClick={() => handleAction(selected.id, 'reject')} style={styles.rejectBtn}>REJECT</button>
                  <button onClick={() => setSelected(null)} style={styles.closeBtn}>Cancel</button>
                </div>
               </>
            ) : (
              <div style={styles.historyBox}>
                <p><strong>Manager Decision Log:</strong></p>
                <p style={{ fontStyle: 'italic', color: '#475569', background: '#f1f5f9', padding: '15px', borderRadius: '10px' }}>{selected.comment || "No comment provided."}</p>
                <button onClick={() => setSelected(null)} style={styles.closeBtn}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ... styles remain same as previously established

const styles = {
  // 1. DYNAMIC CYBER BACKGROUND (Futuristic Radial Gradient with Texture)
  layout: { 
    display: 'flex', 
    minHeight: '100vh', 
    background: 'radial-gradient(circle at top left, #2d1b33 0%, #0f172a 40%, #020617 100%)',
    fontFamily: '"Inter", sans-serif', 
    fontSize: '16px',
    color: '#f8fafc' 
  },

  // 2. FLOATING SIDEBAR: High-End "Pod" Design (Unique Feature)
  sidebar: { 
    width: '280px', 
    background: 'rgba(15, 23, 42, 0.8)', 
    backdropFilter: 'blur(20px)', // Ultra-heavy blur for "Superb" look
    color: 'white', 
    padding: '40px 20px', 
    position: 'fixed', 
    height: '94vh', // Doesn't touch the bottom for a floating effect
    margin: '3vh 20px', 
    borderRadius: '30px', 
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    display: 'flex', 
    flexDirection: 'column', 
    boxSizing: 'border-box',
    zIndex: 10
  },
  logoBox: { fontSize: '22px', fontWeight: '800', color: '#3b82f6', marginBottom: '60px', lineHeight: '1.2', letterSpacing: '-0.5px' },
  navActive: { 
    padding: '14px', 
    background: 'rgba(59, 130, 246, 0.2)', 
    borderLeft: '4px solid #3b82f6', 
    borderRadius: '12px', 
    color: '#3b82f6', 
    fontWeight: 'bold', 
    marginBottom: '10px' 
  },
  // INTERACTIVE NAV: Slides on Hover
  navItem: { 
    padding: '14px', 
    color: '#94a3b8', 
    marginBottom: '10px', 
    cursor: 'pointer', 
    borderRadius: '12px', 
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    // Logic: In your code, add onMouseEnter to trigger transform: 'translateX(10px)'
  },
  sidebarFooter: { marginTop: 'auto', fontSize: '12px', color: '#475569', textAlign: 'center' },

  // 3. MAIN AREA: Spacious with Carbon Fibre Texture
  main: { 
    marginLeft: '320px', 
    flex: 1, 
    padding: '40px 60px',
    backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")', // Stylish texture
  },
  topHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  welcomeText: { fontSize: '32px', fontWeight: '800', color: '#f8fafc', margin: 0 },
  subtext: { color: '#94a3b8', fontSize: '16px', marginTop: '4px' },
  
  // 4. EMERGING AVATAR: Scalable on Hover
  avatarCircle: { 
    width: '55px', 
    height: '55px', 
    borderRadius: '16px', 
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', 
    color: 'white', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    fontSize: '18px',
    boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)', 
    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // 5. KPI SCORECARDS: Fixed Visibility + Emerging Logic
  statsGrid: { display: 'flex', gap: '25px', marginBottom: '40px' },
  card: { 
    flex: 1, 
    padding: '25px', 
    borderRadius: '24px', 
    background: '#ffffff', // High contrast for numbers
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Smooth pop-out
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  cardLabel: { margin: 0, fontSize: '14px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardVal: { 
    margin: '10px 0 0', 
    fontSize: '36px', 
    fontWeight: '800', 
    color: '#0f172a' // Visible deep slate
  },

  // 6. GLASSMORPHIC TABLE AREA: Cyber Frost + Lift Logic
  tableCard: { 
    background: 'rgba(255, 255, 255, 0.95)', 
    backdropFilter: 'blur(16px) saturate(180%)', 
    borderRadius: '28px', 
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
    border: '1px solid rgba(255, 255, 255, 0.1)',
    overflow: 'hidden' 
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { textAlign: 'left', color: '#0f172a', fontSize: '14px', background: '#f8fafc', fontWeight: '800' },
  th: { padding: '20px 30px' },
  // INTERACTIVE ROW: lifts with transform: 'scale(1.01)'
  tr: { 
    borderBottom: '1px solid #f1f5f9', 
    transition: 'all 0.2s ease', 
    position: 'relative'
  },
  td: { 
    padding: '20px 30px', 
    fontSize: '16px', 
    color: '#0f172a', // Fixed visibility
    fontWeight: '500'
  },
  processBtn: { 
    background: '#0f172a', 
    color: 'white', 
    border: 'none', 
    padding: '10px 18px', 
    borderRadius: '10px', 
    cursor: 'pointer', 
    fontWeight: 'bold', 
    fontSize: '14px',
    boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)',
    transition: 'all 0.3s ease',
    // Hover: scale(1.1)
  },

  // 7. INPUTS & FILTERS (Dark Mode Theme)
  filterLabel: { fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', display: 'block', marginBottom: '5px' },
  filterDropdown: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px', background: '#0f172a', color: 'white', cursor: 'pointer' },
  searchInput: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px', background: '#0f172a', color: 'white', outline: 'none', boxSizing: 'border-box' },

  bottomActionArea: { display: 'flex', justifyContent: 'center', padding: '40px 0', marginTop: '20px' },
  exportBtn: { 
    background: '#0f172a', 
    color: 'white', 
    border: 'none', 
    padding: '16px 32px', 
    borderRadius: '16px', 
    cursor: 'pointer', 
    fontSize: '16px', 
    fontWeight: 'bold', 
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s ease'
  },

  // 8. DECISION MODALS: Professional High Contrast
  overlay: { position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#ffffff', padding: '45px', borderRadius: '32px', width: '550px', border: '1px solid rgba(255,255,255,0.1)', color: '#0f172a', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' },
  infoBox: { background: '#f8fafc', padding: '25px', borderRadius: '20px', marginBottom: '20px', fontSize: '16px', lineHeight: '1.6', color: '#1e293b' },
  textarea: { width: '100%', height: '100px', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: '16px' },
  approveBtn: { flex: 1, background: '#22c55e', color: 'white', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  rejectBtn: { flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  closeBtn: { width: '100%', marginTop: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' },
  closeBtnX: { background: 'none', border: 'none', fontSize: '24px', color: '#94a3b8', cursor: 'pointer' },

  // 9. PROFILE DRAWER: Crystal White Design
  profileDrawerOverlay: { position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' },
  profileDrawer: { width: '400px', background: '#ffffff', color: '#0f172a', height: '100vh', padding: '40px', boxSizing: 'border-box', boxShadow: '-10px 0 30px rgba(0,0,0,0.3)' },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '30px' },
  largeAvatar: { 
    width: '100px', 
    height: '100px', 
    borderRadius: '24px', 
    background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', 
    color: 'white', 
    fontSize: '40px', 
    fontWeight: 'bold', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    margin: '0 auto 20px',
    boxShadow: '0 0 25px rgba(59, 130, 246, 0.4)' 
  },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #f8fafc', fontSize: '16px', color: '#1e293b' },
  logoutBtnFull: { width: '100%', marginTop: '40px', background: '#ef4444', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' },

  // 10. GOVERNANCE & UNIQUE AIML ELEMENTS
  overdueBadge: { background: '#ef4444', color: 'white', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', marginLeft: '12px', fontWeight: 'bold', boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)' },
  categoryTag: { fontSize: '13px', padding: '5px 12px', borderRadius: '8px', fontWeight: 'bold', display: 'inline-block' },
  timelineContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px 0' },
  circleActive: { width: '30px', height: '30px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px', fontWeight: 'bold', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' },
  circleInactive: { width: '30px', height: '30px', borderRadius: '50%', background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px' },
  line: { flex: 1, height: '3px', margin: '0 10px', marginBottom: '20px' },

  // NEW UNIQUE FEATURES
  riskIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '8px',
    boxShadow: '0 0 10px currentcolor', 
  },
  pulse: {
    width: '12px',
    height: '12px',
    background: '#22c55e',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '10px',
    // You'll add keyframes for this in your global CSS
  },
};