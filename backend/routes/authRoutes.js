const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role, roll_no } = req.body;
  if (!name || !email || !password || !role || !roll_no)
    return res.status(400).json({ message: 'All fields are required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, role, roll_no)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(name, email, hashedPassword, role, roll_no);

    res.json({ message: 'User registered successfully', user: { name, email } });
  } catch (err) {
    console.error('Register DB Error:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'All fields are required' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: 'Login successful', token, role: user.role });
  } catch (err) {
    console.error('Login DB Error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

module.exports = router;
