const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { isEmployee, isManager } = require('../middleware/roleMiddleware');

// Helper to check if a date is past today
const checkIfOverdue = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

// Employee: Create request
router.post('/create', authMiddleware, isEmployee, (req, res) => {
  const { title, description, priority, dueDate } = req.body;
  if (!title || !description) return res.status(400).json({ message: 'Title and description required' });

  const now = new Date().toISOString();
  // Using 'Pending' in single quotes to ensure it's treated as a string value
  const stmt = db.prepare(`INSERT INTO requests 
    (title, description, status, createdBy, priority, dateCreated, dueDate) 
    VALUES (?, ?, 'Pending', ?, ?, ?, ?)`);
  
  const info = stmt.run(title, description, req.user.id, priority || 'Normal', now, dueDate || null);

  res.status(201).json({ message: 'Request created successfully', requestId: info.lastInsertRowid });
});

// Employee: View my requests
router.get('/my', authMiddleware, isEmployee, (req, res) => {
  const rows = db.prepare('SELECT * FROM requests WHERE createdBy = ?').all(req.user.id);
  const processedRows = rows.map(req => ({ ...req, isOverdue: checkIfOverdue(req.dueDate) }));
  res.json({ requests: processedRows });
});

// Manager: View all requests (Calculates overdue status on the fly)
router.get('/all', authMiddleware, isManager, (req, res) => {
  const rows = db.prepare('SELECT * FROM requests').all();
  const processedRows = rows.map(req => ({
    ...req,
    isOverdue: req.status === 'Pending' && checkIfOverdue(req.dueDate)
  }));
  res.json({ requests: processedRows });
});

// Manager: Pending requests (Fixed SQL string literals)
router.get('/pending', authMiddleware, isManager, (req, res) => {
  // Use single quotes for 'Pending'
  const rows = db.prepare("SELECT * FROM requests WHERE status = 'Pending' ORDER BY dateCreated DESC").all();
  const processedRows = rows.map(req => ({
    ...req,
    isOverdue: checkIfOverdue(req.dueDate)
  }));
  res.json({ requests: processedRows });
});

// Manager: Dashboard counts (Improved aggregation)
router.get('/dashboard/counts', authMiddleware, isManager, (req, res) => {
  const counts = db.prepare(`
    SELECT 
      COUNT(CASE WHEN status = 'Pending' THEN 1 END) AS pending,
      COUNT(CASE WHEN status = 'Approved' THEN 1 END) AS approved,
      COUNT(CASE WHEN status = 'Rejected' THEN 1 END) AS rejected
    FROM requests
  `).get();
  res.json({ counts });
});

// Manager: Approve request
router.put('/:id/approve', authMiddleware, isManager, (req, res) => {
  const { comment } = req.body;
  const id = parseInt(req.params.id);
  // Single quotes used for 'Approved' and 'Pending'
  const info = db.prepare(`
    UPDATE requests 
    SET status = 'Approved', comment = ?, actionBy = ?, actionDate = ? 
    WHERE id = ? AND status = 'Pending'
  `).run(comment || null, req.user.id, new Date().toISOString(), id);

  if (info.changes === 0) return res.status(400).json({ message: 'Request not found or already processed' });
  res.json({ message: 'Request approved', requestId: id });
});

// Manager: Reject request
router.put('/:id/reject', authMiddleware, isManager, (req, res) => {
  const { comment } = req.body;
  const id = parseInt(req.params.id);
  // Single quotes used for 'Rejected' and 'Pending'
  const info = db.prepare(`
    UPDATE requests 
    SET status = 'Rejected', comment = ?, actionBy = ?, actionDate = ? 
    WHERE id = ? AND status = 'Pending'
  `).run(comment || null, req.user.id, new Date().toISOString(), id);

  if (info.changes === 0) return res.status(400).json({ message: 'Request not found or already processed' });
  res.json({ message: 'Request rejected', requestId: id });
});

module.exports = router;