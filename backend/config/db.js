require('dotenv').config();

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const query = async (text, params = []) => pool.query(text, params);

const defaultSettingsSeed = [
  ['default_priority', 'Medium'],
  ['max_requests_per_day', '5'],
  ['enable_notifications', 'true'],
  ['sla_days', '3'],
];

const categoriesSeed = ['Database Change', 'API Change', 'UI Change', 'Infrastructure Change', 'Security Update'];
const approvalChainSeed = [
  [1, 'TEAM_LEAD'],
  [2, 'MANAGER'],
  [3, 'ADMIN'],
];

const initPostgres = async () => {
  await query('SELECT 1');
  console.log('PostgreSQL connected');

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      roll_no TEXT NOT NULL,
      department TEXT DEFAULT 'General',
      is_active INTEGER NOT NULL DEFAULT 1,
      phone TEXT,
      profile_photo TEXT,
      theme TEXT DEFAULT 'light',
      font_size TEXT DEFAULT 'medium'
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      "createdBy" INTEGER,
      priority TEXT,
      category TEXT,
      attachment TEXT,
      "dateCreated" TEXT,
      "dueDate" TEXT,
      comment TEXT,
      "actionBy" INTEGER,
      "actionDate" TEXT,
      type TEXT,
      current_level INTEGER,
      overall_status TEXT DEFAULT 'Pending',
      created_by INTEGER,
      completed_at TEXT,
      created_at TEXT,
      due_date TEXT,
      request_number INTEGER,
      version INTEGER NOT NULL DEFAULT 1,
      submitted_at TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      "requestId" INTEGER NOT NULL,
      action TEXT NOT NULL,
      "actorId" INTEGER NOT NULL,
      "actorRole" TEXT NOT NULL,
      comment TEXT,
      "createdAt" TEXT NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS policy_rules (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      scope TEXT,
      rule_json TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS request_events (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      actor_id INTEGER,
      payload_json TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      channel TEXT NOT NULL,
      template_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      is_read INTEGER NOT NULL DEFAULT 0,
      message TEXT,
      sent_at TEXT,
      meta_json TEXT,
      created_at TEXT NOT NULL,
      request_id INTEGER
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS request_tags (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_metrics (
      id SERIAL PRIMARY KEY,
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
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER PRIMARY KEY,
      email_enabled INTEGER NOT NULL DEFAULT 1,
      notify_approved INTEGER NOT NULL DEFAULT 1,
      notify_rejected INTEGER NOT NULL DEFAULT 1,
      notify_comments INTEGER NOT NULL DEFAULT 1,
      notify_overdue INTEGER NOT NULL DEFAULT 1
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await query(`
    INSERT INTO settings (key, value)
    SELECT key, value FROM system_settings
    ON CONFLICT (key) DO NOTHING
  `);

  for (const [key, value] of defaultSettingsSeed) {
    await query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [key, value]
    );
  }

  await query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT NOW()::text
    )
  `);

  for (const name of categoriesSeed) {
    await query(
      'INSERT INTO categories (name, created_at) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
      [name, new Date().toISOString()]
    );
  }

  await query(`
    CREATE TABLE IF NOT EXISTS approval_levels (
      id SERIAL PRIMARY KEY,
      level_number INTEGER NOT NULL UNIQUE,
      role_name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS request_approvals (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL,
      approval_level_id INTEGER NOT NULL,
      approved_by INTEGER,
      status TEXT NOT NULL DEFAULT 'Pending',
      comment TEXT,
      timestamp TEXT,
      level_name TEXT,
      action TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS request_versions (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      title TEXT,
      description TEXT,
      attachment_url TEXT,
      updated_by INTEGER,
      updated_at TEXT NOT NULL
    )
  `);

  for (const [levelNumber, roleName] of approvalChainSeed) {
    await query(
      'INSERT INTO approval_levels (level_number, role_name, is_active) VALUES ($1, $2, 1) ON CONFLICT (level_number) DO NOTHING',
      [levelNumber, roleName]
    );
  }

  await query('CREATE INDEX IF NOT EXISTS idx_request_versions_request_id ON request_versions(request_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_request_events_request_id ON request_events(request_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_request_events_created_at ON request_events(created_at)');
  await query('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)');
  await query('CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)');
  await query('CREATE INDEX IF NOT EXISTS idx_request_tags_request_id ON request_tags(request_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_request_tags_tag ON request_tags(tag)');
  await query('CREATE INDEX IF NOT EXISTS idx_user_metrics_user_period ON user_metrics(user_id, period)');
  await query('CREATE INDEX IF NOT EXISTS idx_requests_overall_status ON requests(overall_status)');
  await query('CREATE INDEX IF NOT EXISTS idx_requests_current_level ON requests(current_level)');
  await query('CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests(created_by)');
  await query('CREATE INDEX IF NOT EXISTS idx_request_approvals_request_id ON request_approvals(request_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_request_approvals_level_status ON request_approvals(approval_level_id, status)');
  await query('CREATE INDEX IF NOT EXISTS idx_request_approvals_level_name_action ON request_approvals(level_name, action)');
};

const initPromise = initPostgres().catch((error) => {
  console.error('PostgreSQL initialization failed:', error);
  throw error;
});

module.exports = {
  pool,
  query,
  initPromise,
};
