const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// --- AUTHENTICATION ROUTES ---

router.post('/register', async (req, res) => {
  const { name, email, password, role, roll_no } = req.body;
  if (!name || !email || !password || !role || !roll_no) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) return res.status(400).json({ message: 'User already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (name, email, password, role, roll_no) VALUES (?, ?, ?, ?, ?)')
      .run(name, email, hashedPassword, role, roll_no);

    res.status(201).json({ message: 'Registration successful!' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ 
      token, 
      role: user.role, 
      name: user.name, 
      email: user.email, 
      roll_no: user.roll_no 
    });
  } catch (err) {
    res.status(500).json({ message: 'Login error' });
  }
});

// --- REQUEST LOGIC ---

// CREATE REQUEST with Category Validation
router.post('/requests/create', (req, res) => {
  const { title, description, priority, dueDate, category, attachment, roll_no } = req.body;
  
  // FIX: Ensure category matches frontend dropdown values exactly
  const validCategories = ["UI Change", "Backend Update", "Security Patch", "Database Migration", "Personal", "Others"];
  const finalCategory = validCategories.includes(category) ? category : "Others";

  try {
    const query = `INSERT INTO requests 
      (title, description, priority, dueDate, category, attachment, status, createdBy, dateCreated) 
      VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`;
    
    db.prepare(query).run(
      title, 
      description, 
      priority, 
      dueDate, 
      finalCategory, 
      attachment || '', 
      roll_no, // Using the roll_no passed from frontend
      new Date().toISOString()
    );

    res.status(201).json({ message: "Request created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error creating request", error: err.message });
  }
});

// WITHDRAW REQUEST (Refined Case-Insensitive Logic)
router.delete('/requests/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    const request = db.prepare('SELECT status FROM requests WHERE id = ?').get(id);

    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    // Standardize to lowercase to prevent string-matching errors
    const currentStatus = request.status.toLowerCase();

    if (currentStatus === 'pending') {
      db.prepare('DELETE FROM requests WHERE id = ?').run(id);
      return res.status(200).json({ message: "Request successfully withdrawn." });
    } else {
      return res.status(400).json({ 
        message: `Cannot withdraw. This request is already ${request.status}.` 
      });
    }
  } catch (err) {
    return res.status(500).json({ message: "Server error during withdrawal." });
  }
});

module.exports = router;