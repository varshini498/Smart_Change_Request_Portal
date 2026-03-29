const { query } = require('../config/db');
const respond = require('../utils/respond');

exports.getAuditLogs = async (req, res) => {
  try {
    const { user, action, from, to } = req.query || {};

    let sql = `
      SELECT id,
             "requestId" AS target_id,
             action,
             "actorId" AS user_id,
             "actorRole" AS user_role,
             comment,
             "createdAt" AS timestamp
      FROM audit_logs
      WHERE 1=1
    `;
    const params = [];

    if (user) {
      sql += ` AND "actorId" = $${params.length + 1}`;
      params.push(Number(user));
    }
    if (action) {
      sql += ` AND action = $${params.length + 1}`;
      params.push(String(action));
    }
    if (from) {
      sql += ` AND "createdAt" >= $${params.length + 1}`;
      params.push(String(from));
    }
    if (to) {
      sql += ` AND "createdAt" <= $${params.length + 1}`;
      params.push(String(to));
    }

    sql += ' ORDER BY CAST("createdAt" AS TIMESTAMP) DESC, id DESC';
    const result = await query(sql, params);

    return respond(res, true, result.rows);
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};
