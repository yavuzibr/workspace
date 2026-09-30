import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'
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

const api = {
  fetchRepo: (ownerRepo: string): Promise<FetchRepoResult> =>
    ipcRenderer.invoke(IpcChannels.GithubFetchRepo, ownerRepo),

  fetchVideo: (url: string): Promise<VideoSummary> =>
    ipcRenderer.invoke(IpcChannels.YoutubeFetchVideo, url),

  fetchHfResource: (kind: HfKind, fullName: string): Promise<HfResourceSummary> =>
    ipcRenderer.invoke(IpcChannels.HuggingfaceFetchResource, kind, fullName),

  newConversation: (sourceType: SourceType, input: string): Promise<Conversation> =>
    ipcRenderer.invoke(IpcChannels.ChatNewConversation, sourceType, input),

  listConversations: (): Promise<Conversation[]> =>
    ipcRenderer.invoke(IpcChannels.ChatListConversations),

  getMessages: (conversationId: string): Promise<ChatMessage[]> =>
    ipcRenderer.invoke(IpcChannels.ChatGetMessages, conversationId),

  switchBranch: (conversationId: string, branch: string): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.ChatSwitchBranch, conversationId, branch),

  getFileTree: (conversationId: string, branch: string): Promise<FileTreeEntry[]> =>
    ipcRenderer.invoke(IpcChannels.ChatGetFileTree, conversationId, branch),

  getHfSubsets: (conversationId: string): Promise<string[]> =>
    ipcRenderer.invoke(IpcChannels.ChatGetHfSubsets, conversationId),

  setHfSubset: (conversationId: string, config: string | null): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.ChatSetHfSubset, conversationId, config),

  deleteConversation: (conversationId: string): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.ChatDeleteConversation, conversationId),

  sendMessage: (conversationId: string, text: string, filePaths: string[] = []): void => {
    ipcRenderer.send(IpcChannels.ChatSendMessage, conversationId, text, filePaths)
  },

  onStream: (callback: (delta: StreamDelta) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, delta: StreamDelta): void =>
      callback(delta)
    ipcRenderer.on(IpcChannels.ChatStream, listener)
    return () => ipcRenderer.removeListener(IpcChannels.ChatStream, listener)
  },

  getSettings: (): Promise<SettingsPayload> => ipcRenderer.invoke(IpcChannels.SettingsGet),

  setSettings: (payload: SettingsPayload): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.SettingsSet, payload),

  listModels: (): Promise<OpenRouterModel[]> => ipcRenderer.invoke(IpcChannels.SettingsListModels),

  listOllamaModels: (): Promise<OpenRouterModel[]> =>
    ipcRenderer.invoke(IpcChannels.SettingsListOllamaModels)
}

export type WorkspaceApi = typeof api

contextBridge.exposeInMainWorld('api', api)
