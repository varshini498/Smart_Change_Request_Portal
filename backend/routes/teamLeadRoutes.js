const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRole } = require('../middleware/roleMiddleware');

console.log('TEAMLEAD ROUTES LOADED');

const router = express.Router();

const teamLeadOnly = authorizeRole('TEAM_LEAD');

router.get('/pending', authMiddleware, teamLeadOnly, (req, res) => {
  try {
    const raw = db.prepare('SELECT id, status, current_level FROM requests').all();
    console.log('ALL REQUESTS RAW:', raw);
    const rows = db.prepare(
      `SELECT
         r.*,
         COALESCE(r.category, r.type) AS type,
         COALESCE(r.due_date, r.dueDate) AS due_date,
         CASE
           WHEN DATE(COALESCE(r.due_date, r.dueDate)) < DATE('now') THEN 'OVERDUE'
           WHEN DATE(COALESCE(r.due_date, r.dueDate)) = DATE('now') THEN 'DUE_TODAY'
           ELSE 'NORMAL'
         END AS deadline_status,
         u.name AS employee_name
       FROM requests r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE CAST(r.current_level AS INTEGER) = 1
         AND UPPER(REPLACE(COALESCE(r.status, ''), ' ', '_')) = 'PENDING'
       ORDER BY r.created_at DESC`
    ).all();
    console.log('PENDING REQUESTS:', rows);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('TEAMLEAD ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/history', authMiddleware, teamLeadOnly, (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT
         r.*,
         COALESCE(r.category, r.type) AS type,
         ra.action AS decision,
         ra.comment,
         ra.timestamp AS decisionDate,
         COALESCE(u.name, 'Unknown') AS requestedBy,
         COALESCE(u.department, 'General') AS department
       FROM request_approvals ra
       JOIN requests r ON r.id = ra.request_id
       LEFT JOIN users u ON u.id = COALESCE(r.created_by, r.createdBy)
       WHERE ra.approved_by = ?
         AND UPPER(COALESCE(ra.action, ra.status, '')) IN ('APPROVED', 'REJECTED')
       ORDER BY ra.timestamp DESC`
    ).all(req.user.id);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('TEAMLEAD HISTORY ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/approved-history', authMiddleware, teamLeadOnly, (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT
         r.id,
         COALESCE(r.request_number, r.id) AS request_number,
         r.title,
         COALESCE(r.category, r.type) AS type,
         r.priority,
         r.status,
         r.current_level,
         COALESCE(r.created_at, r.dateCreated) AS created_at,
         COALESCE(creator.name, 'Unknown') AS employee_name,
         ra.timestamp AS approved_at
       FROM request_approvals ra
       JOIN requests r ON r.id = ra.request_id
       LEFT JOIN users creator ON creator.id = COALESCE(r.created_by, r.createdBy)
       WHERE UPPER(COALESCE(ra.level_name, '')) = 'TEAM_LEAD'
         AND ra.approved_by = ?
         AND UPPER(COALESCE(ra.action, ra.status, '')) = 'APPROVED'
       ORDER BY datetime(COALESCE(ra.timestamp, '1970-01-01T00:00:00.000Z')) DESC, ra.id DESC`
    ).all(req.user.id);

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('TEAMLEAD APPROVED HISTORY ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/stats', authMiddleware, teamLeadOnly, (req, res) => {
  try {
    const pending = db.prepare(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
         AND current_level = 1`
    ).get();

    const approved = db.prepare(
      `SELECT COUNT(*) AS count
       FROM request_approvals
       WHERE approved_by = ?
         AND UPPER(COALESCE(action, status, '')) = 'APPROVED'`
    ).get(req.user.id);

    const rejected = db.prepare(
      `SELECT COUNT(*) AS count
       FROM request_approvals
       WHERE approved_by = ?
         AND UPPER(COALESCE(action, status, '')) = 'REJECTED'`
    ).get(req.user.id);

    const dueToday = db.prepare(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
         AND current_level = 1
         AND DATE(COALESCE(due_date, dueDate)) = DATE('now')`
    ).get();

    const overdue = db.prepare(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
         AND current_level = 1
         AND DATE(COALESCE(due_date, dueDate)) < DATE('now')`
    ).get();

    return res.json({
      success: true,
      pendingCount: pending?.count || 0,
      approvedCount: approved?.count || 0,
      rejectedCount: rejected?.count || 0,
      dueTodayCount: dueToday?.count || 0,
      overdueCount: overdue?.count || 0,
    });
  } catch (err) {
    console.error('TEAMLEAD STATS ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
