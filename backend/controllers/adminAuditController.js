const db = require('../config/db');
const respond = require('../utils/respond');

exports.getAuditLogs = (req, res) => {
  try {
    const { user, action, from, to } = req.query || {};

    let sql = `
      SELECT id,
             requestId AS target_id,
             action,
             actorId AS user_id,
             actorRole AS user_role,
             comment,
             createdAt AS timestamp
      FROM audit_logs
      WHERE 1=1
    `;
    const params = [];

    if (user) {
      sql += ' AND actorId = ?';
      params.push(Number(user));
    }
    if (action) {
      sql += ' AND action = ?';
      params.push(String(action));
    }
    if (from) {
      sql += ' AND createdAt >= ?';
      params.push(String(from));
    }
    if (to) {
      sql += ' AND createdAt <= ?';
      params.push(String(to));
    }

    sql += ' ORDER BY datetime(createdAt) DESC, id DESC';
    const rows = db.prepare(sql).all(...params);

    return respond(res, true, rows);
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};
