const db = require('../config/db');
const respond = require('../utils/respond');
const systemConfigService = require('../services/systemConfigService');

exports.getSettings = (req, res) => {
  try {
    const rows = systemConfigService.getSettingsForPanel();
    return respond(res, true, rows);
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.upsertSetting = (req, res) => {
  try {
    const { key, value } = req.body || {};
    if (!key) return respond(res, false, 'key is required', 400);
    const validation = systemConfigService.validateSetting(String(key), value);
    if (!validation.ok) return respond(res, false, validation.message, 400);

    db.prepare(
      `INSERT INTO settings (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(String(key), validation.value);

    const definition = systemConfigService.getSettingsForPanel().find((row) => row.key === key);
    return respond(res, true, {
      ...(definition || { key }),
      key,
      value: validation.value,
    });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.deleteSetting = (req, res) => {
  try {
    const { key } = req.params;
    if (!key) return respond(res, false, 'key is required', 400);
    if (systemConfigService.SETTING_DEFINITIONS[String(key)]) {
      return respond(res, false, 'Core system settings cannot be deleted', 400);
    }
    const result = db.prepare('DELETE FROM settings WHERE key = ?').run(String(key));
    if (!result.changes) return respond(res, false, 'Setting not found', 404);
    return respond(res, true, { key });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};
