const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER
exports.register = (req, res) => {
  const { name, roll_no, email, password, role } = req.body;

  if (!name || !roll_no || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);

  // Insert into users table
  const sql = "INSERT INTO users (name, roll_no, email, password, role) VALUES (?, ?, ?, ?, ?)";

  db.query(sql, [name, roll_no, email, hashedPassword, role], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "Roll no or email already exists" });
      }
      return res.status(500).json({ message: err.message });
    }

    res.status(201).json({ message: "User registered successfully", userId: result.insertId });
  });
};

// LOGIN
exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });

    if (results.length === 0) return res.status(400).json({ message: "User not found" });

    const user = results[0];

    // Compare password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token, role: user.role });
  });
};
