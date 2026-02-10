const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const PORT = 5000;

// middleware
app.use(cors());
app.use(express.json());

// SQLite DB connection
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.log("DB error:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
  )
`);

// Register API
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;

  const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;

  db.run(query, [name, email, password], function (err) {
    if (err) {
      return res.status(400).json({ message: "User already exists" });
    }
    res.status(201).json({ message: "Registered successfully" });
  });
});

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
