const { query } = require('../config/db');

const SETTING_DEFINITIONS = {
  default_priority: {
    key: 'default_priority',
    label: 'Default Priority',
    description: 'Used when an employee submits a request without selecting a priority.',
    inputType: 'select',
    options: ['Low', 'Medium', 'High', 'Critical'],
    defaultValue: 'Medium',
  },
  max_requests_per_day: {
    key: 'max_requests_per_day',
    label: 'Max Requests Per Day',
    description: 'Limits how many requests an employee can submit in one day.',
    inputType: 'number',
    min: 1,
    max: 100,
    defaultValue: '5',
  },
  enable_notifications: {
    key: 'enable_notifications',
    label: 'Enable Notifications',
    description: 'Turns in-app workflow notifications on or off for the whole system.',
    inputType: 'boolean',
    defaultValue: 'true',
  },
  sla_days: {
    key: 'sla_days',
    label: 'SLA Days',
    description: 'Default number of days used to calculate a due date when one is not provided.',
    inputType: 'number',
    min: 1,
    max: 365,
    defaultValue: '3',
  },
};

const settingsCache = new Map(
  Object.values(SETTING_DEFINITIONS).map((setting) => [setting.key, setting.defaultValue])
);

const normalizeBoolean = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const refreshCache = async () => {
  const result = await query('SELECT key, value FROM settings');
  Object.values(SETTING_DEFINITIONS).forEach((setting) => {
    settingsCache.set(setting.key, setting.defaultValue);
  });
  result.rows.forEach((row) => {
    if (SETTING_DEFINITIONS[row.key]) {
      settingsCache.set(row.key, String(row.value ?? ''));
    }
  });
  return settingsCache;
};

const ensureDefaults = async () => {
  for (const setting of Object.values(SETTING_DEFINITIONS)) {
    await query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [setting.key, setting.defaultValue]
    );
  }
  await refreshCache();
};

const getRawValue = (key) => {
  const cached = settingsCache.get(key);
  if (cached !== undefined && cached !== null && String(cached).trim() !== '') {
    return String(cached);
  }
  return SETTING_DEFINITIONS[key]?.defaultValue ?? '';
};

const getString = (key) => getRawValue(key);

const getNumber = (key) => {
  const raw = Number(getRawValue(key));
  const fallback = Number(SETTING_DEFINITIONS[key]?.defaultValue ?? 0);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

const isEnabled = (key) => normalizeBoolean(getRawValue(key));

const getSettingsForPanel = () =>
  Object.values(SETTING_DEFINITIONS).map((definition) => ({
    ...definition,
    value: getRawValue(definition.key),
  }));

const validateSetting = (key, value) => {
  const definition = SETTING_DEFINITIONS[key];
  if (!definition) {
    return { ok: false, message: 'Unsupported setting key' };
  }

  if (definition.inputType === 'select') {
    const finalValue = String(value ?? '').trim();
    if (!definition.options.includes(finalValue)) {
      return { ok: false, message: `Value must be one of: ${definition.options.join(', ')}` };
    }
    return { ok: true, value: finalValue };
  }

  if (definition.inputType === 'boolean') {
    return { ok: true, value: normalizeBoolean(value) ? 'true' : 'false' };
  }

  if (definition.inputType === 'number') {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      return { ok: false, message: 'Value must be a whole number' };
    }
    if (definition.min !== undefined && parsed < definition.min) {
      return { ok: false, message: `Value must be at least ${definition.min}` };
    }
    if (definition.max !== undefined && parsed > definition.max) {
      return { ok: false, message: `Value must be at most ${definition.max}` };
    }
    return { ok: true, value: String(parsed) };
  }

  return { ok: true, value: String(value ?? '') };
};

ensureDefaults().catch((error) => {
  console.error('System configuration cache bootstrap failed:', error.message);
});

module.exports = {
  SETTING_DEFINITIONS,
  ensureDefaults,
  refreshCache,
  getString,
  getNumber,
  isEnabled,
  getSettingsForPanel,
  validateSetting,
};
