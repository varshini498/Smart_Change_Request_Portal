import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import { adminService } from '../../services/adminService';
import ToastMessage from '../../components/ToastMessage';

export default function AdminSettings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [newSetting, setNewSetting] = useState({ key: '', value: '' });
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await adminService.getSettings();
      setRows(res.data.data || []);
    } catch (err) {
      setToast({ message: 'Failed to load settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (key, value) => {
    try {
      await adminService.upsertSetting({ key, value });
      setEditing(null);
      loadSettings();
    } catch (err) {
      setToast({ message: 'Update failed', type: 'error' });
    }
  };

  const handleDelete = async (key) => {
    if (!window.confirm('Delete this setting?')) return;
    try {
      await adminService.deleteSetting(key);
      loadSettings();
    } catch (err) {
      setToast({ message: 'Delete failed', type: 'error' });
    }
  };

  const handleCreate = async () => {
    if (!newSetting.key.trim()) {
      setToast({ message: 'Key is required', type: 'error' });
      return;
    }
    try {
      await adminService.upsertSetting({ key: newSetting.key.trim(), value: newSetting.value });
      setNewSetting({ key: '', value: '' });
      loadSettings();
    } catch (err) {
      setToast({ message: 'Create failed', type: 'error' });
    }
  };

  return (
    <>
      <AdminLayout title="Settings" activeKey="settings">
        <section className="card section-card">
          <div className="section-header">
            <h3 className="section-title">System Settings</h3>
          </div>

          <div className="settings-create">
            <input
              className="input"
              placeholder="Key"
              value={newSetting.key}
              onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
            />
            <input
              className="input"
              placeholder="Value"
              value={newSetting.value}
              onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
            />
            <button className="btn btn-primary" type="button" onClick={handleCreate}>Add</button>
          </div>

          {loading ? (
            <div>Loading settings...</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan="3" style={{ textAlign: 'center', color: '#64748b' }}>No settings</td></tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.key}</td>
                        <td>
                          {editing?.key === row.key ? (
                            <input
                              className="input"
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            />
                          ) : (
                            row.value
                          )}
                        </td>
                        <td>
                          {editing?.key === row.key ? (
                            <>
                              <button className="btn btn-primary" type="button" onClick={() => handleSave(editing.key, editing.value)}>
                                Save
                              </button>
                              <button className="btn btn-secondary" type="button" onClick={() => setEditing(null)}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-secondary" type="button" onClick={() => setEditing({ key: row.key, value: row.value })}>
                                Edit
                              </button>
                              <button className="btn btn-danger" type="button" onClick={() => handleDelete(row.key)}>
                                Delete
                              </button>
                            </>
                          )}
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

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
