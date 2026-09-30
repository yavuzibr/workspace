import { create } from 'zustand'
import type { ChatMessage, Conversation, LlmProvider, ToolCallRecord } from '@shared/types'

export type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // ignore
  }
  return 'dark'
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // ignore
  }
}

interface AppState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: ChatMessage[]
  streamingText: string
  activeToolCalls: ToolCallRecord[]
  isStreaming: boolean
  sidebarOpen: boolean
  settingsOpen: boolean
  theme: Theme
  selectedFiles: string[]
  model: string
  provider: LlmProvider
  ollamaModel: string
  lastError: string | null
  retryMessage: string | null

  setModel: (model: string) => void
  setProvider: (provider: LlmProvider) => void
  setOllamaModel: (model: string) => void
  setLastError: (error: string | null) => void
  setRetryMessage: (message: string | null) => void
  toggleTheme: () => void
  toggleFileSelection: (path: string) => void
  clearSelectedFiles: () => void
  setConversations: (c: Conversation[]) => void
  setActiveConversation: (id: string | null) => void
  setMessages: (m: ChatMessage[]) => void
  appendStreamingText: (t: string) => void
  resetStreaming: () => void
  addActiveToolCall: (tc: ToolCallRecord) => void
  updateActiveToolCall: (tc: ToolCallRecord) => void
  setIsStreaming: (v: boolean) => void
  toggleSidebar: () => void
  setSettingsOpen: (v: boolean) => void
}

const initialTheme = getInitialTheme()
if (typeof document !== 'undefined') applyTheme(initialTheme)

export const useAppStore = create<AppState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  streamingText: '',
  activeToolCalls: [],
  isStreaming: false,
  sidebarOpen: true,
  settingsOpen: false,
  theme: initialTheme,
  selectedFiles: [],
  model: '',
  provider: 'openrouter',
  ollamaModel: '',
  lastError: null,
  retryMessage: null,

  setModel: (model) => set({ model }),
  setProvider: (provider) => set({ provider }),
  setOllamaModel: (ollamaModel) => set({ ollamaModel }),
  setLastError: (lastError) => set({ lastError }),
  setRetryMessage: (retryMessage) => set({ retryMessage }),
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return { theme: next }
    }),
  toggleFileSelection: (path) =>
    set((s) => ({
      selectedFiles: s.selectedFiles.includes(path)
        ? s.selectedFiles.filter((p) => p !== path)
        : [...s.selectedFiles, path]
    })),
  clearSelectedFiles: () => set({ selectedFiles: [] }),
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  setMessages: (messages) => set({ messages }),
  appendStreamingText: (t) => set((s) => ({ streamingText: s.streamingText + t })),
  resetStreaming: () =>
    set({ streamingText: '', activeToolCalls: [], isStreaming: false, retryMessage: null }),
  addActiveToolCall: (tc) => set((s) => ({ activeToolCalls: [...s.activeToolCalls, tc] })),
  updateActiveToolCall: (tc) =>
    set((s) => ({
      activeToolCalls: s.activeToolCalls.map((c) => (c.id === tc.id ? tc : c))
    })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen })
}))
