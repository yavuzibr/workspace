export interface Repo {
  id: number
  owner: string
  name: string
  defaultBranch: string
  description: string | null
  fetchedAt: string
}

export type SourceType = 'repo' | 'youtube' | 'huggingface'
export type HfKind = 'model' | 'dataset'

export interface Conversation {
  id: string
  sourceType: SourceType
  repoId: number | null
  repoOwner: string | null
  repoName: string | null
  branch: string
  videoId: string | null
  videoTitle: string | null
  videoChannel: string | null
  hfKind: HfKind | null
  hfFullName: string | null
  hfConfig: string | null
  title: string | null
  createdAt: string
  updatedAt: string
}

export type MessageRole = 'user' | 'assistant' | 'tool' | 'system'

export interface ToolCallRecord {
  id: string
  name: string
  args: Record<string, unknown>
  result?: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  toolCalls: ToolCallRecord[] | null
  attachedFiles: string[] | null
  createdAt: string
}

export interface StreamDelta {
  conversationId: string
  type: 'text' | 'tool_call_start' | 'tool_call_end' | 'retry' | 'done' | 'error'
  text?: string
  toolCall?: ToolCallRecord
  error?: string
  messageId?: string
}

export interface FetchRepoResult {
  repo: Repo
  branches: string[]
}

export type LlmProvider = 'openrouter' | 'ollama'

export interface SettingsPayload {
  githubToken?: string
  openrouterKey?: string
  model?: string
  provider?: LlmProvider
  ollamaModel?: string
}

export interface OpenRouterModel {
  id: string
  name: string
}

export interface FileTreeEntry {
  path: string
  type: 'blob' | 'tree'
  readable: boolean
}

export interface VideoSummary {
  id: string
  url: string
  title: string | null
  channel: string | null
  durationSeconds: number | null
  thumbnailUrl: string | null
}

export interface HfResourceSummary {
  kind: HfKind
  fullName: string
  taskOrCategory: string | null
  license: string | null
  downloads: number | null
  likes: number | null
}
