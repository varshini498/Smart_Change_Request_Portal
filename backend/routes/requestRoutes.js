const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { isEmployee, isManager } = require('../middleware/roleMiddleware');

// Employee: Create request
router.post('/create', authMiddleware, isEmployee, (req, res) => {
  const { title, description, priority, dueDate } = req.body;
  if (!title || !description) return res.status(400).json({ message: 'Title and description required' });

  const now = new Date().toISOString();
  const stmt = db.prepare(`INSERT INTO requests
    (title, description, status, createdBy, priority, dateCreated, dueDate)
    VALUES (?, ?, 'Pending', ?, ?, ?, ?)`);
  const info = stmt.run(title, description, req.user.id, priority || 'Normal', now, dueDate || null);

  res.status(201).json({ message: 'Request created successfully', requestId: info.lastInsertRowid });
});

// Employee: View my requests
router.get('/my', authMiddleware, isEmployee, (req, res) => {
  const rows = db.prepare('SELECT * FROM requests WHERE createdBy = ?').all(req.user.id);
  res.json({ requests: rows });
});

// Manager: View all requests
router.get('/all', authMiddleware, isManager, (req, res) => {
  const rows = db.prepare('SELECT * FROM requests').all();
  res.json({ requests: rows });
});

// Manager: Pending requests
router.get('/pending', authMiddleware, isManager, (req, res) => {
  const rows = db.prepare('SELECT * FROM requests WHERE status="Pending" ORDER BY dateCreated DESC').all();
  res.json({ requests: rows });
});

// Manager: Dashboard counts
router.get('/dashboard/counts', authMiddleware, isManager, (req, res) => {
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN status='Pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status='Approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status='Rejected' THEN 1 ELSE 0 END) AS rejected
    FROM requests
  `).get();
  res.json({ counts });
});

// Manager: Approve/Reject request
router.put('/:id/approve', authMiddleware, isManager, (req, res) => {
  const { comment } = req.body;
  const id = parseInt(req.params.id);
  const info = db.prepare('UPDATE requests SET status="Approved", comment=?, actionBy=?, actionDate=? WHERE id=? AND status="Pending"')
    .run(comment || null, req.user.id, new Date().toISOString(), id);

  if (info.changes === 0) return res.status(400).json({ message: 'Request not found or already processed' });
  res.json({ message: 'Request approved', requestId: id });
});

router.put('/:id/reject', authMiddleware, isManager, (req, res) => {
  const { comment } = req.body;
  const id = parseInt(req.params.id);
  const info = db.prepare('UPDATE requests SET status="Rejected", comment=?, actionBy=?, actionDate=? WHERE id=? AND status="Pending"')
    .run(comment || null, req.user.id, new Date().toISOString(), id);

  if (info.changes === 0) return res.status(400).json({ message: 'Request not found or already processed' });
  res.json({ message: 'Request rejected', requestId: id });
});

module.exports = router;
