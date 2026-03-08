-- Phase 1 foundational tables for Smart Change Request Portal
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS policy_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  scope TEXT,
  rule_json TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS request_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  actor_id INTEGER,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (request_id) REFERENCES requests(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  channel TEXT NOT NULL,
  template_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  sent_at TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS request_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (request_id) REFERENCES requests(id)
);

CREATE TABLE IF NOT EXISTS user_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  period TEXT NOT NULL,
  quality_score REAL NOT NULL DEFAULT 0,
  sla_score REAL NOT NULL DEFAULT 0,
  throughput INTEGER NOT NULL DEFAULT 0,
  success_rate REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE(user_id, period),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
