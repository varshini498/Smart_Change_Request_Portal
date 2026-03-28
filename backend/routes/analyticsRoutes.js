const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');
const { ROLE_KEYS, hasRole } = require('../utils/roles');

const router = express.Router();

const canViewOverview = (req, res, next) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return next();
};

const employeeOnly = (req, res, next) => {
  if (!hasRole(req.user.role, ROLE_KEYS.EMPLOYEE)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return next();
};

router.get('/employee', authMiddleware, employeeOnly, analyticsController.getEmployee);
router.get('/overview', authMiddleware, canViewOverview, analyticsController.getOverview);
router.get('/department-stats', authMiddleware, canViewOverview, analyticsController.getDepartmentStats);
router.get('/approval-time', authMiddleware, canViewOverview, analyticsController.getApprovalTime);
router.get('/overdue-trends', authMiddleware, canViewOverview, analyticsController.getOverdueTrends);
router.get('/export/pdf', authMiddleware, canViewOverview, analyticsController.exportPdf);
router.get('/export/excel', authMiddleware, canViewOverview, analyticsController.exportExcel);

module.exports = router;
