const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { authorizeRole } = require('../middleware/roleMiddleware');
const { ROLE_KEYS } = require('../utils/roles');

const adminUsersRoutes = require('./adminUsersRoutes');
const adminStatsRoutes = require('./adminStatsRoutes');
const adminRequestsRoutes = require('./adminRequestsRoutes');
const adminAuditRoutes = require('./adminAuditRoutes');
const adminSettingsRoutes = require('./adminSettingsRoutes');
const adminCategoriesRoutes = require('./adminCategoriesRoutes');
const adminStatsController = require('../controllers/adminStatsController');

const router = express.Router();

router.use(verifyToken, authorizeRole(ROLE_KEYS.ADMIN));

router.use('/users', adminUsersRoutes);
router.use('/stats', adminStatsRoutes);
router.get('/activity', adminStatsController.getActivity);
router.get('/analytics', adminStatsController.getAnalytics);
router.use('/requests', adminRequestsRoutes);
router.use('/audit', adminAuditRoutes);
router.use('/settings', adminSettingsRoutes);
router.use('/categories', adminCategoriesRoutes);

module.exports = router;
