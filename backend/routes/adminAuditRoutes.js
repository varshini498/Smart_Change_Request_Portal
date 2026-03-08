const express = require('express');
const controller = require('../controllers/adminAuditController');

const router = express.Router();

router.get('/', controller.getAuditLogs);

module.exports = router;
