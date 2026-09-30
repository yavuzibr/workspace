export function ensureMessageColumns(db: import('better-sqlite3').Database): void {
  const columns = db.prepare('PRAGMA table_info(messages)').all() as { name: string }[]
  const names = new Set(columns.map((c) => c.name))

  if (!names.has('attached_files')) {
    db.exec('ALTER TABLE messages ADD COLUMN attached_files TEXT')
  }
}
