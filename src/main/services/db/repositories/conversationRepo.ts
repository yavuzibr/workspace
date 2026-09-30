import { randomUUID } from 'crypto'
import { getDb } from '../index'
import type { Conversation, HfKind, SourceType } from '@shared/types'

interface ConversationRow {
  id: string
  source_type: SourceType
  repo_id: number | null
  branch: string
  video_id: string | null
  hf_kind: HfKind | null
  hf_resource_id: string | null
  hf_config: string | null
  title: string | null
  created_at: string
  updated_at: string
  repo_owner: string | null
  repo_name: string | null
  video_title: string | null
  video_channel: string | null
  hf_full_name: string | null
}

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    sourceType: row.source_type,
    repoId: row.repo_id,
    repoOwner: row.repo_owner,
    repoName: row.repo_name,
    branch: row.branch,
    videoId: row.video_id,
    videoTitle: row.video_title,
    videoChannel: row.video_channel,
    hfKind: row.hf_kind,
    hfFullName: row.hf_full_name,
    hfConfig: row.hf_config,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const SELECT_WITH_SOURCE = `
  SELECT
    c.id, c.source_type, c.repo_id, c.branch, c.video_id, c.hf_kind, c.hf_resource_id, c.hf_config,
    c.title, c.created_at, c.updated_at,
    r.owner AS repo_owner, r.name AS repo_name,
    v.title AS video_title, v.channel AS video_channel,
    h.full_name AS hf_full_name
  FROM conversations c
  LEFT JOIN repos r ON r.id = c.repo_id
  LEFT JOIN videos v ON v.id = c.video_id
  LEFT JOIN hf_resources h ON h.id = c.hf_resource_id
`

export function createRepoConversation(
  repoId: number,
  branch: string,
  title: string
): Conversation {
  const db = getDb()
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO conversations (id, source_type, repo_id, branch, title, created_at, updated_at)
     VALUES (?, 'repo', ?, ?, ?, ?, ?)`
  ).run(id, repoId, branch, title, now, now)

  const row = db.prepare(`${SELECT_WITH_SOURCE} WHERE c.id = ?`).get(id) as ConversationRow
  return toConversation(row)
}

export function createYoutubeConversation(videoId: string, title: string): Conversation {
  const db = getDb()
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO conversations (id, source_type, branch, video_id, title, created_at, updated_at)
     VALUES (?, 'youtube', '', ?, ?, ?, ?)`
  ).run(id, videoId, title, now, now)

  const row = db.prepare(`${SELECT_WITH_SOURCE} WHERE c.id = ?`).get(id) as ConversationRow
  return toConversation(row)
}

export function createHuggingfaceConversation(
  hfKind: HfKind,
  resourceId: string,
  title: string
): Conversation {
  const db = getDb()
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO conversations (id, source_type, branch, hf_kind, hf_resource_id, title, created_at, updated_at)
     VALUES (?, 'huggingface', '', ?, ?, ?, ?, ?)`
  ).run(id, hfKind, resourceId, title, now, now)

  const row = db.prepare(`${SELECT_WITH_SOURCE} WHERE c.id = ?`).get(id) as ConversationRow
  return toConversation(row)
}

export function listConversations(): Conversation[] {
  const db = getDb()
  const rows = db
    .prepare(`${SELECT_WITH_SOURCE} ORDER BY c.updated_at DESC`)
    .all() as ConversationRow[]
  return rows.map(toConversation)
}

export function touchConversation(id: string): void {
  const db = getDb()
  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    id
  )
}

export function setConversationBranch(id: string, branch: string): void {
  const db = getDb()
  db.prepare('UPDATE conversations SET branch = ?, updated_at = ? WHERE id = ?').run(
    branch,
    new Date().toISOString(),
    id
  )
}

export function setConversationHfConfig(id: string, config: string | null): void {
  const db = getDb()
  db.prepare('UPDATE conversations SET hf_config = ?, updated_at = ? WHERE id = ?').run(
    config,
    new Date().toISOString(),
    id
  )
}

export function deleteConversation(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id)
  db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
}

export function getConversation(id: string): Conversation | null {
  const db = getDb()
  const row = db.prepare(`${SELECT_WITH_SOURCE} WHERE c.id = ?`).get(id) as
    ConversationRow | undefined
  return row ? toConversation(row) : null
}
