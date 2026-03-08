const db = require('../config/db');
const { normalizeRole } = require('../utils/roles');

const getCopilotData = ({ userId, role }) => {
  const roleKey = normalizeRole(role);
  const pendingCount = db.prepare("SELECT COUNT(*) AS count FROM requests WHERE status = 'Pending'").get().count;

  const myPending = roleKey === 'EMPLOYEE'
    ? db.prepare("SELECT COUNT(*) AS count FROM requests WHERE createdBy = ? AND status = 'Pending'").get(userId).count
    : null;

  const overdueCount = db.prepare(
    `SELECT COUNT(*) AS count
     FROM requests
     WHERE status = 'Pending'
       AND dueDate IS NOT NULL
       AND datetime(dueDate) < datetime('now')`
  ).get().count;

  const topBlockers = db.prepare(
    `SELECT comment, COUNT(*) AS count
     FROM requests
     WHERE status = 'Rejected' AND comment IS NOT NULL AND TRIM(comment) != ''
     GROUP BY comment
     ORDER BY count DESC
     LIMIT 5`
  ).all();

  return {
    summary: { pendingCount, overdueCount, myPending },
    recommendedActions: [
      overdueCount > 0 ? 'Review overdue pending requests first' : 'No overdue requests right now',
      roleKey === 'MANAGER' || roleKey === 'TEAM_LEAD'
        ? 'Process highest-priority pending approvals'
        : 'Update details on pending requests',
    ],
    topBlockers,
  };
};

module.exports = { getCopilotData };
