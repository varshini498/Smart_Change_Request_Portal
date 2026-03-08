-- Draft Requests + Request Version History
-- Run once on existing SQLite DB.

ALTER TABLE requests ADD COLUMN IF NOT EXISTS current_level INTEGER;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS submitted_at TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS request_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  attachment_url TEXT,
  updated_by INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (request_id) REFERENCES requests(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_request_versions_request_id
  ON request_versions(request_id);

-- Optional data normalization (legacy values).
UPDATE requests
SET status = 'DRAFT'
WHERE UPPER(TRIM(COALESCE(status, ''))) = 'DRAFT';

UPDATE requests
SET status = 'PENDING'
WHERE UPPER(TRIM(COALESCE(status, ''))) = 'PENDING';
