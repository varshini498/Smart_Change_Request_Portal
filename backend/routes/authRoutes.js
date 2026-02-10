const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// REGISTER
router.post('/register', async (req, res) => {
  const { name, email, password, role, roll_no } = req.body;
  if (!name || !email || !password || !role || !roll_no) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) return res.status(400).json({ message: 'User already exists. Please login.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (name, email, password, role, roll_no) VALUES (?, ?, ?, ?, ?)')
      .run(name, email, hashedPassword, role, roll_no);

    res.status(201).json({ message: 'Registration successful! Please login.' });

  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'All fields are required' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: 'Login successful', token, role: user.role, name: user.name, id: user.id });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
