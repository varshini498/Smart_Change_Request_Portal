export default function AppearanceSettings({
  theme,
  setTheme,
  fontSize,
  setFontSize,
  onSave,
  processing,
}) {
  return (
    <section className="card section-card" style={{ marginTop: 0 }}>
      <div className="section-header">
        <h3 className="section-title">Appearance</h3>
        <button className="btn btn-primary" type="button" onClick={onSave} disabled={processing}>
          {processing ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
      <div style={{ padding: 16 }} className="row">
        <div className="field">
          <label>Theme</label>
          <select className="select" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="field">
          <label>Font Size</label>
          <select className="select" value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>
    </section>
  );
}
