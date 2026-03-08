const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const { uploadProfilePhoto } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/me', authMiddleware, userController.getMe);
router.put('/me', authMiddleware, (req, res, next) => {
  uploadProfilePhoto.single('profilePhoto')(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({ message: err.message || 'Invalid upload' });
  });
}, userController.updateMe);
router.delete('/me/photo', authMiddleware, userController.removePhoto);
router.put('/change-password', authMiddleware, userController.changePassword);

router.get('/preferences', authMiddleware, userController.getPreferences);
router.put('/preferences', authMiddleware, userController.updatePreferences);

router.get('/settings', authMiddleware, userController.getSettings);
router.put('/settings', authMiddleware, userController.updateSettings);

module.exports = router;
