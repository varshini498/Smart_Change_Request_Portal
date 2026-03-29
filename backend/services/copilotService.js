const db = require('../config/db');
const { normalizeRole } = require('../utils/roles');

const getLastRequest = (userId) => {
  return db.prepare(
    `SELECT
       id,
       title,
       description,
       status,
       priority,
       category,
       current_level,
       COALESCE(created_at, dateCreated) AS created_at,
       completed_at
     FROM requests
     WHERE COALESCE(created_by, createdBy) = ?
     ORDER BY datetime(COALESCE(created_at, dateCreated)) DESC
     LIMIT 1`
  ).get(userId);
};

const getUserRequests = (userId) => {
  return db.prepare(
    `SELECT
       id,
       COALESCE(request_number, id) AS request_number,
       title,
       description,
       status,
       comment,
       priority,
       category,
       current_level,
       COALESCE(created_at, dateCreated) AS created_at,
       COALESCE(due_date, dueDate) AS due_date,
       completed_at
     FROM requests
     WHERE COALESCE(created_by, createdBy) = ?
     ORDER BY datetime(COALESCE(created_at, dateCreated)) DESC, id DESC`
  ).all(userId);
};

const getRequestByTitle = (title, userId) => {
  const value = String(title || '').trim();
  if (!value) return null;

  return db.prepare(
    `SELECT
       id,
       COALESCE(request_number, id) AS request_number,
       title,
       description,
       status,
       comment,
       priority,
       category,
       current_level,
       COALESCE(created_at, dateCreated) AS created_at,
       COALESCE(due_date, dueDate) AS due_date,
       completed_at
     FROM requests
     WHERE COALESCE(created_by, createdBy) = ?
       AND LOWER(COALESCE(title, '')) LIKE ?
     ORDER BY datetime(COALESCE(created_at, dateCreated)) DESC, id DESC
     LIMIT 1`
  ).get(userId, `%${value.toLowerCase()}%`) || null;
};

const getLastRejectedRequest = (userId) => {
  return db.prepare(
    `SELECT
       id,
       COALESCE(request_number, id) AS request_number,
       title,
       status,
       comment,
       priority,
       category,
       COALESCE(created_at, dateCreated) AS created_at
     FROM requests
     WHERE COALESCE(created_by, createdBy) = ?
       AND UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'REJECTED'
     ORDER BY datetime(COALESCE(created_at, dateCreated)) DESC, id DESC
     LIMIT 1`
  ).get(userId) || null;
};

const getPendingRequests = (userId) => {
  return db.prepare(
    `SELECT
       id,
       COALESCE(request_number, id) AS request_number,
       title,
       status,
       priority,
       category,
       COALESCE(created_at, dateCreated) AS created_at
     FROM requests
     WHERE COALESCE(created_by, createdBy) = ?
       AND UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
     ORDER BY datetime(COALESCE(created_at, dateCreated)) DESC, id DESC`
  ).all(userId);
};

const getCopilotData = ({ userId, role }) => {
  const roleKey = normalizeRole(role);
  const pendingCount = db.prepare("SELECT COUNT(*) AS count FROM requests WHERE status = 'Pending'").get().count;

  const myPending = roleKey === 'EMPLOYEE'
    ? db.prepare("SELECT COUNT(*) AS count FROM requests WHERE COALESCE(created_by, createdBy) = ? AND UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'").get(userId).count
    : null;

  const overdueCount = db.prepare(
    `SELECT COUNT(*) AS count
     FROM requests
     WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
       AND COALESCE(due_date, dueDate) IS NOT NULL
       AND datetime(COALESCE(due_date, dueDate)) < datetime('now')`
  ).get().count;

  const topBlockers = db.prepare(
    `SELECT comment, COUNT(*) AS count
     FROM requests
     WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'REJECTED'
       AND comment IS NOT NULL
       AND TRIM(comment) != ''
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

module.exports = {
  getCopilotData,
  getLastRequest,
  getUserRequests,
  getRequestByTitle,
  getLastRejectedRequest,
  getPendingRequests,
};
