/// <reference types="vite/client" />

import type {
  ChatMessage,
  Conversation,
  FetchRepoResult,
  FileTreeEntry,
  HfKind,
  HfResourceSummary,
  OpenRouterModel,
  SettingsPayload,
  SourceType,
  StreamDelta,
  VideoSummary
} from '@shared/types'

export interface WorkspaceApi {
  fetchRepo: (ownerRepo: string) => Promise<FetchRepoResult>
  fetchVideo: (url: string) => Promise<VideoSummary>
  fetchHfResource: (kind: HfKind, fullName: string) => Promise<HfResourceSummary>
  newConversation: (sourceType: SourceType, input: string) => Promise<Conversation>
  listConversations: () => Promise<Conversation[]>
  getMessages: (conversationId: string) => Promise<ChatMessage[]>
  switchBranch: (conversationId: string, branch: string) => Promise<void>
  getFileTree: (conversationId: string, branch: string) => Promise<FileTreeEntry[]>
  getHfSubsets: (conversationId: string) => Promise<string[]>
  setHfSubset: (conversationId: string, config: string | null) => Promise<void>
  deleteConversation: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, text: string, filePaths?: string[]) => void
  onStream: (callback: (delta: StreamDelta) => void) => () => void
  getSettings: () => Promise<SettingsPayload>
  setSettings: (payload: SettingsPayload) => Promise<void>
  listModels: () => Promise<OpenRouterModel[]>
  listOllamaModels: () => Promise<OpenRouterModel[]>
}

declare global {
  interface Window {
    api: WorkspaceApi
  }
}
