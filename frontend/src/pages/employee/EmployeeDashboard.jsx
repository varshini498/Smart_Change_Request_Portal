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
  const [isProcessing, setIsProcessing] = useState(null); // Track which ID is being withdrawn

  const [formData, setFormData] = useState({ 
    title: '', description: '', priority: 'Normal', dueDate: '', 
    category: 'UI Change', attachment: '' 
  });

  const name = user?.name || localStorage.getItem('name') || "Employee";
  const email = localStorage.getItem('email') || "Not Registered";
  const role = localStorage.getItem('role') || "Employee";
  const rollNo = localStorage.getItem('roll_no') || "Not Registered";

  const fetchMyRequests = async () => {
    try {
      const res = await API.get('/requests/my');
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error("Fetch error:", err);
    }
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

  // FIXED WITHDRAW LOGIC
  const handleWithdraw = async (id) => {
    if (window.confirm("Are you sure you want to withdraw this request?")) {
      setIsProcessing(id); // Disable button to prevent double-click
      try {
        const res = await API.delete(`/requests/${id}`);
        
        // Check for 200 status specifically
        if (res.status === 200 || res.status === 204) {
          alert("Request withdrawn successfully.");
          fetchMyRequests(); // Refresh the list
        }
      } catch (err) {
        // Display the SPECIFIC server message if available
        const errorMessage = err.response?.data?.message || "Cannot withdraw. This request may have been processed already.";
        alert(errorMessage);
        fetchMyRequests(); // Force refresh to sync UI status
      } finally {
        setIsProcessing(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/requests/create', { ...formData, roll_no: rollNo });
      setShowForm(false);
      setFormData({ title: '', description: '', priority: 'Normal', dueDate: '', category: 'UI Change', attachment: '' });
      fetchMyRequests(); 
    } catch (err) {
      alert("Failed to create request");
    }
  };

  return (
    <div style={styles.layout}>
      <div style={styles.sidebar}>
        <div style={styles.logoBox}>SmartCR Portal</div>
        <nav style={{ flex: 1 }}>
          <div style={styles.navActive}>📝 My Requests</div>
          <div style={styles.navItem} onClick={() => setShowForm(true)}>➕ New Request</div>
        </nav>
      </div>

      <div style={styles.main}>
        <div style={styles.topHeader}>
          <div style={styles.headerTitle}>Employee Dashboard</div>
          <div style={styles.avatarCircle} onClick={() => setShowProfile(!showProfile)}>
            {name[0].toUpperCase()}
          </div>
        </div>

        <header style={{ marginBottom: '20px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ margin: 0 }}>Welcome, {name} 👋</h1>
            <p style={{ color: '#64748b' }}>Track your change requests and view manager feedback.</p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <label style={styles.filterLabel}>Search My Requests</label>
            <input 
              type="text" 
              placeholder="Search by title..." 
              style={styles.searchInput} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <div style={styles.statsRibbon}>
          <div style={styles.statBox}>Total: <strong>{totalCount}</strong></div>
          <div style={{...styles.statBox, borderLeft: '1px solid #e2e8f0', paddingLeft: '15px'}}>
            Pending: <strong style={{color: '#f59e0b'}}>{pendingCount}</strong>
          </div>
          <div style={{...styles.statBox, borderLeft: '1px solid #e2e8f0', paddingLeft: '15px'}}>
            Approved: <strong style={{color: '#22c55e'}}>{approvedCount}</strong>
          </div>
          <div style={{...styles.statBox, borderLeft: '1px solid #e2e8f0', paddingLeft: '15px'}}>
            Success Rate: <strong style={{color: '#3b82f6'}}>{successRate}%</strong>
          </div>
        </div>

        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>TITLE</th>
                <th style={styles.th}>CATEGORY</th>
                <th style={styles.th}>STATUS</th>
                <th style={styles.th}>DUE DATE</th>
                <th style={styles.th}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{padding: '40px', textAlign: 'center', color: '#94a3b8'}}>
                    {searchTerm ? "No matching requests found." : "No requests submitted yet."}
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} style={styles.tr}>
                    <td style={styles.td}><strong>{req.title}</strong></td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.categoryTag,
                        background: req.category === 'Personal' ? '#f3e8ff' : req.category === 'Others' ? '#f1f5f9' : '#e2e8f0',
                        color: req.category === 'Personal' ? '#7e22ce' : req.category === 'Others' ? '#64748b' : '#475569',
                      }}>
                        {req.category || 'General'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                        background: req.status === 'Approved' ? '#dcfce7' : req.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                        color: req.status === 'Approved' ? '#166534' : req.status === 'Rejected' ? '#991b1b' : '#92400e'
                      }}>
                        {req.status}
                      </span>
                    </td>
                    <td style={styles.td}>{req.dueDate || 'N/A'}</td>
                    <td style={styles.td}>
                      <button onClick={() => setSelected(req)} style={styles.viewBtn}>View</button>
                      {req.status === 'Pending' && (
                        <button 
                          onClick={() => handleWithdraw(req.id)} 
                          style={styles.withdrawBtn}
                          disabled={isProcessing === req.id}
                        >
                          {isProcessing === req.id ? "..." : "Withdraw"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.bottomActionArea}>
           <button onClick={exportToCSV} style={styles.exportBtn}>
             📥 Export My Request History to CSV
           </button>
        </div>
      </div>

      {/* --- MODALS & PROFILE DRAWER (KEEP EXISTING CODE) --- */}
      {showProfile && (
        <div style={styles.profileDrawerOverlay} onClick={() => setShowProfile(false)}>
          <div style={styles.profileDrawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.drawerHeader}><h3>My Profile</h3><button onClick={() => setShowProfile(false)} style={styles.closeBtnX}>✕</button></div>
            <div style={styles.drawerBody}>
              <div style={styles.largeAvatar}>{name[0].toUpperCase()}</div>
              <h2 style={{ textAlign: 'center', marginBottom: '5px' }}>{name}</h2>
              <div style={styles.infoRow}><strong>Name:</strong> <span>{name}</span></div>
              <div style={styles.infoRow}><strong>Email:</strong> <span>{email}</span></div>
              <div style={styles.infoRow}><strong>Roll No:</strong> <span>{rollNo}</span></div>
              <button onClick={() => { localStorage.clear(); window.location.href='/'; }} style={styles.logoutBtnFull}>Logout</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{marginTop: 0}}>Request Details</h3>
            <div style={styles.timelineContainer}>
              <div style={styles.timelineStep}><div style={styles.circleActive}>1</div><p>Submitted</p></div>
              <div style={{...styles.line, background: selected.status !== 'Pending' ? '#3b82f6' : '#e2e8f0'}} />
              <div style={styles.timelineStep}><div style={selected.status !== 'Pending' ? styles.circleActive : styles.circleInactive}>2</div><p>Processed</p></div>
            </div>
            <div style={styles.infoBox}>
              <p><strong>Category:</strong> {selected.category}</p>
              <p><strong>Description:</strong> {selected.description}</p>
              {selected.attachment && <p><strong>Attachment:</strong> <a href={selected.attachment} target="_blank" rel="noreferrer" style={{color: '#3b82f6'}}>View Document</a></p>}
              <p><strong>Status:</strong> {selected.status}</p>
            </div>
            <div style={styles.historyBox}>
              <p><strong>Manager Feedback:</strong></p>
              <p style={{ fontStyle: 'italic', color: '#475569' }}>{selected.comment || "Waiting for review..."}</p>
            </div>
            <button onClick={() => setSelected(null)} style={styles.closeBtn}>Close</button>
          </div>
        </div>
      )}

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={{ marginTop: 0 }}>New Request</h2>
            <form onSubmit={handleSubmit}>
              <label style={styles.label}>Title</label>
              <input style={styles.input} type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              <label style={styles.label}>Category</label>
              <select style={styles.input} value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                <option value="UI Change">UI Change</option>
                <option value="Backend Update">Backend Update</option>
                <option value="Security Patch">Security Patch</option>
                <option value="Database Migration">Database Migration</option>
                <option value="Personal">Personal</option>
                <option value="Others">Others</option>
              </select>
              <label style={styles.label}>Description</label>
              <textarea style={{...styles.input, height: '80px'}} required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              <label style={styles.label}>Attachment Link</label>
              <input style={styles.input} type="text" value={formData.attachment} onChange={(e) => setFormData({...formData, attachment: e.target.value})} />
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Priority</label>
                  <select style={styles.input} value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}>
                    <option>Low</option><option>Normal</option><option>High</option><option>Urgent</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Due Date</label>
                  <input style={styles.input} type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={styles.submitBtn}>Submit</button>
                <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Cancel</button>
              </div>
            </form>
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
  navActive: { padding: '12px', background: '#1e293b', borderRadius: '10px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '10px' },
  navItem: { padding: '12px', color: '#94a3b8', marginBottom: '10px', cursor: 'pointer' },
  main: { marginLeft: '260px', flex: 1, padding: '30px 50px' },
  topHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' },
  headerTitle: { fontSize: '18px', fontWeight: 'bold' },
  avatarCircle: { width: '45px', height: '45px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer' },
  tableCard: { background: 'white', borderRadius: '25px', boxShadow: '0 10px 15px rgba(0,0,0,0.05)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { textAlign: 'left', color: '#64748b', fontSize: '12px', background: '#f8fafc' },
  th: { padding: '20px' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '20px', fontSize: '14px' },
  viewBtn: { background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  withdrawBtn: { marginLeft: '8px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  bottomActionArea: { display: 'flex', justifyContent: 'center', padding: '40px 0', marginTop: '20px' },
  exportBtn: { background: '#0f172a', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' },
  statsRibbon: { display: 'flex', gap: '20px', marginBottom: '25px', background: 'white', padding: '15px 25px', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9', alignItems: 'center' },
  statBox: { fontSize: '14px', color: '#64748b' },
  filterLabel: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '5px' },
  searchInput: { padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', width: '220px', outline: 'none' },
  categoryTag: { fontSize: '11px', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', display: 'inline-block' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '40px', borderRadius: '30px', width: '450px' },
  infoBox: { background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '15px', fontSize: '14px' },
  historyBox: { borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' },
  label: { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#475569' },
  input: { width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  submitBtn: { flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  cancelBtn: { flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  closeBtn: { width: '100%', marginTop: '15px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' },
  closeBtnX: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' },
  profileDrawerOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' },
  profileDrawer: { width: '350px', background: 'white', height: '100vh', padding: '40px', boxSizing: 'border-box' },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '30px' },
  largeAvatar: { width: '80px', height: '80px', borderRadius: '50%', background: '#3b82f6', color: 'white', fontSize: '30px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f8fafc', fontSize: '14px' },
  logoutBtnFull: { width: '100%', marginTop: '40px', background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  timelineContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px 0' },
  timelineStep: { textAlign: 'center', fontSize: '11px' },
  circleActive: { width: '25px', height: '25px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px', fontWeight: 'bold' },
  circleInactive: { width: '25px', height: '25px', borderRadius: '50%', background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px' },
  line: { flex: 1, height: '2px', margin: '0 10px', marginBottom: '20px' },
};