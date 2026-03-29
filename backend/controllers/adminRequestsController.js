const db = require('../config/db');
const respond = require('../utils/respond');

const parseDate = (value) => (value ? String(value) : null);
const normalizeStatus = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
const nowIso = () => new Date().toISOString();

exports.getAllRequests = (req, res) => {
  try {
    const {
      status,
      employee,
      role,
      from,
      to,
      page = 1,
      limit = 20,
    } = req.query || {};

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let sql = `
      SELECT r.*,
             u.name AS employee_name,
             u.role AS employee_role,
             COALESCE(r.category, r.type) AS type,
             COALESCE(r.created_at, r.dateCreated) AS created_at,
             COALESCE(r.due_date, r.dueDate) AS due_date,
             CASE
               WHEN DATE(COALESCE(r.due_date, r.dueDate)) < DATE('now') THEN 'OVERDUE'
               WHEN DATE(COALESCE(r.due_date, r.dueDate)) = DATE('now') THEN 'DUE_TODAY'
               ELSE 'NORMAL'
             END AS deadline_status
      FROM requests r
      JOIN users u ON COALESCE(r.created_by, r.createdBy) = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += " AND UPPER(REPLACE(COALESCE(r.status, ''), ' ', '_')) = ?";
      params.push(normalizeStatus(status));
    }
    if (employee) {
      sql += ' AND u.name LIKE ?';
      params.push(`%${employee}%`);
    }
    if (role) {
      sql += ' AND u.role = ?';
      params.push(role);
    }
    if (from) {
      sql += ' AND COALESCE(r.created_at, r.dateCreated) >= ?';
      params.push(parseDate(from));
    }
    if (to) {
      sql += ' AND COALESCE(r.created_at, r.dateCreated) <= ?';
      params.push(parseDate(to));
    }

    const countSql = `SELECT COUNT(*) AS count FROM (${sql}) AS filtered`;
    const totalCount = db.prepare(countSql).get(...params).count;

    sql += ' ORDER BY datetime(COALESCE(r.created_at, r.dateCreated)) DESC, r.id DESC LIMIT ? OFFSET ?';
    const pageParams = params.concat([limitNum, offset]);

    const rows = db.prepare(sql).all(...pageParams);

    const approvalsStmt = db.prepare(
      `SELECT id, approval_level_id, level_name, approved_by, status, action, comment, timestamp
       FROM request_approvals
       WHERE request_id = ?
       ORDER BY datetime(COALESCE(timestamp, '1970-01-01T00:00:00.000Z')) ASC, id ASC`
    );

    const auditStmt = db.prepare(
      `SELECT id, requestId AS request_id, action, actorId AS user_id, actorRole AS user_role, comment, createdAt AS timestamp
       FROM audit_logs
       WHERE requestId = ?
       ORDER BY datetime(createdAt) ASC, id ASC`
    );

    const data = rows.map((row) => ({
      ...row,
      approvals: approvalsStmt.all(row.id),
      audit_logs: auditStmt.all(row.id),
    }));

    return respond(res, true, {
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      rows: data,
    });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.overrideRequest = (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, reason } = req.body || {};
    if (Number.isNaN(id)) return respond(res, false, 'Invalid request id', 400);
    if (!status || !reason) return respond(res, false, 'status and reason are required', 400);

    const now = nowIso();
    let nextLevel = null;
    let completedAt = null;

    const nextStatus = normalizeStatus(status);

    if (nextStatus === 'PENDING') {
      nextLevel = 1;
    } else if (nextStatus === 'REJECTED' || nextStatus === 'FULLY_APPROVED') {
      nextLevel = null;
      completedAt = now;
    }

    db.prepare(
      `UPDATE requests
       SET status = ?,
           overall_status = ?,
           current_level = ?,
           completed_at = ?
       WHERE id = ?`
    ).run(nextStatus, nextStatus, nextLevel, completedAt, id);

    db.prepare(
      `INSERT INTO audit_logs (requestId, action, actorId, actorRole, comment, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, `Override: ${nextStatus}`, req.user.id, req.user.role, String(reason), now);

    return respond(res, true, { id, status: nextStatus, current_level: nextLevel });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.escalateRequest = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return respond(res, false, 'Invalid request id', 400);

    const request = db.prepare('SELECT id, status, current_level, title FROM requests WHERE id = ?').get(id);
    if (!request) return respond(res, false, 'Request not found', 404);
    if (normalizeStatus(request.status) !== 'PENDING') {
      return respond(res, false, 'Only pending requests can be escalated', 400);
    }
    if (Number(request.current_level) !== 1) {
      return respond(res, false, 'Only TEAM_LEAD level requests can be escalated', 400);
    }

    const now = nowIso();
    db.prepare(
      `UPDATE requests
       SET current_level = 2,
           status = 'ESCALATED',
           overall_status = 'ESCALATED',
           actionDate = ?
       WHERE id = ?`
    ).run(now, id);

    db.prepare(
      `INSERT INTO audit_logs (requestId, action, actorId, actorRole, comment, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, 'Escalated to MANAGER', req.user.id, req.user.role, 'Admin escalation', now);

    return respond(res, true, { id, status: 'ESCALATED', current_level: 2 });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.bulkAction = (req, res) => {
  try {
    const { action, request_ids: requestIds } = req.body || {};
    const normalizedAction = String(action || '').trim().toLowerCase();
    if (!['approve', 'reject', 'archive'].includes(normalizedAction)) {
      return respond(res, false, 'Invalid action. Use approve/reject/archive', 400);
    }
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return respond(res, false, 'request_ids array is required', 400);
    }

    const ids = [...new Set(requestIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
    if (!ids.length) return respond(res, false, 'No valid request ids provided', 400);

    const now = nowIso();
    let nextStatus = 'PENDING';
    let nextLevel = null;
    let completedAt = null;

    if (normalizedAction === 'approve') {
      nextStatus = 'FULLY_APPROVED';
      nextLevel = null;
      completedAt = now;
    } else if (normalizedAction === 'reject') {
      nextStatus = 'REJECTED';
      nextLevel = null;
      completedAt = now;
    } else if (normalizedAction === 'archive') {
      nextStatus = 'ARCHIVED';
      nextLevel = null;
      completedAt = now;
    }

    const updateStmt = db.prepare(
      `UPDATE requests
       SET status = ?,
           overall_status = ?,
           current_level = ?,
           completed_at = COALESCE(?, completed_at),
           actionDate = ?
       WHERE id = ?`
    );

    const auditStmt = db.prepare(
      `INSERT INTO audit_logs (requestId, action, actorId, actorRole, comment, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    let updated = 0;
    ids.forEach((id) => {
      const info = updateStmt.run(nextStatus, nextStatus, nextLevel, completedAt, now, id);
      if (info.changes > 0) {
        updated += 1;
        auditStmt.run(id, `Bulk ${normalizedAction.toUpperCase()}`, req.user.id, req.user.role, null, now);
      }
    });

    return respond(res, true, { action: normalizedAction, updated });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.deleteRequest = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return respond(res, false, 'Invalid request id', 400);

    const request = db.prepare('SELECT id, status, current_level FROM requests WHERE id = ?').get(id);
    if (!request) return respond(res, false, 'Request not found', 404);

    const status = normalizeStatus(request.status);
    const level = Number(request.current_level);

    let allowDelete = false;
    if (status === 'PENDING' && level === 1) allowDelete = true;
    if (['FULLY_APPROVED', 'REJECTED', 'WITHDRAWN'].includes(status)) allowDelete = true;
    if (status === 'PENDING' && level === 2) allowDelete = false;

    if (!allowDelete) {
      return respond(res, false, 'Delete blocked: request is in Manager approval stage', 400);
    }

    const now = nowIso();
    db.prepare('DELETE FROM request_approvals WHERE request_id = ?').run(id);
    db.prepare('DELETE FROM notifications WHERE request_id = ?').run(id);
    db.prepare('DELETE FROM audit_logs WHERE requestId = ?').run(id);
    const info = db.prepare('DELETE FROM requests WHERE id = ?').run(id);

    if (!info.changes) return respond(res, false, 'Request not found', 404);

    db.prepare(
      `INSERT INTO audit_logs (requestId, action, actorId, actorRole, comment, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, 'Admin deleted request', req.user.id, req.user.role, null, now);

    return respond(res, true, { id, deleted: true });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};
