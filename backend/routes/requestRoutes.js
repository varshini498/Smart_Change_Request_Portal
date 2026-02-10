const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { isEmployee, isManager } = require('../middleware/roleMiddleware');

/* =========================================================
   EMPLOYEE: CREATE REQUEST
========================================================= */
router.post('/create', authMiddleware, isEmployee, (req, res) => {
  const { title, description, priority, dueDate } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO requests
    (title, description, status, createdBy, priority, dateCreated, dueDate)
    VALUES (?, ?, 'Pending', ?, ?, ?, ?)
  `);

  const info = stmt.run(
    title,
    description,
    req.user.id,
    priority || 'Normal',
    now,
    dueDate || null
  );

  res.status(201).json({
    message: 'Request created successfully',
    requestId: info.lastInsertRowid
  });
});

/* =========================================================
   GET REQUESTS (EMPLOYEE / MANAGER)
========================================================= */
router.get('/', authMiddleware, (req, res) => {
  let sql = 'SELECT * FROM requests';
  const params = [];
  const conditions = [];

  if (req.user.role === 'Employee') {
    conditions.push('createdBy = ?');
    params.push(req.user.id);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  const rows = db.prepare(sql).all(...params).map(r => ({
    ...r,
    isOverdue:
      r.status === 'Pending' &&
      r.dueDate &&
      new Date(r.dueDate) < new Date()
  }));

  res.json({ requests: rows });
});

/* =========================================================
   MANAGER: VIEW PENDING REQUESTS (WITH OVERDUE FLAG)
========================================================= */
router.get('/pending', authMiddleware, isManager, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM requests
    WHERE status = 'Pending'
    ORDER BY dateCreated DESC
  `).all().map(r => ({
    ...r,
    isOverdue:
      r.dueDate &&
      new Date(r.dueDate) < new Date()
  }));

  res.json({
    message: 'Pending requests fetched successfully',
    total: rows.length,
    requests: rows
  });
});

/* =========================================================
   MANAGER DASHBOARD COUNTS
========================================================= */
router.get('/dashboard/counts', authMiddleware, isManager, (req, res) => {
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN status='Pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status='Approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status='Rejected' THEN 1 ELSE 0 END) AS rejected
    FROM requests
  `).get();

  res.json({
    message: 'Dashboard counts fetched successfully',
    counts
  });
});

/* =========================================================
   MANAGER: APPROVE REQUEST
========================================================= */
router.put('/:id/approve', authMiddleware, isManager, (req, res) => {
  const id = parseInt(req.params.id);
  const { comment } = req.body;

  const info = db.prepare(`
    UPDATE requests
    SET status='Approved',
        comment=?,
        actionBy=?,
        actionDate=?
    WHERE id=? AND status='Pending'
  `).run(
    comment || null,
    req.user.id,
    new Date().toISOString(),
    id
  );

  if (info.changes === 0) {
    return res.status(400).json({
      message: 'Request not found or already processed'
    });
  }

  res.json({ message: 'Request approved successfully', requestId: id });
});

/* =========================================================
   MANAGER: REJECT REQUEST
========================================================= */
router.put('/:id/reject', authMiddleware, isManager, (req, res) => {
  const id = parseInt(req.params.id);
  const { comment } = req.body;

  const info = db.prepare(`
    UPDATE requests
    SET status='Rejected',
        comment=?,
        actionBy=?,
        actionDate=?
    WHERE id=? AND status='Pending'
  `).run(
    comment || null,
    req.user.id,
    new Date().toISOString(),
    id
  );

  if (info.changes === 0) {
    return res.status(400).json({
      message: 'Request not found or already processed'
    });
  }

  res.json({ message: 'Request rejected successfully', requestId: id });
});

/* =========================================================
   MANAGER: BATCH APPROVE
========================================================= */
router.put('/batch/approve', authMiddleware, isManager, (req, res) => {
  const { requestIds, comment } = req.body;
  let updated = 0;

  const stmt = db.prepare(`
    UPDATE requests
    SET status='Approved',
        comment=?,
        actionBy=?,
        actionDate=?
    WHERE id=? AND status='Pending'
  `);

  requestIds.forEach(id => {
    const info = stmt.run(
      comment || null,
      req.user.id,
      new Date().toISOString(),
      parseInt(id)
    );
    if (info.changes > 0) updated++;
  });

  res.json({
    message: 'Batch approve completed',
    totalRequested: requestIds.length,
    totalUpdated: updated
  });
});

/* =========================================================
   MANAGER: BATCH REJECT
========================================================= */
router.put('/batch/reject', authMiddleware, isManager, (req, res) => {
  const { requestIds, comment } = req.body;
  let updated = 0;

  const stmt = db.prepare(`
    UPDATE requests
    SET status='Rejected',
        comment=?,
        actionBy=?,
        actionDate=?
    WHERE id=? AND status='Pending'
  `);

  requestIds.forEach(id => {
    const info = stmt.run(
      comment || null,
      req.user.id,
      new Date().toISOString(),
      parseInt(id)
    );
    if (info.changes > 0) updated++;
  });

  res.json({
    message: 'Batch reject completed',
    totalRequested: requestIds.length,
    totalUpdated: updated
  });
});

module.exports = router;
