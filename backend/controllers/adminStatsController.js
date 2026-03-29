const { query } = require('../config/db');
const respond = require('../utils/respond');

const getStatsPayload = async () => {
  try {
    const totalResult = await query('SELECT COUNT(*) AS count FROM requests');
    const pendingResult = await query("SELECT COUNT(*) AS count FROM requests WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'");
    const approvedResult = await query("SELECT COUNT(*) AS count FROM requests WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'FULLY_APPROVED'");
    const rejectedResult = await query("SELECT COUNT(*) AS count FROM requests WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'REJECTED'");
    const dueTodayResult = await query(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
         AND CAST(COALESCE(due_date, "dueDate") AS DATE) = CURRENT_DATE`
    );
    const overdueResult = await query(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
         AND CAST(COALESCE(due_date, "dueDate") AS DATE) < CURRENT_DATE`
    );

    const byStatusResult = await query(
      "SELECT status, COUNT(*) AS count FROM requests GROUP BY status ORDER BY count DESC"
    );
    const byCategoryResult = await query(
      "SELECT COALESCE(category, 'Uncategorized') AS category, COUNT(*) AS count FROM requests GROUP BY COALESCE(category, 'Uncategorized') ORDER BY count DESC"
    );

    const byRoleResult = await query(
      `SELECT u.role AS role, COUNT(*) AS count
       FROM requests r
       JOIN users u ON COALESCE(r.created_by, r."createdBy") = u.id
       GROUP BY u.role
       ORDER BY count DESC`
    );

    const recentActivityResult = await query(
      `SELECT id,
              "requestId" AS target_id,
              action,
              "actorId" AS user_id,
              "actorRole" AS user_role,
              comment,
              "createdAt" AS timestamp
       FROM audit_logs
       ORDER BY CAST("createdAt" AS TIMESTAMP) DESC, id DESC
       LIMIT 10`
    );
    return {
      total: Number(totalResult.rows[0]?.count || 0),
      pending: Number(pendingResult.rows[0]?.count || 0),
      approved: Number(approvedResult.rows[0]?.count || 0),
      rejected: Number(rejectedResult.rows[0]?.count || 0),
      dueToday: Number(dueTodayResult.rows[0]?.count || 0),
      overdue: Number(overdueResult.rows[0]?.count || 0),
      byStatus: byStatusResult.rows,
      byCategory: byCategoryResult.rows,
      byRole: byRoleResult.rows,
      recentActivity: recentActivityResult.rows,
    };
  } catch (err) {
    throw err;
  }
};

exports.getSystemStats = async (req, res) => {
  try {
    return respond(res, true, await getStatsPayload());
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const payload = await getStatsPayload();
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

exports.getActivity = async (req, res) => {
  try {
    const result = await query(
      `SELECT
         COALESCE(u.name, 'Unknown') AS user,
         a.action AS action,
         a."requestId" AS request_id,
         a."createdAt" AS timestamp
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a."actorId"
       ORDER BY CAST(a."createdAt" AS TIMESTAMP) DESC, a.id DESC
       LIMIT 50`
    );
    return respond(res, true, result.rows);
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};
