const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'utr.db'));

// Create users table
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    roll_no TEXT NOT NULL
  )
`).run();

// Create requests table
db.prepare(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    createdBy INTEGER NOT NULL,
    priority TEXT,
    dateCreated TEXT,
    dueDate TEXT,
    comment TEXT,
    actionBy INTEGER,
    actionDate TEXT
  )
`).run();

module.exports = db;
