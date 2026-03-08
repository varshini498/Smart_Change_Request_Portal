const db = require('../config/db');
const respond = require('../utils/respond');

const getStatsPayload = () => {
  try {
    const total = db.prepare('SELECT COUNT(*) AS count FROM requests').get().count;
    const pending = db.prepare("SELECT COUNT(*) AS count FROM requests WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'").get().count;
    const approved = db.prepare("SELECT COUNT(*) AS count FROM requests WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'FULLY_APPROVED'").get().count;
    const rejected = db.prepare("SELECT COUNT(*) AS count FROM requests WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'REJECTED'").get().count;
    const dueToday = db.prepare(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
         AND DATE(COALESCE(due_date, dueDate)) = DATE('now')`
    ).get().count;
    const overdue = db.prepare(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
         AND DATE(COALESCE(due_date, dueDate)) < DATE('now')`
    ).get().count;

    const byStatus = db.prepare(
      "SELECT status, COUNT(*) AS count FROM requests GROUP BY status ORDER BY count DESC"
    ).all();
    const byCategory = db.prepare(
      "SELECT COALESCE(category, 'Uncategorized') AS category, COUNT(*) AS count FROM requests GROUP BY COALESCE(category, 'Uncategorized') ORDER BY count DESC"
    ).all();

    const byRole = db.prepare(
      `SELECT u.role AS role, COUNT(*) AS count
       FROM requests r
       JOIN users u ON COALESCE(r.created_by, r.createdBy) = u.id
       GROUP BY u.role
       ORDER BY count DESC`
    ).all();

    const recentActivity = db.prepare(
      `SELECT id,
              requestId AS target_id,
              action,
              actorId AS user_id,
              actorRole AS user_role,
              comment,
              createdAt AS timestamp
       FROM audit_logs
       ORDER BY datetime(createdAt) DESC, id DESC
       LIMIT 10`
    ).all();
    return {
      total,
      pending,
      approved,
      rejected,
      dueToday,
      overdue,
      byStatus,
      byCategory,
      byRole,
      recentActivity,
    };
  } catch (err) {
    throw err;
  }
};

exports.getSystemStats = (req, res) => {
  try {
    return respond(res, true, getStatsPayload());
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.getAnalytics = (req, res) => {
  try {
    const payload = getStatsPayload();
    return respond(res, true, {
      total_requests: payload.total,
      pending: payload.pending,
      approved: payload.approved,
      rejected: payload.rejected,
      overdue: payload.overdue,
      due_today: payload.dueToday,
      by_status: payload.byStatus,
      by_category: payload.byCategory,
    });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.getActivity = (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT
         COALESCE(u.name, 'Unknown') AS user,
         a.action AS action,
         a.requestId AS request_id,
         a.createdAt AS timestamp
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actorId
       ORDER BY datetime(a.createdAt) DESC, a.id DESC
       LIMIT 50`
    ).all();
    return respond(res, true, rows);
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};
