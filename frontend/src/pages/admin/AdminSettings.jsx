import { useEffect, useMemo, useState } from 'react';
import AdminLayout from './AdminLayout';
import { adminService } from '../../services/adminService';
import ToastMessage from '../../components/ToastMessage';

const renderControl = ({ row, value, disabled, onChange }) => {
  if (row.inputType === 'boolean') {
    return (
      <label className="switch" aria-label={row.label}>
        <input
          type="checkbox"
          checked={String(value) === 'true'}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked ? 'true' : 'false')}
        />
        <span className="slider" />
      </label>
    );
  }

  if (row.inputType === 'select') {
    return (
      <select className="select settings-value-input" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {row.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      className="input settings-value-input"
      type="number"
      min={row.min}
      max={row.max}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};

export default function AdminSettings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draftValues, setDraftValues] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await adminService.getSettings();
      const nextRows = res.data?.data || [];
      setRows(nextRows);
      setDraftValues(
        nextRows.reduce((acc, row) => {
          acc[row.key] = row.value;
          return acc;
        }, {})
      );
    } catch (_err) {
      setToast({ message: 'Failed to load system configuration', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const editingRow = useMemo(
    () => rows.find((row) => row.key === editingKey) || null,
    [rows, editingKey]
  );

  const handleSave = async (key) => {
    try {
      await adminService.upsertSetting({ key, value: draftValues[key] });
      setEditingKey(null);
      setToast({ message: 'Configuration updated', type: 'success' });
      loadSettings();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Update failed', type: 'error' });
    }
  };

  const handleCancel = () => {
    if (editingRow) {
      setDraftValues((prev) => ({ ...prev, [editingRow.key]: editingRow.value }));
    }
    setEditingKey(null);
  };

  return (
    <>
      <AdminLayout title="System Configuration" activeKey="settings">
        <section className="card section-card settings-panel">
          <div className="section-header">
            <div>
              <h3 className="section-title">System Configuration Panel</h3>
              <p className="section-subtitle">
                Control request defaults, daily submission limits, notification delivery, and SLA-based deadlines from
                one place.
              </p>
            </div>
          </div>

          {loading ? (
            <div>Loading system configuration...</div>
          ) : (
            <div className="settings-grid">
              <div className="settings-grid-header">
                <span>Setting Name</span>
                <span>Value</span>
                <span>Action</span>
              </div>

              {rows.map((row) => {
                const isEditing = editingKey === row.key;
                return (
                  <div key={row.key} className="settings-row">
                    <div className="settings-name">
                      <strong>{row.label}</strong>
                      <p>{row.description}</p>
                      <span className="settings-key">{row.key}</span>
                    </div>

                    <div className="settings-control">
                      {renderControl({
                        row,
                        value: draftValues[row.key] ?? row.value,
                        disabled: !isEditing,
                        onChange: (value) =>
                          setDraftValues((prev) => ({
                            ...prev,
                            [row.key]: value,
                          })),
                      })}
                    </div>

                    <div className="settings-actions">
                      {isEditing ? (
                        <>
                          <button className="btn btn-primary" type="button" onClick={() => handleSave(row.key)}>
                            Save
                          </button>
                          <button className="btn btn-secondary" type="button" onClick={handleCancel}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-secondary" type="button" onClick={() => setEditingKey(row.key)}>
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </AdminLayout>

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
