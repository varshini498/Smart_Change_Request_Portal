const ROLE_KEYS = {
  EMPLOYEE: 'EMPLOYEE',
  TEAM_LEAD: 'TEAM_LEAD',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
};
const ROLES = ROLE_KEYS;

const DISPLAY_BY_KEY = {
  [ROLE_KEYS.EMPLOYEE]: 'Employee',
  [ROLE_KEYS.TEAM_LEAD]: 'Team Lead',
  [ROLE_KEYS.MANAGER]: 'Manager',
  [ROLE_KEYS.ADMIN]: 'Admin',
};

const normalizeRole = (role) => {
  const raw = String(role || '').trim().toUpperCase();
  if (!raw) return '';
  if (raw === 'TEAM LEAD' || raw === 'TEAMLEAD') return ROLE_KEYS.TEAM_LEAD;
  if (raw === 'EMPLOYEE') return ROLE_KEYS.EMPLOYEE;
  if (raw === 'MANAGER') return ROLE_KEYS.MANAGER;
  if (raw === 'ADMIN') return ROLE_KEYS.ADMIN;
  return raw.replace(/\s+/g, '_');
};

const toDisplayRole = (role) => DISPLAY_BY_KEY[normalizeRole(role)] || String(role || '');

const hasRole = (role, expected) => {
  const normalized = normalizeRole(role);
  const list = Array.isArray(expected) ? expected : [expected];
  return list.map(normalizeRole).includes(normalized);
};

module.exports = {
  ROLES,
  ROLE_KEYS,
  normalizeRole,
  toDisplayRole,
  hasRole,
};
