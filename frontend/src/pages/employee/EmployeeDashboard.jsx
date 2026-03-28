import { useEffect, useMemo, useState } from 'react';
import API from '../../api/axios';
import AppShell from '../../components/AppShell';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import DeadlineBadge from '../../components/DeadlineBadge';
import ToastMessage from '../../components/ToastMessage';
import RequestTimeline from '../../components/RequestTimeline';
import ApprovalFlowTimeline from '../../components/ApprovalFlowTimeline';
import EmptyState from '../../components/EmptyState';
import { Inbox } from 'lucide-react';

const initialForm = {
  title: '',
  description: '',
  changeType: 'Application',
  priority: 'Medium',
  riskLevel: 'Moderate',
  implementationDate: '',
  attachment: '',
};

const normalizeStatus = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '_');

export default function EmployeeDashboard() {
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [categoryOptions, setCategoryOptions] = useState(['Infrastructure', 'Application', 'Database', 'Security', 'Process', 'Other']);
  const [versionRows, setVersionRows] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const fetchMyRequests = async () => {
    try {
      const res = await API.get('/requests/my');
      setRequests(res.data.requests || []);
    } catch (_err) {
      setToast({ message: 'Failed to load requests', type: 'error' });
    }
  };

  useEffect(() => {
    fetchMyRequests();
    const fetchCategories = async () => {
      try {
        const res = await API.get('/requests/categories');
        const rows = res.data?.data || [];
        if (rows.length) setCategoryOptions(rows.map((row) => row.name));
      } catch (_err) {
        // Keep fallback categories.
      }
    };
    fetchCategories();
  }, []);

  const filteredRequests = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return requests.filter((req) => {
      const title = (req.title || '').toLowerCase();
      const category = (req.category || '').toLowerCase();
      return title.includes(search) || category.includes(search);
    });
  }, [requests, searchTerm]);

  const draftRequests = filteredRequests.filter((r) => normalizeStatus(r.status) === 'DRAFT');
  const pendingRequests = filteredRequests.filter((r) => ['PENDING', 'ESCALATED'].includes(normalizeStatus(r.status)));
  const completedRequests = filteredRequests.filter((r) => !['DRAFT', 'PENDING', 'ESCALATED'].includes(normalizeStatus(r.status)));

  const canWithdraw = (req) => normalizeStatus(req.status) === 'PENDING' && Number(req.current_level) === 1;
  const canEditBeforeApproval = (req) => normalizeStatus(req.status) === 'PENDING' && Number(req.current_level) === 1;

  const stats = {
    total: requests.length,
    draft: requests.filter((r) => normalizeStatus(r.status) === 'DRAFT').length,
    pending: requests.filter((r) => ['PENDING', 'ESCALATED'].includes(normalizeStatus(r.status))).length,
    completed: requests.filter((r) => !['DRAFT', 'PENDING', 'ESCALATED'].includes(normalizeStatus(r.status))).length,
    dueToday: requests.filter((r) => r.deadline_status === 'DUE_TODAY').length,
    overdue: requests.filter((r) => r.deadline_status === 'OVERDUE').length,
  };

  const isOverdue = (req) =>
    ['PENDING', 'ESCALATED'].includes(normalizeStatus(req.status)) &&
    req.dueDate &&
    new Date(req.dueDate) < new Date();

  const resetFormState = () => {
    setFormData(initialForm);
    setEditingRequestId(null);
    setShowForm(false);
  };

  const openNewForm = () => {
    setEditingRequestId(null);
    setFormData(initialForm);
    setShowForm(true);
  };

  const openEditForm = (req) => {
    setEditingRequestId(req.id);
    setFormData({
      title: req.title || '',
      description: req.description || '',
      changeType: req.category || 'Application',
      priority: req.priority || 'Medium',
      riskLevel: req.riskLevel || 'Moderate',
      implementationDate: req.due_date || req.dueDate || '',
      attachment: req.attachment || '',
    });
    setShowForm(true);
  };

  const handleWithdraw = async (id) => {
    if (!window.confirm('Withdraw this request?')) return;
    try {
      await API.put(`/requests/${id}/withdraw`);
      setToast({ message: 'Request withdrawn', type: 'success' });
      fetchMyRequests();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Cannot withdraw request', type: 'error' });
    }
  };

  const handleSubmitDraft = async (id) => {
    try {
      await API.put(`/requests/${id}/submit`);
      setToast({ message: 'Draft submitted for approval', type: 'success' });
      fetchMyRequests();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to submit draft', type: 'error' });
    }
  };

  const handleDeleteDraft = async (id) => {
    if (!window.confirm('Delete this draft?')) return;
    try {
      await API.delete(`/requests/${id}/draft`);
      setToast({ message: 'Draft deleted', type: 'success' });
      fetchMyRequests();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to delete draft', type: 'error' });
    }
  };

  const loadVersions = async (requestId) => {
    try {
      setVersionsLoading(true);
      const res = await API.get(`/requests/${requestId}/versions`);
      setVersionRows(res.data?.data || []);
      setShowVersions(true);
    } catch (_err) {
      setToast({ message: 'Failed to load version history', type: 'error' });
    } finally {
      setVersionsLoading(false);
    }
  };

  const validateSubmit = () => {
    const title = formData.title.trim();
    const description = formData.description.trim();

    if (title.length < 5 || title.length > 120) {
      setToast({ message: 'Title must be 5-120 characters', type: 'error' });
      return false;
    }
    if (description.length < 20 || description.length > 2000) {
      setToast({ message: 'Description must be 20-2000 characters', type: 'error' });
      return false;
    }
    if (!formData.implementationDate) {
      setToast({ message: 'Implementation date is required', type: 'error' });
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.implementationDate);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setToast({ message: 'Implementation date cannot be in the past', type: 'error' });
      return false;
    }
    return true;
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        category: formData.changeType,
        dueDate: formData.implementationDate || null,
        attachment: formData.attachment || null,
        riskLevel: formData.riskLevel,
      };

      if (editingRequestId) {
        await API.put(`/requests/${editingRequestId}/draft`, payload);
      } else {
        await API.post('/requests/draft', payload);
      }

      resetFormState();
      setToast({ message: 'Draft saved', type: 'success' });
      fetchMyRequests();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to save draft', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateSubmit()) return;

    try {
      setSaving(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        category: formData.changeType,
        dueDate: formData.implementationDate,
        attachment: formData.attachment,
        riskLevel: formData.riskLevel,
      };

      if (editingRequestId) {
        await API.put(`/requests/${editingRequestId}/draft`, payload);
        await API.put(`/requests/${editingRequestId}/submit`);
      } else {
        await API.post('/requests/create', payload);
      }

      resetFormState();
      setToast({ message: 'Request submitted', type: 'success' });
      fetchMyRequests();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to submit request', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const exportToCSV = () => {
    if (requests.length === 0) {
      setToast({ message: 'No data to export', type: 'error' });
      return;
    }
    const headers = 'ID,Title,Type,Priority,Status,Due Date,Created Date\n';
    const rows = requests
      .map(
        (req) =>
          `${req.id},"${req.title}","${req.category || ''}",${req.priority || ''},${req.status},${req.dueDate || req.due_date || ''},${req.dateCreated || req.created_at || ''}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_requests.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderTable = (title, rows, sectionType) => (
    <section className="card section-card">
      <div className="section-header">
        <h3 className="section-title">{title}</h3>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Deadline</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <EmptyState
                    title="No requests found"
                    description="This section will populate as you create drafts, submit requests, or complete approvals."
                    icon={Inbox}
                  />
                </td>
              </tr>
            ) : (
              rows.map((req) => (
                <tr key={req.id} className={isOverdue(req) ? 'overdue' : ''}>
                  <td>{req.title}</td>
                  <td>{req.category || '-'}</td>
                  <td>{req.priority || '-'}</td>
                  <td>{isOverdue(req) ? <StatusBadge status={req.status} overdue /> : <StatusBadge status={req.status} />}</td>
                  <td>{req.due_date || req.dueDate || '-'}</td>
                  <td><DeadlineBadge status={req.deadline_status} /></td>
                  <td>
                    <div className="actions-row">
                      <button className="btn btn-secondary" type="button" onClick={() => setSelected(req)}>View</button>
                      <button className="btn btn-secondary" type="button" onClick={() => loadVersions(req.id)}>Versions</button>
                    {sectionType === 'draft' && (
                      <>
                        <button className="btn btn-primary" type="button" onClick={() => openEditForm(req)}>Edit</button>
                        <button className="btn btn-primary" type="button" onClick={() => handleSubmitDraft(req.id)}>Submit</button>
                        <button className="btn btn-danger" type="button" onClick={() => handleDeleteDraft(req.id)}>Delete</button>
                      </>
                    )}
                    {sectionType === 'pending' && canEditBeforeApproval(req) && (
                      <button className="btn btn-primary" type="button" onClick={() => openEditForm(req)}>Edit</button>
                    )}
                    {sectionType === 'pending' && canWithdraw(req) && (
                      <button className="btn btn-danger" type="button" onClick={() => handleWithdraw(req.id)}>Withdraw</button>
                    )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <>
      <AppShell
        title="Employee Dashboard"
        subtitle="Submit and track your change requests"
        navItems={[
          { key: 'dashboard', label: 'My Requests', active: true },
          { key: 'new', label: 'New Request', onClick: openNewForm },
        ]}
      >
        <div className="grid-3">
          <StatCard label="Total Requests" value={stats.total} />
          <StatCard label="Drafts" value={stats.draft} />
          <StatCard label="Pending" value={stats.pending} />
          <StatCard label="Completed" value={stats.completed} />
          <StatCard label="Due Today" value={stats.dueToday} />
          <StatCard label="Overdue" value={stats.overdue} />
        </div>

        <section className="card section-card">
          <div className="section-header">
            <h3 className="section-title">Search & Export</h3>
            <button className="btn btn-secondary" type="button" onClick={exportToCSV}>Export CSV</button>
          </div>
          <div className="controls-row">
            <input
              className="input"
              placeholder="Search by title or type"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: 320 }}
            />
          </div>
        </section>

        {renderTable('Draft Requests', draftRequests, 'draft')}
        {renderTable('Pending Requests', pendingRequests, 'pending')}
        {renderTable('Completed Requests', completedRequests, 'completed')}
      </AppShell>

      {showForm && (
        <div className="modal-backdrop" onClick={resetFormState}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingRequestId ? 'Edit Request' : 'New Change Request'}</h2>
            <form>
              <div className="field">
                <label>Request Title</label>
                <input className="input" maxLength={120} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>

              <div className="field">
                <label>Description</label>
                <textarea className="textarea" rows={4} maxLength={2000} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="row">
                <div className="field">
                  <label>Type of Change</label>
                  <select className="select" value={formData.changeType} onChange={(e) => setFormData({ ...formData, changeType: e.target.value })}>
                    {categoryOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select className="select" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="field">
                  <label>Risk Level</label>
                  <select className="select" value={formData.riskLevel} onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="field">
                  <label>Implementation Date</label>
                  <input className="input" type="date" value={formData.implementationDate} onChange={(e) => setFormData({ ...formData, implementationDate: e.target.value })} />
                </div>
              </div>

              <div className="field">
                <label>Attachment</label>
                <input
                  className="input"
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return setFormData({ ...formData, attachment: '' });
                    if (file.size > 10 * 1024 * 1024) {
                      e.target.value = '';
                      setToast({ message: 'Attachment must be <= 10MB', type: 'error' });
                      return;
                    }
                    setFormData({ ...formData, attachment: file.name });
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-secondary" type="button" onClick={resetFormState}>Cancel</button>
                <button className="btn btn-secondary" type="button" onClick={handleSaveDraft} disabled={saving}>{saving ? 'Saving...' : 'Save Draft'}</button>
                <button className="btn btn-primary" type="button" onClick={handleSubmit} disabled={saving}>{saving ? 'Submitting...' : 'Submit Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <h3>Request Details</h3>
            <p><strong>Title:</strong> {selected.title}</p>
            <p><strong>Type:</strong> {selected.category || '-'}</p>
            <p><strong>Description:</strong> {selected.description}</p>
            <p><strong>Status:</strong> {selected.status}</p>
            <p><strong>Manager Comment:</strong> {selected.comment || 'Pending review'}</p>
            <button className="btn btn-secondary" type="button" onClick={() => loadVersions(selected.id)} disabled={versionsLoading}>
              {versionsLoading ? 'Loading...' : 'View Version History'}
            </button>
            <ApprovalFlowTimeline requestId={selected.id} />
            <RequestTimeline requestId={selected.id} />
            <button className="btn btn-secondary" type="button" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      {showVersions && (
        <div className="modal-backdrop" onClick={() => setShowVersions(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <h3>Version History</h3>
            {versionRows.length === 0 ? (
              <p style={{ color: '#64748b' }}>No previous versions found.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Title</th>
                      <th>Description</th>
                      <th>Updated By</th>
                      <th>Updated At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versionRows.map((row) => (
                      <tr key={row.id}>
                        <td>v{row.version}</td>
                        <td>{row.title || '-'}</td>
                        <td>{row.description || '-'}</td>
                        <td>{row.updated_by_name || '-'}</td>
                        <td>{row.updated_at || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button className="btn btn-secondary" type="button" onClick={() => setShowVersions(false)}>Close</button>
          </div>
        </div>
      )}

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
