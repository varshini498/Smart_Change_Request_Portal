const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');
const { ROLE_KEYS, hasRole } = require('../utils/roles');

const router = express.Router();

router.post('/dispatch', authMiddleware, (req, res, next) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
}, notificationController.dispatchNotification);

router.get('/', authMiddleware, notificationController.getMyNotifications);
router.get('/my', authMiddleware, notificationController.getMyNotifications);
router.put('/:id/read', authMiddleware, notificationController.markNotificationRead);
router.patch('/:id/read', authMiddleware, notificationController.markNotificationRead);
router.put('/read-all', authMiddleware, notificationController.markAllRead);
router.post('/read-all', authMiddleware, notificationController.markAllRead);
router.post('/escalate/run', authMiddleware, (req, res, next) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
}, notificationController.runEscalation);

module.exports = router;
