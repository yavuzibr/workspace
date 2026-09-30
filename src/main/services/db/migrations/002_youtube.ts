export const VIDEOS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  channel TEXT,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  transcript_json TEXT,
  fetched_at TEXT
);
`

export function ensureConversationColumns(db: import('better-sqlite3').Database): void {
  const columns = db.prepare('PRAGMA table_info(conversations)').all() as { name: string }[]
  const names = new Set(columns.map((c) => c.name))

  if (!names.has('source_type')) {
    db.exec("ALTER TABLE conversations ADD COLUMN source_type TEXT NOT NULL DEFAULT 'repo'")
  }
  if (!names.has('video_id')) {
    db.exec('ALTER TABLE conversations ADD COLUMN video_id TEXT REFERENCES videos(id)')
  }
}
