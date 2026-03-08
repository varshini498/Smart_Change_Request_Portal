const { ROLE_KEYS, normalizeRole } = require('../utils/roles');

const authorizeRole = (requiredRole) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const actual = normalizeRole(req.user.role);
  const required = Array.isArray(requiredRole)
    ? requiredRole.map((role) => normalizeRole(role))
    : normalizeRole(requiredRole);

  console.log('RBAC Required:', required);
  console.log('RBAC Actual:', actual);

  if (Array.isArray(required)) {
    if (!required.includes(actual)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
  } else if (actual !== required) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  return next();
};

const isEmployee = authorizeRole(ROLE_KEYS.EMPLOYEE);
const isTeamLead = authorizeRole(ROLE_KEYS.TEAM_LEAD);
const isManager = authorizeRole(ROLE_KEYS.MANAGER);
const isAdmin = authorizeRole(ROLE_KEYS.ADMIN);

module.exports = {
  authorizeRole,
  isEmployee,
  isTeamLead,
  isManager,
  isAdmin,
};
