export const HF_RESOURCES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS hf_resources (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  full_name TEXT NOT NULL,
  card_json TEXT,
  readme_md TEXT,
  files_json TEXT,
  sample_rows_json TEXT,
  fetched_at TEXT
);
`

export function ensureHfConversationColumns(db: import('better-sqlite3').Database): void {
  const columns = db.prepare('PRAGMA table_info(conversations)').all() as { name: string }[]
  const names = new Set(columns.map((c) => c.name))

  if (!names.has('hf_kind')) {
    db.exec('ALTER TABLE conversations ADD COLUMN hf_kind TEXT')
  }
  if (!names.has('hf_resource_id')) {
    db.exec('ALTER TABLE conversations ADD COLUMN hf_resource_id TEXT REFERENCES hf_resources(id)')
  }
  if (!names.has('hf_config')) {
    db.exec('ALTER TABLE conversations ADD COLUMN hf_config TEXT')
  }
}
