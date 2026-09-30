import { randomUUID } from 'crypto'
import { getDb } from '../index'
import type { ChatMessage, MessageRole, ToolCallRecord } from '@shared/types'

interface MessageRow {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  tool_calls: string | null
  attached_files: string | null
  created_at: string
}

function toMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    toolCalls: row.tool_calls ? (JSON.parse(row.tool_calls) as ToolCallRecord[]) : null,
    attachedFiles: row.attached_files ? (JSON.parse(row.attached_files) as string[]) : null,
    createdAt: row.created_at
  }
}

export function addMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
  toolCalls: ToolCallRecord[] | null = null,
  attachedFiles: string[] | null = null
): ChatMessage {
  const db = getDb()
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, tool_calls, attached_files, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    conversationId,
    role,
    content,
    toolCalls ? JSON.stringify(toolCalls) : null,
    attachedFiles && attachedFiles.length > 0 ? JSON.stringify(attachedFiles) : null,
    now
  )

  return { id, conversationId, role, content, toolCalls, attachedFiles, createdAt: now }
}

export function getMessages(conversationId: string): ChatMessage[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conversationId) as MessageRow[]
  return rows.map(toMessage)
}
