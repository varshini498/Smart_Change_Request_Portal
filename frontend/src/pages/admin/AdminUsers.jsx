import { useEffect, useMemo, useState } from 'react';
import AdminLayout from './AdminLayout';
import { adminService } from '../../services/adminService';
import ToastMessage from '../../components/ToastMessage';

const ROLE_OPTIONS = ['EMPLOYEE', 'TEAM_LEAD', 'MANAGER', 'ADMIN'];

const decodeTokenId = (token) => {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json?.id;
  } catch {
    return null;
  }
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'EMPLOYEE', password: '', roll_no: '', department: '' });
  const [resetPassword, setResetPassword] = useState('');

  const adminId = useMemo(() => decodeTokenId(localStorage.getItem('token') || ''), []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers();
      setUsers(res.data.data || []);
    } catch (err) {
      setToast({ message: 'Failed to load users', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (id, role) => {
    try {
      await adminService.updateUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (err) {
      setToast({ message: 'Role update failed', type: 'error' });
    }
  };

  const handleStatusToggle = async (id, is_active) => {
    try {
      await adminService.updateUserStatus(id, is_active);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active } : u)));
    } catch (err) {
      setToast({ message: 'Status update failed', type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (id === adminId) {
      setToast({ message: 'You cannot delete yourself', type: 'error' });
      return;
    }
    if (!window.confirm('Delete this user?')) return;
    try {
      await adminService.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setToast({ message: 'Delete failed', type: 'error' });
    }
  };

  const handleCreate = async () => {
    try {
      await adminService.createUser(form);
      setShowCreate(false);
      setForm({ name: '', email: '', role: 'EMPLOYEE', password: '', roll_no: '', department: '' });
      loadUsers();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Create user failed', type: 'error' });
    }
  };

  const handleReset = async () => {
    if (!showReset) return;
    try {
      await adminService.resetUserPassword(showReset.id, resetPassword);
      setShowReset(null);
      setResetPassword('');
    } catch (err) {
      setToast({ message: 'Password reset failed', type: 'error' });
    }
  };

  return (
    <>
      <AdminLayout title="Users" activeKey="users">
        <div className="section-header">
          <h3 className="section-title">User Management</h3>
          <button className="btn btn-primary" type="button" onClick={() => setShowCreate(true)}>
            Create User
          </button>
        </div>

        <section className="card section-card">
          {loading ? (
            <div>Loading users...</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: '#64748b' }}>No users found</td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <select
                            className="select"
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={Boolean(u.is_active)}
                              onChange={(e) => handleStatusToggle(u.id, e.target.checked ? 1 : 0)}
                            />
                            <span className="slider" />
                          </label>
                        </td>
                        <td>
                          <button className="btn btn-secondary" type="button" onClick={() => setShowReset(u)}>
                            Reset Password
                          </button>
                          <button className="btn btn-danger" type="button" onClick={() => handleDelete(u.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </AdminLayout>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create User</h3>
            <div className="field">
              <label>Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Role</label>
              <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="field">
              <label>Roll No</label>
              <input className="input" value={form.roll_no} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} />
            </div>
            <div className="field">
              <label>Department</label>
              <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" type="button" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showReset && (
        <div className="modal-backdrop" onClick={() => setShowReset(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reset Password</h3>
            <p>Reset password for {showReset.name}</p>
            <input
              type="password"
              className="input"
              placeholder="New password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary" type="button" onClick={() => setShowReset(null)}>Cancel</button>
              <button className="btn btn-primary" type="button" onClick={handleReset}>Reset</button>
            </div>
          </div>
        </div>
      )}

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
