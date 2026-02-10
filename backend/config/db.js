const Database = require('better-sqlite3');
const db = new Database('database.db');

/* ============================
   USERS TABLE
   ============================ */
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  )
`).run();

/* ============================
   REQUESTS TABLE
   ============================ */
db.prepare(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'Pending',

    createdBy INTEGER NOT NULL,

    priority TEXT NOT NULL DEFAULT 'MEDIUM',

    dateCreated TEXT NOT NULL,
    dueDate TEXT,

    comment TEXT,

    actionBy TEXT,
    actionDate TEXT,

    FOREIGN KEY (createdBy) REFERENCES users(id)
  )
`).run();

module.exports = db;
