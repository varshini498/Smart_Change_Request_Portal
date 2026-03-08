const express = require('express');
const controller = require('../controllers/adminUsersController');

const router = express.Router();

router.post('/', controller.createUser);
router.get('/', controller.getAllUsers);
router.put('/:id/role', controller.updateUserRole);
router.put('/:id/status', controller.toggleUserStatus);
router.put('/:id/reset-password', controller.resetPassword);
router.delete('/:id', controller.deleteUser);

module.exports = router;
