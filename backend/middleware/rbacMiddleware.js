const authMiddleware = require('./authMiddleware');
const { authorizeRole } = require('./roleMiddleware');

module.exports = {
  verifyToken: authMiddleware.verifyToken || authMiddleware,
  authorizeRole,
};
