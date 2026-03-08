export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  TEAM_LEAD: 'TEAM_LEAD',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
};

export const normalizeRole = (role) => String(role || '').trim().toUpperCase().replace(/\s+/g, '_');
