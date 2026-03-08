const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const copilotController = require('../controllers/copilotController');

const router = express.Router();

router.get('/copilot', authMiddleware, copilotController.getCopilotDashboard);

module.exports = router;
