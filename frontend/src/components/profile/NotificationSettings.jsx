const rows = [
  ['Email Notifications', 'emailEnabled'],
  ['Request Approved', 'notifyApproved'],
  ['Request Rejected', 'notifyRejected'],
  ['Comments Added', 'notifyComments'],
  ['Overdue Alerts', 'notifyOverdue'],
];

export default function NotificationSettings({
  preferences,
  setPreferences,
  onSave,
  processing,
}) {
  return (
    <section className="card section-card" style={{ marginTop: 0 }}>
      <div className="section-header">
        <h3 className="section-title">Notification Preferences</h3>
        <button className="btn btn-primary" type="button" onClick={onSave} disabled={processing}>
          {processing ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
      <div className="profile-card-body">
        {rows.map(([label, key]) => (
          <label
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <span>{label}</span>
            <input
              type="checkbox"
              checked={!!preferences[key]}
              onChange={(e) => setPreferences({ ...preferences, [key]: e.target.checked })}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
