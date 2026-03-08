import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import { adminService } from '../../services/adminService';
import ToastMessage from '../../components/ToastMessage';

export default function AdminCategories() {
  const [rows, setRows] = useState([]);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const load = async () => {
    try {
      const res = await adminService.getCategories();
      setRows(res.data?.data || []);
    } catch (err) {
      setToast({ message: 'Failed to load categories', type: 'error' });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!newName.trim()) {
      setToast({ message: 'Category name is required', type: 'error' });
      return;
    }
    try {
      await adminService.createCategory({ name: newName.trim() });
      setNewName('');
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Create failed', type: 'error' });
    }
  };

  const update = async () => {
    if (!editing?.name?.trim()) return;
    try {
      await adminService.updateCategory(editing.id, { name: editing.name.trim() });
      setEditing(null);
      load();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Update failed', type: 'error' });
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await adminService.deleteCategory(id);
      load();
    } catch (err) {
      setToast({ message: 'Delete failed', type: 'error' });
    }
  };

  return (
    <>
      <AdminLayout title="Categories" activeKey="categories">
        <section className="card section-card">
          <div className="section-header">
            <h3 className="section-title">Category Management</h3>
          </div>
          <div className="controls-row">
            <input className="input" placeholder="New category" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button className="btn btn-primary" type="button" onClick={create}>Add</button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center' }}>No categories</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>
                      {editing?.id === row.id ? (
                        <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                      ) : row.name}
                    </td>
                    <td>{row.created_at || '-'}</td>
                    <td>
                      {editing?.id === row.id ? (
                        <>
                          <button className="btn btn-primary" type="button" onClick={update}>Save</button>
                          <button className="btn btn-secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-secondary" type="button" onClick={() => setEditing(row)}>Edit</button>
                          <button className="btn btn-danger" type="button" onClick={() => remove(row.id)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </AdminLayout>
      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
