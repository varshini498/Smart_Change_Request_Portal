const db = require('../config/db');
const respond = require('../utils/respond');

exports.getSettings = (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings ORDER BY key ASC').all();
    return respond(res, true, rows);
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.upsertSetting = (req, res) => {
  try {
    const { key, value } = req.body || {};
    if (!key) return respond(res, false, 'key is required', 400);

    db.prepare(
      `INSERT INTO settings (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(String(key), String(value ?? ''));

    return respond(res, true, { key, value: String(value ?? '') });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.deleteSetting = (req, res) => {
  try {
    const { key } = req.params;
    if (!key) return respond(res, false, 'key is required', 400);
    const result = db.prepare('DELETE FROM settings WHERE key = ?').run(String(key));
    if (!result.changes) return respond(res, false, 'Setting not found', 404);
    return respond(res, true, { key });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};
