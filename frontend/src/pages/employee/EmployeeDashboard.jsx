import React, { useEffect, useState, useContext } from 'react';
import API from '../../api/axios';
import { AuthContext } from '../../auth/AuthContext';

export default function EmployeeDashboard() {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selected, setSelected] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(null);

  const [formData, setFormData] = useState({ 
    title: '', description: '', priority: 'Normal', dueDate: '', 
    category: 'UI Change', attachment: '' 
  });

  const name = user?.name || localStorage.getItem('name') || "Employee";
  const email = user?.email || localStorage.getItem('email') || "Not Registered";
  const rollNo = user?.roll_no || localStorage.getItem('roll_no') || "Not Registered";
  const role = user?.role || localStorage.getItem('role') || "Employee";

  const fetchMyRequests = async () => {
    try {
      const res = await API.get('/requests/my');
      setRequests(res.data.requests || []);
    } catch (err) { console.error("Fetch error:", err); }
  };

  useEffect(() => { fetchMyRequests(); }, []);

  const filteredRequests = requests.filter(req => {
    const search = searchTerm.toLowerCase();
    const title = (req.title ?? "").toLowerCase();
    const category = (req.category ?? "general").toLowerCase();
    return title.includes(search) || category.includes(search);
  });

  const exportToCSV = () => {
    if (requests.length === 0) return alert("No requests to export");
    const headers = "ID,Title,Category,Status,Due Date,Date Created\n";
    const rows = requests.map(req => 
      `${req.id},"${req.title}","${req.category || 'General'}",${req.status},${req.dueDate},${req.dateCreated}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `My_Change_Requests.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const totalCount = requests.length;
  const successRate = totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(0) : 0;

  const handleWithdraw = async (id) => {
    if (window.confirm("Are you sure you want to withdraw this request?")) {
      setIsProcessing(id);
      try {
        const res = await API.delete(`/requests/${id}`);
        if (res.status === 200 || res.status === 204) {
          alert("Request withdrawn successfully.");
          fetchMyRequests();
        }
      } catch (err) {
        alert(err.response?.data?.message || "Cannot withdraw.");
        fetchMyRequests();
      } finally { setIsProcessing(null); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/requests/create', { ...formData, roll_no: rollNo });
      setShowForm(false);
      setFormData({ title: '', description: '', priority: 'Normal', dueDate: '', category: 'UI Change', attachment: '' });
      fetchMyRequests(); 
    } catch (err) { alert("Failed to create request"); }
  };

  return (
    <div style={styles.layout}>
      <div style={styles.sidebar}>
        <div style={styles.logoBox}>Smart Change Request Portal</div>
        <nav style={{ flex: 1 }}>
          <div style={styles.navActive}>📊 Dashboard View</div>
          <div style={styles.navItem} onClick={() => setShowForm(true)}>➕ New Request</div>
          <div style={styles.navItem}>📂 Archived Reports</div>
        </nav>
        <div style={styles.sidebarFooter}>Version 1.2.0 • Corporate</div>
      </div>

      <div style={styles.main}>
        <div style={styles.topHeader}>
          <div>
            <h1 style={styles.welcomeText}>Welcome, {name} 👋</h1>
            <p style={styles.subtext}>Your central hub for system change governance.</p>
          </div>
          <div style={styles.avatarCircle} onClick={() => setShowProfile(!showProfile)}>
            {name[0].toUpperCase()}
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, borderTop: '4px solid #3b82f6' }}><p style={styles.statLabel}>Total Submitted</p><h2 style={styles.statValue}>{totalCount}</h2></div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #f59e0b' }}><p style={styles.statLabel}>Pending Review</p><h2 style={{ ...styles.statValue, color: '#f59e0b' }}>{pendingCount}</h2></div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #22c55e' }}><p style={styles.statLabel}>Approval Rate</p><h2 style={{ ...styles.statValue, color: '#22c55e' }}>{successRate}%</h2></div>
        </div>

        <div style={styles.contentCard}>
          <div style={styles.cardHeader}>
            <h3 style={{ margin: 0 }}>Recent Requests</h3>
            <div style={styles.searchContainer}><input type="text" placeholder="Search by title or category..." style={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          </div>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr><th style={styles.th}>TITLE</th><th style={styles.th}>CATEGORY</th><th style={styles.th}>STATUS</th><th style={styles.th}>DUE DATE</th><th style={styles.th}>ACTIONS</th></tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr><td colSpan="5" style={styles.emptyTd}>No requests match your filters.</td></tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} style={styles.tr}>
                    <td style={styles.td}><strong>{req.title}</strong></td>
                    <td style={styles.td}><span style={styles.categoryBadge}>{req.category || 'General'}</span></td>
                    <td style={styles.td}><span style={{ ...styles.statusPill, background: req.status === 'Approved' ? '#dcfce7' : req.status === 'Rejected' ? '#fee2e2' : '#fef3c7', color: req.status === 'Approved' ? '#166534' : req.status === 'Rejected' ? '#991b1b' : '#92400e' }}>● {req.status}</span></td>
                    <td style={styles.td}>{req.dueDate || 'N/A'}</td>
                    <td style={styles.td}><button onClick={() => setSelected(req)} style={styles.viewBtn}>Manage</button>{req.status === 'Pending' && <button onClick={() => handleWithdraw(req.id)} style={styles.withdrawBtn} disabled={isProcessing === req.id}>{isProcessing === req.id ? "..." : "Withdraw"}</button>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={styles.bottomActionArea}><button onClick={exportToCSV} style={styles.exportBtn}>📥 Export Audit History (CSV)</button></div>
      </div>

      {selected && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ marginTop: 0, marginBottom: '25px' }}>Request Tracking</h3>
            <div style={styles.stepperContainer}>
              <div style={styles.step}><div style={styles.stepCircleActive}>✓</div><p style={styles.stepLabel}>Submitted</p></div>
              <div style={styles.stepLineActive} /><div style={styles.step}><div style={selected.status !== 'Pending' ? styles.stepCircleActive : styles.stepCirclePending}>{selected.status !== 'Pending' ? '✓' : '2'}</div><p style={styles.stepLabel}>Processing</p></div>
              <div style={selected.status !== 'Pending' ? styles.stepLineActive : styles.stepLinePending} /><div style={styles.step}><div style={selected.status !== 'Pending' ? styles.stepCircleActive : styles.stepCirclePending}>{selected.status !== 'Pending' ? '✓' : '3'}</div><p style={styles.stepLabel}>Decision</p></div>
            </div>
            <div style={styles.infoBox}><p><strong>Category:</strong> {selected.category}</p><p><strong>Description:</strong> {selected.description}</p><p><strong>Feedback:</strong> {selected.comment || "Waiting for manager review..."}</p></div>
            <button onClick={() => setSelected(null)} style={styles.closeBtn}>Return to Dashboard</button>
          </div>
        </div>
      )}

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={{ marginTop: 0 }}>Create Governance Request</h2>
            <form onSubmit={handleSubmit}>
              <label style={styles.label}>Title</label><input style={styles.input} type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              <label style={styles.label}>Category</label><select style={styles.input} value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}><option value="UI Change">UI Change</option><option value="Backend Update">Backend Update</option><option value="Security Patch">Security Patch</option><option value="Database Migration">Database Migration</option><option value="Personal">Personal</option><option value="Others">Others</option></select>
              <label style={styles.label}>Description</label><textarea style={{...styles.input, height: '80px'}} required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              <div style={{ display: 'flex', gap: '10px' }}><button type="submit" style={styles.submitBtn}>Submit Request</button><button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Discard</button></div>
            </form>
          </div>
        </div>
      )}

      {/* --- UPDATED PROFILE DRAWER --- */}
      {showProfile && (
        <div style={styles.profileDrawerOverlay} onClick={() => setShowProfile(false)}>
          <div style={styles.profileDrawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}><h3>Employee Profile</h3><button onClick={() => setShowProfile(false)} style={styles.closeBtnX}>✕</button></div>
            <div style={styles.drawerBody}>
              <div style={styles.largeAvatar}>{name[0].toUpperCase()}</div>
              <h2 style={{ textAlign: 'center', fontSize: '24px', margin: '10px 0' }}>{name}</h2>
              <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '30px', fontWeight: 'bold' }}>{role}</p>
              <div style={styles.infoRow}><strong>Full Name</strong> <span>{name}</span></div>
              <div style={styles.infoRow}><strong>Email Address</strong> <span>{email}</span></div>
              <div style={styles.infoRow}><strong>Employee ID</strong> <span>{rollNo}</span></div>
              <div style={styles.infoRow}><strong>Department</strong> <span>AIML</span></div>
              <button onClick={() => { localStorage.clear(); window.location.href='/'; }} style={styles.logoutBtnFull}>Secure Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  // 1. DYNAMIC CYBER BACKGROUND
  layout: { 
    display: 'flex', 
    minHeight: '100vh', 
    background: 'radial-gradient(circle at top left, #2d1b33 0%, #0f172a 40%, #020617 100%)',
    fontFamily: '"Inter", sans-serif', 
    fontSize: '16px',
    color: '#f8fafc' 
  },

  // 2. SIDEBAR
  sidebar: { 
    width: '280px', 
    background: 'rgba(15, 23, 42, 0.8)', 
    backdropFilter: 'blur(20px)', // Ultra-heavy blur
    color: 'white', 
    padding: '40px 20px', 
    position: 'fixed', 
    height: '95vh', // Doesn't touch the bottom
    margin: '2.5vh 20px', // Centers it vertically
    borderRadius: '30px', // Floating pod look
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)' 
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
  navItem: { 
    padding: '14px', color: '#94a3b8', marginBottom: '10px', cursor: 'pointer', 
    borderRadius: '12px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    ':hover': { transform: 'translateX(10px)', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }
  },
  sidebarFooter: { marginTop: 'auto', fontSize: '12px', color: '#475569', textAlign: 'center' },
  
  // 3. MAIN AREA: Text Visibility Fix
  main: { 
    marginLeft: '320px', // Adjusted for floating sidebar
    flex: 1, 
    padding: '40px 60px',
    backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")', // Subtle texture
  },
  welcomeText: { 
    fontSize: '32px', 
    fontWeight: '800', 
    color: '#ffffff', // Changed to White to stand out against dark radial background
    margin: 0 
  },
  subtext: { 
    color: '#94a3b8', // Light gray for readability on dark background
    marginTop: '4px' 
  },
  topHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  
  // 4. EMERGING AVATAR
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
    boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)', 
    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', 
  },

  // 5. KPI CARDS: Contrast Fix for Numbers
  statsGrid: { display: 'flex', gap: '25px', marginBottom: '40px' },
  statCard: { 
    flex: 1, 
    background: '#ffffff', // Solid white background for the card
    padding: '25px', 
    borderRadius: '24px', 
    border: '1px solid rgba(59, 130, 246, 0.2)', 
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  statLabel: { margin: 0, fontSize: '14px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValue: { 
    margin: '10px 0 0', 
    fontSize: '34px', 
    fontWeight: '800', 
    color: '#0f172a' // FIX: Deep Slate blue for visible numbers on white cards
  },

  // 6. GLASSMORPHIC CONTENT AREA: Text Visibility Fix
  contentCard: { 
    background: 'rgba(255, 255, 255, 0.95)', // Increased opacity for better text contrast
    backdropFilter: 'blur(16px) saturate(180%)', 
    borderRadius: '28px', 
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
    border: '1px solid rgba(255, 255, 255, 0.1)', 
    overflow: 'hidden' 
  },
  cardHeader: { padding: '25px 35px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  searchContainer: { position: 'relative' },
  searchInput: { 
    padding: '12px 20px', 
    borderRadius: '14px', 
    border: '1px solid #cbd5e1', 
    background: '#ffffff', 
    color: '#0f172a', // FIX: Dark text for the search bar
    width: '280px', 
    fontSize: '14px', 
    outline: 'none' 
  },
  
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc', textAlign: 'left', color: '#0f172a', fontSize: '13px', fontWeight: '800' },
  th: { padding: '20px 35px' },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.3s ease' },
  td: { 
    padding: '20px 35px', 
    fontSize: '15px', 
    color: '#0f172a', // FIX: Bold dark text for table data
    fontWeight: '500'
  },
  categoryBadge: { 
    background: '#f1f5f9', 
    color: '#1e293b', // FIX: Darker text for badges
    padding: '5px 10px', 
    borderRadius: '8px', 
    fontSize: '12px', 
    fontWeight: '700' 
  },
   statusPill: { 
    padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: '800',
    transition: 'all 0.3s ease',
    ':hover': { filter: 'brightness(1.1)', transform: 'translateY(-2px)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }
  },

  viewBtn: { background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' },
  withdrawBtn: { marginLeft: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' },
  emptyTd: { padding: '40px', textAlign: 'center', color: '#94a3b8' },

  bottomActionArea: { display: 'flex', justifyContent: 'center', padding: '40px 0' },
  exportBtn: { 
    background: '#0f172a', 
    color: 'white', 
    border: 'none', 
    padding: '16px 32px', 
    borderRadius: '16px', 
    cursor: 'pointer', 
    fontWeight: '800', 
    fontSize: '15px', 
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s ease'
  },

  // 7. MODALS: Visibility Fix
  overlay: { position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#ffffff', padding: '50px', borderRadius: '32px', width: '550px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', color: '#0f172a' },
  stepperContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '35px' },
  stepCircleActive: { width: '35px', height: '35px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' },
  stepCirclePending: { width: '35px', height: '35px', borderRadius: '50%', background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: '11px', fontWeight: '700', color: '#475569', marginTop: '8px' },
  stepLineActive: { width: '60px', height: '2px', background: '#3b82f6', margin: '0 10px', marginBottom: '18px' },
  stepLinePending: { width: '60px', height: '2px', background: '#e2e8f0', margin: '0 10px', marginBottom: '18px' },
  infoBox: { background: '#f8fafc', padding: '25px', borderRadius: '20px', textAlign: 'left', marginBottom: '20px', lineHeight: '1.6', color: '#1e293b' },
  closeBtn: { width: '100%', background: '#0f172a', color: 'white', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: '700', cursor: 'pointer' },

  // 8. FORM ELEMENTS
  label: { display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#475569', textAlign: 'left' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '16px', boxSizing: 'border-box' },
  submitBtn: { flex: 1, background: '#3b82f6', color: 'white', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none' },
  cancelBtn: { flex: 1, background: '#f1f5f9', color: '#64748b', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none' },

  // 9. PROFILE DRAWER: Visibility Fix
  profileDrawerOverlay: { position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' },
  profileDrawer: { width: '400px', background: '#ffffff', color: '#0f172a', height: '100vh', padding: '40px', borderLeft: '1px solid rgba(255,255,255,0.1)', boxShadow: '-10px 0 30px rgba(0,0,0,0.3)' },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '30px' },
  largeAvatar: { 
    width: '95px', 
    height: '95px', 
    borderRadius: '24px', 
    background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', 
    color: 'white', 
    fontSize: '36px', 
    fontWeight: 'bold', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    margin: '0 auto 20px',
    boxShadow: '0 0 25px rgba(59, 130, 246, 0.4)' 
  },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #f8fafc', fontSize: '16px', color: '#1e293b' },
  logoutBtnFull: { width: '100%', marginTop: '40px', background: '#ef4444', color: 'white', padding: '14px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' },
  closeBtnX: { background: 'none', border: 'none', fontSize: '24px', color: '#94a3b8', cursor: 'pointer' },
  
  // ... existing layout ...

  // NEW: Floating Glass Sidebar
  

  // NEW: Risk Score Indicator (For the Table)
  riskIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '8px',
    boxShadow: '0 0 10px currentcolor', // Glows in its own color
  },

  // NEW: Animated Pulse for System Health
  pulse: {
    width: '12px',
    height: '12px',
    background: '#22c55e',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '10px',
    animation: 'pulse 2s infinite', // You'll need to add this in your index.css
  },
  card: { 
    flex: 1, padding: '25px', borderRadius: '24px', background: '#ffffff',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Smooth pop-out
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    ':hover': { transform: 'scale(1.05)', boxShadow: '0 20px 30px rgba(0,0,0,0.15)' }
  },

  // 3. GLOWING STATUS PILLS
 
  // 4. FLOATING ACTION BUTTONS
  processBtn: { 
    background: '#0f172a', color: 'white', border: 'none', padding: '10px 18px', 
    borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold',
    transition: 'all 0.3s ease',
    ':hover': { background: '#3b82f6', transform: 'scale(1.1)', boxShadow: '0 5px 15px rgba(59, 130, 246, 0.4)' }
  }

  // NEW: Ultra-Stylish Main Content Background
  

};