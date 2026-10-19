export const SCHEMA_VERSION = 2;

export const CREATE_TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    hash TEXT,
    size INTEGER NOT NULL DEFAULT 0,
    modified_at INTEGER NOT NULL DEFAULT 0,
    last_backup INTEGER,
    status TEXT NOT NULL DEFAULT 'pending'
  )`,
  `CREATE TABLE IF NOT EXISTS backup_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    category TEXT NOT NULL,
    total_files INTEGER NOT NULL DEFAULT 0,
    total_size INTEGER NOT NULL DEFAULT 0,
    chunks_total INTEGER NOT NULL DEFAULT 0,
    chunks_sent INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    -- Message ids of the run's manifests, comma separated: a zip run sends one
    -- per archive. Link the first one, never Number() the whole column.
    manifest_id TEXT,
    -- Telegram document file_ids of the run's manifests, comma separated in
    -- the same order as manifest_id. One-tap restore downloads these first.
    manifest_file_ids TEXT,
    archive_name TEXT,
    encrypted INTEGER NOT NULL DEFAULT 0,
    error_reason TEXT,
    archive_format TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    telegram_msg_id INTEGER,
    uploaded_at INTEGER,
    -- Telegram document file_id and the uploaded part name: both are what
    -- one-tap restore needs to re-download a part without listing chat
    -- history (the Bot API has no history access). Part name also
    -- disambiguates chunk_index, which restarts per archive in zip mode.
    telegram_file_id TEXT,
    part_name TEXT,
    FOREIGN KEY (session_id) REFERENCES backup_sessions (id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_chunks_session ON chunks (session_id)`,
];

/**
 * Idempotent upgrades for installs created before SCHEMA_VERSION 2. Each
 * statement is wrapped in try/catch in db.ts because ADD COLUMN fails when the
 * column already exists (fresh installs create it in CREATE_TABLES).
 */
export const MIGRATIONS: string[] = [
  `ALTER TABLE backup_sessions ADD COLUMN archive_name TEXT`,
  `ALTER TABLE backup_sessions ADD COLUMN encrypted INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE backup_sessions ADD COLUMN error_reason TEXT`,
  `ALTER TABLE backup_sessions ADD COLUMN archive_format TEXT`,
  `ALTER TABLE backup_sessions ADD COLUMN manifest_file_ids TEXT`,
  `ALTER TABLE chunks ADD COLUMN telegram_file_id TEXT`,
  `ALTER TABLE chunks ADD COLUMN part_name TEXT`,
];
