const db = require('./config/db'); // Ensure this points to your better-sqlite3 instance

const User = {
  // FEATURE: Restored Identity View & Live Analytics
  findAll: () => {
    try {
      const stmt = db.prepare("SELECT id, name, email, role, roll_no FROM users");
      return stmt.all(); // This restores all user info for the registry
    } catch (err) {
      console.error("Database Error in findAll:", err);
      return [];
    }
  },

  // FEATURE: Master Admin Login
  findByEmail: (email) => {
    try {
      const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
      return stmt.get(email); // Returns the specific user for RBAC verification
    } catch (err) {
      console.error("Database Error in findByEmail:", err);
      return null;
    }
  }
};

module.exports = User;