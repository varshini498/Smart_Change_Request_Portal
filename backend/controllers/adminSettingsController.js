const { query } = require('../config/db');
const respond = require('../utils/respond');
const systemConfigService = require('../services/systemConfigService');

exports.getSettings = async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM settings');
    const valuesByKey = new Map(result.rows.map((row) => [row.key, String(row.value ?? '')]));
    const rows = Object.values(systemConfigService.SETTING_DEFINITIONS).map((definition) => ({
      ...definition,
      value: valuesByKey.get(definition.key) ?? definition.defaultValue,
    }));
    return respond(res, true, rows);
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.upsertSetting = async (req, res) => {
  try {
    const { key, value } = req.body || {};
    if (!key) return respond(res, false, 'key is required', 400);
    const validation = systemConfigService.validateSetting(String(key), value);
    if (!validation.ok) return respond(res, false, validation.message, 400);

    await query(
      `INSERT INTO settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [String(key), validation.value]
    );
    await systemConfigService.refreshCache();

    const definition = systemConfigService.SETTING_DEFINITIONS[String(key)];
    return respond(res, true, {
      ...(definition || { key }),
      key,
      value: validation.value,
    });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    if (!key) return respond(res, false, 'key is required', 400);
    if (systemConfigService.SETTING_DEFINITIONS[String(key)]) {
      return respond(res, false, 'Core system settings cannot be deleted', 400);
    }
    const result = await query('DELETE FROM settings WHERE key = $1', [String(key)]);
    if (!result.rowCount) return respond(res, false, 'Setting not found', 404);
    await systemConfigService.refreshCache();
    return respond(res, true, { key });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};
