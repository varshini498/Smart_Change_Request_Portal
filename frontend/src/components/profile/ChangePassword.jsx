export default function ChangePassword({
  form,
  setForm,
  onSubmit,
  processing,
  error,
}) {
  return (
    <section className="card section-card" style={{ marginTop: 0 }}>
      <div className="section-header">
        <h3 className="section-title">Change Password</h3>
        <button className="btn btn-primary" type="button" onClick={onSubmit} disabled={processing}>
          {processing ? 'Updating...' : 'Update Password'}
        </button>
      </div>
      <div style={{ padding: 16 }}>
        <div className="field">
          <label>Current Password *</label>
          <input
            type="password"
            className="input"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
        </div>
        <div className="field">
          <label>New Password *</label>
          <input
            type="password"
            className="input"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Confirm New Password *</label>
          <input
            type="password"
            className="input"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
        </div>
        <p className="hint" style={{ marginTop: 8 }}>Password policy: minimum 8 chars, include at least 1 number and 1 special character.</p>
        {error && <p className="hint" style={{ color: 'var(--danger-text)' }}>{error}</p>}
      </div>
    </section>
  );
}
