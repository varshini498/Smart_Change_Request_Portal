const express = require('express');
const controller = require('../controllers/adminStatsController');

const router = express.Router();

router.get('/', controller.getSystemStats);
router.get('/analytics', controller.getAnalytics);
router.get('/activity', controller.getActivity);

module.exports = router;
