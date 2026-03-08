const express = require('express');
const controller = require('../controllers/adminSettingsController');

const router = express.Router();

router.get('/', controller.getSettings);
router.put('/', controller.upsertSetting);
router.delete('/:key', controller.deleteSetting);

module.exports = router;
