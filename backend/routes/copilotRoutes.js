const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const copilotController = require('../controllers/copilotController');

const router = express.Router();

router.get('/dashboard/copilot', authMiddleware, copilotController.getCopilotDashboard);
router.post('/copilot/ask', authMiddleware, copilotController.askCopilot);

module.exports = router;
