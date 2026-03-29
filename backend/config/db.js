const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'utr.db'));
const tableColumns = (tableName) =>
  db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);

// Create users table
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    roll_no TEXT NOT NULL,
    department TEXT DEFAULT 'General',
    is_active INTEGER NOT NULL DEFAULT 1
  )
`).run();
const userColumns = tableColumns('users');
if (!userColumns.includes('department')) {
  db.prepare(`ALTER TABLE users ADD COLUMN department TEXT DEFAULT 'General'`).run();
}
if (!userColumns.includes('is_active')) {
  db.prepare(`ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`).run();
}
if (!userColumns.includes('phone')) {
  db.prepare(`ALTER TABLE users ADD COLUMN phone TEXT`).run();
}
if (!userColumns.includes('profile_photo')) {
  db.prepare(`ALTER TABLE users ADD COLUMN profile_photo TEXT`).run();
}
if (!userColumns.includes('theme')) {
  db.prepare(`ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'light'`).run();
}
if (!userColumns.includes('font_size')) {
  db.prepare(`ALTER TABLE users ADD COLUMN font_size TEXT DEFAULT 'medium'`).run();
}
// Normalize legacy role values to strict keys: EMPLOYEE, TEAM_LEAD, MANAGER, ADMIN.
db.prepare(
  `UPDATE users
   SET role = CASE
     WHEN role IS NULL OR TRIM(role) = '' THEN 'EMPLOYEE'
     WHEN UPPER(TRIM(role)) IN ('EMPLOYEE') THEN 'EMPLOYEE'
     WHEN UPPER(REPLACE(TRIM(role), ' ', '_')) IN ('TEAM_LEAD', 'TEAMLEAD') THEN 'TEAM_LEAD'
     WHEN UPPER(TRIM(role)) IN ('MANAGER') THEN 'MANAGER'
     WHEN UPPER(TRIM(role)) IN ('ADMIN') THEN 'ADMIN'
     ELSE UPPER(REPLACE(TRIM(role), ' ', '_'))
   END`
).run();

// Create requests table - UPDATED with category and attachment
db.prepare(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    createdBy INTEGER NOT NULL,
    priority TEXT,
    category TEXT,    -- Added: Feature 4 (Categories)
    attachment TEXT,  -- Added: Feature 2 (Links/Documents)
    dateCreated TEXT,
    dueDate TEXT,
    comment TEXT,
    actionBy INTEGER,
    actionDate TEXT
  )
`).run();

// Backward-compatible schema upgrade for older databases.
const requestColumns = tableColumns('requests');
const requestSchema = db.prepare('PRAGMA table_info(requests);').all();
console.log('REQUESTS TABLE SCHEMA:', requestSchema);
if (!requestColumns.includes('category')) {
  db.prepare(`ALTER TABLE requests ADD COLUMN category TEXT`).run();
}
if (!requestColumns.includes('type')) {
  db.prepare(`ALTER TABLE requests ADD COLUMN type TEXT`).run();
}
if (!requestColumns.includes('attachment')) {
  db.prepare(`ALTER TABLE requests ADD COLUMN attachment TEXT`).run();
}
if (!requestColumns.includes('current_level')) {
  db.prepare(`ALTER TABLE requests ADD COLUMN current_level INTEGER`).run();
}
if (!requestColumns.includes('overall_status')) {
  db.prepare(`ALTER TABLE requests ADD COLUMN overall_status TEXT DEFAULT 'Pending'`).run();
}
if (!requestColumns.includes('created_by')) {
  db.prepare(`ALTER TABLE requests ADD COLUMN created_by INTEGER`).run();
}
if (!requestColumns.includes('completed_at')) {
  db.prepare(`ALTER TABLE requests ADD COLUMN completed_at TEXT`).run();
}
if (!requestColumns.includes('created_at')) {
  db.prepare(`ALTER TABLE requests ADD COLUMN created_at TEXT`).run();
}
if (!requestColumns.includes('due_date')) {
  db.prepare(`ALTER TABLE requests ADD COLUMN due_date TEXT`).run();
}
if (!requestColumns.includes('request_number')) {
  db.prepare(`ALTER TABLE requests ADD COLUMN request_number INTEGER`).run();
}
if (!requestColumns.includes('version')) {
  db.prepare(`ALTER TABLE requests ADD COLUMN version INTEGER NOT NULL DEFAULT 1`).run();
}
if (!requestColumns.includes('submitted_at')) {
  db.prepare(`ALTER TABLE requests ADD COLUMN submitted_at TEXT`).run();
}
const requestsNeedingNumber = db.prepare(
  `SELECT id, COALESCE(created_by, createdBy) AS creator_id, COALESCE(created_at, dateCreated, completed_at) AS created_marker
   FROM requests
   WHERE request_number IS NULL
   ORDER BY creator_id ASC, datetime(COALESCE(created_at, dateCreated, completed_at, '1970-01-01T00:00:00.000Z')) ASC, id ASC`
).all();
if (requestsNeedingNumber.length) {
  const nextByUser = new Map();
  const existingByUser = db.prepare(
    `SELECT COALESCE(created_by, createdBy) AS creator_id, MAX(COALESCE(request_number, 0)) AS max_request_number
     FROM requests
     GROUP BY COALESCE(created_by, createdBy)`
  ).all();

  existingByUser.forEach((row) => {
    nextByUser.set(Number(row.creator_id), Number(row.max_request_number || 0));
  });

  const updateRequestNumber = db.prepare('UPDATE requests SET request_number = ? WHERE id = ?');
  requestsNeedingNumber.forEach((row) => {
    const creatorId = Number(row.creator_id);
    const next = (nextByUser.get(creatorId) || 0) + 1;
    updateRequestNumber.run(next, row.id);
    nextByUser.set(creatorId, next);
  });
}
db.prepare(
  `UPDATE requests
   SET type = COALESCE(NULLIF(TRIM(CAST(category AS TEXT)), ''), type)
   WHERE type IS NULL OR TRIM(CAST(type AS TEXT)) = ''`
).run();
db.prepare(
  `UPDATE requests
   SET due_date = COALESCE(NULLIF(TRIM(CAST(dueDate AS TEXT)), ''), due_date)
   WHERE due_date IS NULL OR TRIM(CAST(due_date AS TEXT)) = ''`
).run();
// Normalize request statuses and current_level for consistent workflow queries.
db.prepare(
  `UPDATE requests
   SET status = CASE
     WHEN status IS NULL OR TRIM(status) = '' THEN UPPER(REPLACE(COALESCE(overall_status, 'PENDING'), ' ', '_'))
     WHEN UPPER(REPLACE(TRIM(status), ' ', '_')) = 'PENDING' THEN 'PENDING'
     WHEN UPPER(REPLACE(TRIM(status), ' ', '_')) = 'REJECTED' THEN 'REJECTED'
     WHEN UPPER(REPLACE(TRIM(status), ' ', '_')) = 'WITHDRAWN' THEN 'WITHDRAWN'
     WHEN UPPER(REPLACE(TRIM(status), ' ', '_')) IN ('APPROVED', 'FULLY_APPROVED') THEN 'FULLY_APPROVED'
     ELSE UPPER(REPLACE(TRIM(status), ' ', '_'))
   END`
).run();
db.prepare(
  `UPDATE requests
   SET current_level = CASE
     WHEN current_level IS NULL OR TRIM(CAST(current_level AS TEXT)) = '' THEN NULL
     WHEN UPPER(REPLACE(TRIM(CAST(current_level AS TEXT)), ' ', '_')) IN ('TEAM_LEAD', 'TEAMLEAD') THEN 1
     WHEN UPPER(TRIM(CAST(current_level AS TEXT))) = 'MANAGER' THEN 2
     WHEN UPPER(TRIM(CAST(current_level AS TEXT))) = 'ADMIN' THEN 2
     ELSE current_level
   END`
).run();
db.prepare(
  `UPDATE requests
   SET current_level = 2
   WHERE current_level = 3
     AND UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'`
).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requestId INTEGER NOT NULL,
    action TEXT NOT NULL,
    actorId INTEGER NOT NULL,
    actorRole TEXT NOT NULL,
    comment TEXT,
    createdAt TEXT NOT NULL
  )
`).run();

// Phase 1 foundation tables
db.prepare(`
  CREATE TABLE IF NOT EXISTS policy_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    scope TEXT,
    rule_json TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS request_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    actor_id INTEGER,
    payload_json TEXT,
    created_at TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    channel TEXT NOT NULL,
    template_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    is_read INTEGER NOT NULL DEFAULT 0,
    message TEXT,
    sent_at TEXT,
    meta_json TEXT,
    created_at TEXT NOT NULL
  )
`).run();
const notificationColumns = tableColumns('notifications');
if (!notificationColumns.includes('is_read')) {
  db.prepare(`ALTER TABLE notifications ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0`).run();
}
if (!notificationColumns.includes('message')) {
  db.prepare(`ALTER TABLE notifications ADD COLUMN message TEXT`).run();
}
if (!notificationColumns.includes('request_id')) {
  db.prepare(`ALTER TABLE notifications ADD COLUMN request_id INTEGER`).run();
}

db.prepare(`
  CREATE TABLE IF NOT EXISTS request_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS user_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    period TEXT NOT NULL,
    quality_score REAL NOT NULL DEFAULT 0,
    sla_score REAL NOT NULL DEFAULT 0,
    throughput INTEGER NOT NULL DEFAULT 0,
    success_rate REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    UNIQUE(user_id, period)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY,
    email_enabled INTEGER NOT NULL DEFAULT 1,
    notify_approved INTEGER NOT NULL DEFAULT 1,
    notify_rejected INTEGER NOT NULL DEFAULT 1,
    notify_comments INTEGER NOT NULL DEFAULT 1,
    notify_overdue INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`).run();
db.prepare(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`).run();
db.prepare(
  `INSERT OR IGNORE INTO settings (key, value)
   SELECT key, value FROM system_settings`
).run();
const defaultSettingsSeed = [
  ['default_priority', 'Medium'],
  ['max_requests_per_day', '5'],
  ['enable_notifications', 'true'],
  ['sla_days', '3'],
];
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
defaultSettingsSeed.forEach(([key, value]) => insertSetting.run(key, value));

db.prepare(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`).run();
const categoriesSeed = ['Database Change', 'API Change', 'UI Change', 'Infrastructure Change', 'Security Update'];
const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, created_at) VALUES (?, ?)');
categoriesSeed.forEach((name) => insertCategory.run(name, new Date().toISOString()));

db.prepare(`
  CREATE TABLE IF NOT EXISTS approval_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level_number INTEGER NOT NULL UNIQUE,
    role_name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS request_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    approval_level_id INTEGER NOT NULL,
    approved_by INTEGER,
    status TEXT NOT NULL DEFAULT 'Pending',
    comment TEXT,
    timestamp TEXT,
    FOREIGN KEY (request_id) REFERENCES requests(id),
    FOREIGN KEY (approval_level_id) REFERENCES approval_levels(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  )
`).run();
const requestApprovalColumns = tableColumns('request_approvals');
if (!requestApprovalColumns.includes('level_name')) {
  db.prepare(`ALTER TABLE request_approvals ADD COLUMN level_name TEXT`).run();
}
if (!requestApprovalColumns.includes('action')) {
  db.prepare(`ALTER TABLE request_approvals ADD COLUMN action TEXT`).run();
}

db.prepare(`
  CREATE TABLE IF NOT EXISTS request_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    attachment_url TEXT,
    updated_by INTEGER,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (request_id) REFERENCES requests(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
  )
`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_request_versions_request_id ON request_versions(request_id)`).run();

// Seed default approval chain if missing.
const approvalLevelCount = db.prepare('SELECT COUNT(*) AS count FROM approval_levels').get().count;
if (!approvalLevelCount) {
  const seed = db.prepare('INSERT INTO approval_levels (level_number, role_name, is_active) VALUES (?, ?, 1)');
  seed.run(1, 'TEAM_LEAD');
  seed.run(2, 'MANAGER');
  seed.run(3, 'ADMIN');
}

// Phase 1 indexes
db.prepare(`CREATE INDEX IF NOT EXISTS idx_request_events_request_id ON request_events(request_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_request_events_created_at ON request_events(created_at)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_request_tags_request_id ON request_tags(request_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_request_tags_tag ON request_tags(tag)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_metrics_user_period ON user_metrics(user_id, period)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_requests_overall_status ON requests(overall_status)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_requests_current_level ON requests(current_level)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests(created_by)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_request_approvals_request_id ON request_approvals(request_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_request_approvals_level_status ON request_approvals(approval_level_id, status)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_request_approvals_level_name_action ON request_approvals(level_name, action)`).run();

module.exports = db;
