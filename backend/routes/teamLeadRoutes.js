const express = require('express');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRole } = require('../middleware/roleMiddleware');

console.log('TEAMLEAD ROUTES LOADED');

const router = express.Router();

const teamLeadOnly = authorizeRole('TEAM_LEAD');

router.get('/pending', authMiddleware, teamLeadOnly, async (req, res) => {
  try {
    const rawResult = await query('SELECT id, status, current_level FROM requests');
    const raw = rawResult.rows;
    console.log('ALL REQUESTS RAW:', raw);
    const rowsResult = await query(
      `SELECT
         r.*,
         COALESCE(r.category, r.type) AS type,
         COALESCE(r.due_date, r."dueDate") AS due_date,
         CASE
           WHEN CAST(COALESCE(r.due_date, r."dueDate") AS DATE) < CURRENT_DATE THEN 'OVERDUE'
           WHEN CAST(COALESCE(r.due_date, r."dueDate") AS DATE) = CURRENT_DATE THEN 'DUE_TODAY'
           ELSE 'NORMAL'
         END AS deadline_status,
         u.name AS employee_name
       FROM requests r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE CAST(r.current_level AS INTEGER) = 1
         AND UPPER(REPLACE(COALESCE(r.status, ''), ' ', '_')) = 'PENDING'
       ORDER BY CAST(COALESCE(r.created_at, r."dateCreated") AS TIMESTAMP) DESC`
    );
    const rows = rowsResult.rows;
    console.log('PENDING REQUESTS:', rows);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('TEAMLEAD ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/history', authMiddleware, teamLeadOnly, async (req, res) => {
  try {
    const rowsResult = await query(
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
       LEFT JOIN users u ON u.id = COALESCE(r.created_by, r."createdBy")
       WHERE ra.approved_by = $1
         AND UPPER(COALESCE(ra.action, ra.status, '')) IN ('APPROVED', 'REJECTED')
       ORDER BY CAST(ra.timestamp AS TIMESTAMP) DESC`,
      [req.user.id]
    );
    const rows = rowsResult.rows;
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('TEAMLEAD HISTORY ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/approved-history', authMiddleware, teamLeadOnly, async (req, res) => {
  try {
    const rowsResult = await query(
      `SELECT
         r.id,
         COALESCE(r.request_number, r.id) AS request_number,
         r.title,
         COALESCE(r.category, r.type) AS type,
         r.priority,
         r.status,
         r.current_level,
         COALESCE(r.created_at, r."dateCreated") AS created_at,
         COALESCE(creator.name, 'Unknown') AS employee_name,
         ra.timestamp AS approved_at
       FROM request_approvals ra
       JOIN requests r ON r.id = ra.request_id
       LEFT JOIN users creator ON creator.id = COALESCE(r.created_by, r."createdBy")
       WHERE UPPER(COALESCE(ra.level_name, '')) = 'TEAM_LEAD'
         AND ra.approved_by = $1
         AND UPPER(COALESCE(ra.action, ra.status, '')) = 'APPROVED'
       ORDER BY CAST(COALESCE(ra.timestamp, '1970-01-01T00:00:00.000Z') AS TIMESTAMP) DESC, ra.id DESC`,
      [req.user.id]
    );
    const rows = rowsResult.rows;

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('TEAMLEAD APPROVED HISTORY ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/stats', authMiddleware, teamLeadOnly, async (req, res) => {
  try {
    const pendingResult = await query(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
         AND current_level = 1`
    );

    const approvedResult = await query(
      `SELECT COUNT(*) AS count
       FROM request_approvals
       WHERE approved_by = $1
         AND UPPER(COALESCE(action, status, '')) = 'APPROVED'`
      ,
      [req.user.id]
    );

    const rejectedResult = await query(
      `SELECT COUNT(*) AS count
       FROM request_approvals
       WHERE approved_by = $1
         AND UPPER(COALESCE(action, status, '')) = 'REJECTED'`
      ,
      [req.user.id]
    );

    const dueTodayResult = await query(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
         AND current_level = 1
         AND CAST(COALESCE(due_date, "dueDate") AS DATE) = CURRENT_DATE`
    );

    const overdueResult = await query(
      `SELECT COUNT(*) AS count
       FROM requests
       WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
         AND current_level = 1
         AND CAST(COALESCE(due_date, "dueDate") AS DATE) < CURRENT_DATE`
    );

    return res.json({
      success: true,
      pendingCount: Number(pendingResult.rows[0]?.count || 0),
      approvedCount: Number(approvedResult.rows[0]?.count || 0),
      rejectedCount: Number(rejectedResult.rows[0]?.count || 0),
      dueTodayCount: Number(dueTodayResult.rows[0]?.count || 0),
      overdueCount: Number(overdueResult.rows[0]?.count || 0),
    });
  } catch (err) {
    console.error('TEAMLEAD STATS ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
