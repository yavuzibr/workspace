import type { MouseEvent } from 'react'
import { useAppStore } from '../state/store'
import {
  Folder,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Sun,
  Trash2,
  Youtube
} from 'lucide-react'
import { api } from '../api/client'
import { Mascot } from './Mascot'

interface Props {
  onSelectConversation: (id: string) => void
  onNewChat: () => void
}

export function Sidebar({ onSelectConversation, onNewChat }: Props): JSX.Element {
  const {
    conversations,
    activeConversationId,
    sidebarOpen,
    toggleSidebar,
    setSettingsOpen,
    theme,
    toggleTheme,
    setConversations
  } = useAppStore()

  const sidebarStyle = { backgroundColor: 'var(--bg-sidebar)' }
  const mutedText = { color: 'var(--text-secondary)' }

  const handleDelete = async (e: MouseEvent<HTMLButtonElement>, id: string): Promise<void> => {
    e.stopPropagation()
    if (!confirm('Bu sohbeti silmek istediğine emin misin?')) return
    await api().deleteConversation(id)
    setConversations(conversations.filter((c) => c.id !== id))
    if (activeConversationId === id) {
      onNewChat()
    }
  }

  if (!sidebarOpen) {
    return (
      <div className="flex h-full w-12 flex-col items-center gap-3 py-3" style={sidebarStyle}>
        <button
          onClick={toggleSidebar}
          className="rounded hover:bg-[var(--bg-surface)] p-2"
          style={mutedText}
        >
          <PanelLeftOpen size={18} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full w-64 flex-col" style={sidebarStyle}>
      <div className="flex items-center justify-between px-3 py-3">
        <span
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          <Mascot size={20} />
          Workspace
        </span>
        <button
          onClick={toggleSidebar}
          className="rounded p-1.5 hover:bg-[var(--bg-surface)]"
          style={mutedText}
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <button
        onClick={onNewChat}
        className="mx-3 mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-[var(--bg-surface-2)]"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
      >
        <Plus size={16} /> New chat
      </button>

      <div className="flex-1 overflow-y-auto px-2">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group mb-1 flex items-center rounded-lg border-l-2 ${
              c.id === activeConversationId
                ? 'border-accent bg-accent-subtle'
                : 'border-transparent hover:bg-[var(--bg-surface-2)]'
            }`}
          >
            <button
              onClick={() => onSelectConversation(c.id)}
              className="flex flex-1 items-center gap-1.5 truncate px-3 py-2 text-left text-sm"
              style={{
                color:
                  c.id === activeConversationId ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}
            >
              {c.sourceType === 'youtube' && (
                <Youtube size={13} className="shrink-0 text-red-500" />
              )}
              {c.sourceType === 'huggingface' && <span className="shrink-0 text-xs">🤗</span>}
              {c.sourceType === 'repo' && <Folder size={13} className="shrink-0" />}
              <span className="truncate">
                {c.sourceType === 'youtube' && (c.videoTitle ?? 'YouTube video')}
                {c.sourceType === 'huggingface' && (c.hfFullName ?? 'Hugging Face')}
                {c.sourceType === 'repo' && `${c.repoOwner}/${c.repoName}`}
              </span>
            </button>
            <button
              onClick={(e) => handleDelete(e, c.id)}
              className="mr-1 rounded p-1.5 opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-surface)]"
              style={mutedText}
              title="Sohbeti sil"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="m-3 flex items-center gap-2">
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--bg-surface-2)]"
          style={mutedText}
        >
          <Settings size={16} /> Settings
        </button>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-lg p-2 hover:bg-[var(--bg-surface)]"
          style={mutedText}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  )
}
