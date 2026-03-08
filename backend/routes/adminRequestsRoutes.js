const express = require('express');
const controller = require('../controllers/adminRequestsController');

const router = express.Router();

router.get('/', controller.getAllRequests);
router.put('/:id/override', controller.overrideRequest);
router.put('/:id/escalate', controller.escalateRequest);
router.put('/bulk', controller.bulkAction);
router.delete('/:id', controller.deleteRequest);

module.exports = router;
