const { query } = require('../config/db');
const { normalizeRole } = require('../utils/roles');

const getLastRequest = async (userId) => {
  const result = await query(
    `SELECT
       id,
       title,
       description,
       status,
       priority,
       category,
       current_level,
       COALESCE(created_at, "dateCreated") AS created_at,
       completed_at
     FROM requests
     WHERE COALESCE(created_by, "createdBy") = $1
     ORDER BY CAST(COALESCE(created_at, "dateCreated") AS TIMESTAMP) DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0];
};

const getUserRequests = async (userId) => {
  const result = await query(
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
       COALESCE(created_at, "dateCreated") AS created_at,
       COALESCE(due_date, "dueDate") AS due_date,
       completed_at
     FROM requests
     WHERE COALESCE(created_by, "createdBy") = $1
     ORDER BY CAST(COALESCE(created_at, "dateCreated") AS TIMESTAMP) DESC, id DESC`,
    [userId]
  );
  return result.rows;
};

const getRequestByTitle = async (title, userId) => {
  const value = String(title || '').trim();
  if (!value) return null;

  const result = await query(
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
       COALESCE(created_at, "dateCreated") AS created_at,
       COALESCE(due_date, "dueDate") AS due_date,
       completed_at
     FROM requests
     WHERE COALESCE(created_by, "createdBy") = $1
       AND LOWER(COALESCE(title, '')) LIKE $2
     ORDER BY CAST(COALESCE(created_at, "dateCreated") AS TIMESTAMP) DESC, id DESC
     LIMIT 1`,
    [userId, `%${value.toLowerCase()}%`]
  );
  return result.rows[0] || null;
};

const getLastRejectedRequest = async (userId) => {
  const result = await query(
    `SELECT
       id,
       COALESCE(request_number, id) AS request_number,
       title,
       status,
       comment,
       priority,
       category,
       COALESCE(created_at, "dateCreated") AS created_at
     FROM requests
     WHERE COALESCE(created_by, "createdBy") = $1
       AND UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'REJECTED'
     ORDER BY CAST(COALESCE(created_at, "dateCreated") AS TIMESTAMP) DESC, id DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
};

const getPendingRequests = async (userId) => {
  const result = await query(
    `SELECT
       id,
       COALESCE(request_number, id) AS request_number,
       title,
       status,
       priority,
       category,
       COALESCE(created_at, "dateCreated") AS created_at
     FROM requests
     WHERE COALESCE(created_by, "createdBy") = $1
       AND UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
     ORDER BY CAST(COALESCE(created_at, "dateCreated") AS TIMESTAMP) DESC, id DESC`,
    [userId]
  );
  return result.rows;
};

const getCopilotData = async ({ userId, role }) => {
  const roleKey = normalizeRole(role);
  const pendingCountResult = await query("SELECT COUNT(*) AS count FROM requests WHERE status = 'Pending'");
  const pendingCount = Number(pendingCountResult.rows[0]?.count || 0);

  let myPending = null;
  if (roleKey === 'EMPLOYEE') {
    const myPendingResult = await query(
      "SELECT COUNT(*) AS count FROM requests WHERE COALESCE(created_by, \"createdBy\") = $1 AND UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'",
      [userId]
    );
    myPending = Number(myPendingResult.rows[0]?.count || 0);
  }

  const overdueCountResult = await query(
    `SELECT COUNT(*) AS count
     FROM requests
     WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
       AND COALESCE(due_date, "dueDate") IS NOT NULL
       AND CAST(COALESCE(due_date, "dueDate") AS TIMESTAMP) < NOW()`
  );
  const overdueCount = Number(overdueCountResult.rows[0]?.count || 0);

  const topBlockersResult = await query(
    `SELECT comment, COUNT(*) AS count
     FROM requests
     WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'REJECTED'
       AND comment IS NOT NULL
       AND TRIM(comment) != ''
     GROUP BY comment
     ORDER BY count DESC
     LIMIT 5`
  );

  return {
    summary: { pendingCount, overdueCount, myPending },
    recommendedActions: [
      overdueCount > 0 ? 'Review overdue pending requests first' : 'No overdue requests right now',
      roleKey === 'MANAGER' || roleKey === 'TEAM_LEAD'
        ? 'Process highest-priority pending approvals'
        : 'Update details on pending requests',
    ],
    topBlockers: topBlockersResult.rows,
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
