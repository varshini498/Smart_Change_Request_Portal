const departments = ['General', 'IT', 'Finance', 'HR', 'Operations', 'Security', 'Engineering', 'AIML'];

export default function ProfileInfo({
  profile,
  form,
  setForm,
  editMode,
  setEditMode,
  imageUrl,
  onFileChange,
  onSave,
  onCancel,
  onRemovePhoto,
  saving,
}) {
  return (
    <section className="card section-card" style={{ marginTop: 0 }}>
      <div className="section-header">
        <h3 className="section-title">Profile Info</h3>
        {!editMode ? (
          <button className="btn btn-secondary" type="button" onClick={() => setEditMode(true)}>
            Edit
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary" type="button" onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        <div className="row">
          <div style={{ maxWidth: 220 }}>
            <label className="hint" style={{ display: 'block', marginBottom: 6 }}>Profile Photo</label>
            <div
              className="avatar-btn"
              style={{
                width: 120,
                height: 120,
                borderRadius: 16,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
              }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (profile.name || 'U')[0].toUpperCase()
              )}
            </div>

            {editMode && (
              <>
                <input
                  className="input"
                  style={{ marginTop: 10 }}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={onFileChange}
                />
                {profile.profile_photo && (
                  <button className="btn btn-danger" type="button" style={{ marginTop: 8 }} onClick={onRemovePhoto}>
                    Remove Photo
                  </button>
                )}
              </>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div className="field">
              <label>Full Name *</label>
              <input className="input" value={form.name} disabled={!editMode} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" value={profile.email || ''} disabled />
            </div>
            <div className="row">
              <div className="field">
                <label>Phone Number</label>
                <input className="input" value={form.phone} disabled={!editMode} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+911234567890" />
              </div>
              <div className="field">
                <label>Department</label>
                <select className="select" value={form.department} disabled={!editMode} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label>Role</label>
                <input className="input" value={profile.role || ''} disabled />
              </div>
              <div className="field">
                <label>Role Number / ID</label>
                <input className="input" value={profile.roll_no || ''} disabled />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
