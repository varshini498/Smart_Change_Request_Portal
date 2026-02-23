const express = require('express');
const router = express.Router();
const User = require('../User'); 
const db = require('../config/db'); // Needed for direct SQL execution

// FEATURE: Global User Governance (Read)
router.get('/users', (req, res) => {
  try {
    const users = User.findAll(); 
    res.json({ users: users || [] }); 
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ message: "Error restoring user database" });
  }
});

// FEATURE: Admin Data Management (Delete)
router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Execute SQL to remove the user from utr.db
    const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
    
    if (result.changes > 0) {
      res.json({ message: "User removed successfully from infrastructure" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Error deleting user" });
  }
});

module.exports = router;