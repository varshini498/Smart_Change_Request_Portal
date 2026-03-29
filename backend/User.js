const { query } = require('./config/db');

const User = {
  // FEATURE: Restored Identity View & Live Analytics
  findAll: async () => {
    try {
      const result = await query("SELECT id, name, email, role, roll_no FROM users");
      return result.rows;
    } catch (err) {
      console.error("Database Error in findAll:", err);
      return [];
    }
  },

  // FEATURE: Master Admin Login
  findByEmail: async (email) => {
    try {
      const result = await query("SELECT * FROM users WHERE email = $1", [email]);
      return result.rows[0] || null;
    } catch (err) {
      console.error("Database Error in findByEmail:", err);
      return null;
    }
  }
};

module.exports = User;
