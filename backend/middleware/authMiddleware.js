const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('../config/db');
const { normalizeRole, toDisplayRole } = require('../utils/roles');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

const verifyToken = function(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded user:', decoded);
    const user = db
      .prepare('SELECT id, name, email, role, roll_no, is_active FROM users WHERE id = ?')
      .get(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Session invalid. Please login again.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is inactive. Please contact admin.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      role_label: toDisplayRole(user.role),
      roll_no: user.roll_no,
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = verifyToken;
module.exports.verifyToken = verifyToken;
