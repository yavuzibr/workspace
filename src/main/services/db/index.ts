import Database from 'better-sqlite3'
import { app } from 'electron'
import { join, dirname } from 'path'
import { existsSync, copyFileSync } from 'fs'
import { INIT_SQL } from './migrations/001_init'
import { VIDEOS_TABLE_SQL, ensureConversationColumns } from './migrations/002_youtube'
import { HF_RESOURCES_TABLE_SQL, ensureHfConversationColumns } from './migrations/003_huggingface'
import { ensureMessageColumns } from './migrations/004_attached_files'

let db: Database.Database | null = null

function migrateFromOldUserData(dbPath: string): void {
  if (existsSync(dbPath)) return
  const oldDbPath = join(dirname(app.getPath('userData')), 'github-agent', 'github-agent.db')
  if (existsSync(oldDbPath)) {
    copyFileSync(oldDbPath, dbPath)
  }
}

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'workspace.db')
  migrateFromOldUserData(dbPath)
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(INIT_SQL)
  db.exec(VIDEOS_TABLE_SQL)
  ensureConversationColumns(db)
  db.exec(HF_RESOURCES_TABLE_SQL)
  ensureHfConversationColumns(db)
  ensureMessageColumns(db)

  return db
}
