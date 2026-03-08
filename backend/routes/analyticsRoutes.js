const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');
const { ROLE_KEYS, hasRole } = require('../utils/roles');

const router = express.Router();

const managerOrAdmin = (req, res, next) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
};

router.get('/overview', authMiddleware, managerOrAdmin, analyticsController.getOverview);
router.get('/department-stats', authMiddleware, managerOrAdmin, analyticsController.getDepartmentStats);
router.get('/approval-time', authMiddleware, managerOrAdmin, analyticsController.getApprovalTime);
router.get('/overdue-trends', authMiddleware, managerOrAdmin, analyticsController.getOverdueTrends);
router.get('/export/pdf', authMiddleware, managerOrAdmin, analyticsController.exportPdf);
router.get('/export/excel', authMiddleware, managerOrAdmin, analyticsController.exportExcel);

module.exports = router;
