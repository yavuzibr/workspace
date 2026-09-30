import { safeStorage } from 'electron'
import { getDb } from '../db'

export function setSecret(key: string, value: string): void {
  const db = getDb()
  const encrypted = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(value)
    : Buffer.from(value, 'utf-8')
  db.prepare(
    `INSERT INTO settings (key, value_encrypted) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value_encrypted = excluded.value_encrypted`
  ).run(key, encrypted)
}

export function getSecret(key: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT value_encrypted FROM settings WHERE key = ?').get(key) as
    { value_encrypted: Buffer } | undefined
  if (!row) return null
  try {
    return safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(row.value_encrypted)
      : row.value_encrypted.toString('utf-8')
  } catch {
    return null
  }
}
