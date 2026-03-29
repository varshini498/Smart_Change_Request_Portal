const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { ROLE_KEYS, normalizeRole, toDisplayRole } = require('../utils/roles');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

router.post('/register', async (req, res) => {
  const { name, email, password, role, roll_no } = req.body;
  const normalizedRole = normalizeRole(role);

  if (!name || !email || !password || !role || !roll_no) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (![ROLE_KEYS.EMPLOYEE, ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN].includes(normalizedRole)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const existingUserResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    const existingUser = existingUserResult.rows[0];
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await query(
      'INSERT INTO users (name, email, password, role, roll_no) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, email, hashedPassword, normalizedRole, roll_no]
    );

    return res.status(201).json({ message: 'Registration successful!' });
  } catch (err) {
    return res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('[LOGIN] user found:', { id: user.id, email: user.email, role: user.role });

    if (!user.is_active) {
      console.log('[LOGIN] blocked inactive user:', user.email);
      return res.status(403).json({ message: 'Account is inactive. Please contact admin.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    console.log('[LOGIN] password match:', valid);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const roleKey = normalizeRole(user.role);
    if (![ROLE_KEYS.EMPLOYEE, ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN].includes(roleKey)) {
      return res.status(400).json({ message: 'Invalid Role' });
    }
    console.log('[LOGIN] user role:', user.role, 'normalized:', roleKey);

    const token = jwt.sign(
      { id: user.id, role: roleKey },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleKey,
        role_label: toDisplayRole(roleKey),
        roll_no: user.roll_no,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Login error', error: err.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userResult = await query(
      'SELECT id, name, email, role, roll_no FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      user: {
        ...user,
        role: normalizeRole(user.role),
        role_label: toDisplayRole(user.role),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
