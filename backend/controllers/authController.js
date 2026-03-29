const { query } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER
exports.register = async (req, res) => {
  const { name, roll_no, email, password, role } = req.body;

  if (!name || !roll_no || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);

  // Insert into users table
  try {
    const result = await query(
      "INSERT INTO users (name, roll_no, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [name, roll_no, email, hashedPassword, role]
    );

    res.status(201).json({ message: "User registered successfully", userId: result.rows[0].id });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ message: "Roll no or email already exists" });
    }
    return res.status(500).json({ message: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  try {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (!result.rows.length) return res.status(400).json({ message: "User not found" });

    const user = result.rows[0];
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
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
