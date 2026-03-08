const bcrypt = require('bcrypt');
const db = require('../config/db');
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

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return respond(res, false, 'Email already exists', 400);

    const hash = await bcrypt.hash(password, 10);
    const info = db
      .prepare(
        `INSERT INTO users (name, email, password, role, roll_no, department, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`
      )
      .run(
        String(name).trim(),
        String(email).trim(),
        hash,
        normalizedRole,
        roll_no || `EMP${Date.now()}`,
        department || 'General'
      );

    return respond(res, true, { id: info.lastInsertRowid });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.getAllUsers = (req, res) => {
  try {
    const rows = db
      .prepare('SELECT id, name, email, role, roll_no, department, is_active FROM users ORDER BY id DESC')
      .all();
    return respond(res, true, rows);
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.updateUserRole = (req, res) => {
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

    const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(normalizedRole, id);
    if (!result.changes) return respond(res, false, 'User not found', 404);
    return respond(res, true, { id, role: normalizedRole });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.toggleUserStatus = (req, res) => {
  try {
    const id = Number(req.params.id);
    const { is_active } = req.body || {};
    if (Number.isNaN(id)) return respond(res, false, 'Invalid user id', 400);

    if (id === req.user.id && !is_active) {
      return respond(res, false, 'Admin cannot deactivate self', 400);
    }

    const result = db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, id);
    if (!result.changes) return respond(res, false, 'User not found', 404);
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
    const result = db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, id);
    if (!result.changes) return respond(res, false, 'User not found', 404);
    return respond(res, true, { id });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.deleteUser = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return respond(res, false, 'Invalid user id', 400);
    if (id === req.user.id) return respond(res, false, 'Admin cannot delete self', 400);

    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    if (!result.changes) return respond(res, false, 'User not found', 404);
    return respond(res, true, { id });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};
