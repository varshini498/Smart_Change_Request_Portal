const bcrypt = require('bcrypt');
const { query } = require('../config/db');
const respond = require('../utils/respond');
const { ROLE_KEYS, normalizeRole } = require('../utils/roles');

const ALLOWED_ROLES = [ROLE_KEYS.EMPLOYEE, ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN];

exports.createUser = async (req, res) => {
  try {
    const { name, email, role, password, roll_no, department } = req.body || {};
    const normalizedRole = normalizeRole(role);
    if (!name || !email || !password || !normalizedRole) {
      return respond(res, false, 'name, email, password, and role are required', 400);
    }
    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return respond(res, false, 'Invalid role', 400);
    }

    const existsResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    const exists = existsResult.rows[0];
    if (exists) return respond(res, false, 'Email already exists', 400);

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, password, role, roll_no, department, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 1)
       RETURNING id`,
      [
        String(name).trim(),
        String(email).trim(),
        hash,
        normalizedRole,
        roll_no || `EMP${Date.now()}`,
        department || 'General',
      ]
    );

    return respond(res, true, { id: result.rows[0].id });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, roll_no, department, is_active FROM users ORDER BY id DESC'
    );
    return respond(res, true, result.rows);
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body || {};
    const normalizedRole = normalizeRole(role);
    if (Number.isNaN(id) || !normalizedRole) {
      return respond(res, false, 'Invalid input', 400);
    }
    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return respond(res, false, 'Invalid role', 400);
    }

    const result = await query('UPDATE users SET role = $1 WHERE id = $2', [normalizedRole, id]);
    if (!result.rowCount) return respond(res, false, 'User not found', 404);
    return respond(res, true, { id, role: normalizedRole });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { is_active } = req.body || {};
    if (Number.isNaN(id)) return respond(res, false, 'Invalid user id', 400);

    if (id === req.user.id && !is_active) {
      return respond(res, false, 'Admin cannot deactivate self', 400);
    }

    const result = await query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active ? 1 : 0, id]);
    if (!result.rowCount) return respond(res, false, 'User not found', 404);
    return respond(res, true, { id, is_active: !!is_active });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { newPassword } = req.body || {};
    if (Number.isNaN(id) || !newPassword) return respond(res, false, 'Invalid input', 400);

    const hash = await bcrypt.hash(String(newPassword), 10);
    const result = await query('UPDATE users SET password = $1 WHERE id = $2', [hash, id]);
    if (!result.rowCount) return respond(res, false, 'User not found', 404);
    return respond(res, true, { id });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return respond(res, false, 'Invalid user id', 400);
    if (id === req.user.id) return respond(res, false, 'Admin cannot delete self', 400);

    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    if (!result.rowCount) return respond(res, false, 'User not found', 404);
    return respond(res, true, { id });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};
