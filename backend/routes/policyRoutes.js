const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const policyController = require('../controllers/policyController');
const { ROLE_KEYS, hasRole } = require('../utils/roles');

const router = express.Router();

router.post('/requests/:id/validate', authMiddleware, (req, res, next) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
}, policyController.validateRequest);

module.exports = router;
