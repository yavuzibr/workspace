import { useEffect, useState } from 'react'
import { AlertTriangle, PanelLeft, Youtube } from 'lucide-react'
import { useAppStore } from '../state/store'
import { api } from '../api/client'
import { PromptBar } from '../components/PromptBar'
import { BranchSelector } from '../components/BranchSelector'
import { SubsetSelector } from '../components/SubsetSelector'
import { ChatMessages } from '../components/ChatMessages'
import { FileExplorer } from '../components/FileExplorer'
import { ModelPicker } from '../components/ModelPicker'

export function ChatPage(): JSX.Element {
  const {
    activeConversationId,
    conversations,
    setConversations,
    messages,
    setMessages,
    streamingText,
    activeToolCalls,
    isStreaming,
    setIsStreaming,
    selectedFiles,
    toggleFileSelection,
    clearSelectedFiles,
    lastError,
    setLastError,
    retryMessage
  } = useAppStore()

  const [branches, setBranches] = useState<string[]>([])
  const [hfSubsets, setHfSubsets] = useState<string[]>([])
  const [explorerOpen, setExplorerOpen] = useState(false)
  const conversation = conversations.find((c) => c.id === activeConversationId)
  const isRepo = conversation?.sourceType === 'repo'
  const isHfDataset =
    conversation?.sourceType === 'huggingface' && conversation.hfKind === 'dataset'
  const hasFiles = conversation?.sourceType === 'repo' || conversation?.sourceType === 'huggingface'

  useEffect(() => {
    if (!activeConversationId) return
    api()
      .getMessages(activeConversationId)
      .then(setMessages)
      .catch(() => {})
  }, [activeConversationId])

  useEffect(() => {
    if (!conversation) return
    clearSelectedFiles()

    if (conversation.sourceType === 'repo') {
      api()
        .fetchRepo(`${conversation.repoOwner}/${conversation.repoName}`)
        .then((res) => setBranches(res.branches))
        .catch(() => setBranches([conversation.branch]))
    }

    if (conversation.sourceType === 'huggingface' && conversation.hfKind === 'dataset') {
      api()
        .getHfSubsets(conversation.id)
        .then(setHfSubsets)
        .catch(() => setHfSubsets([]))
    }
  }, [conversation?.id])

  const handleSend = (text: string): void => {
    if (!activeConversationId || isStreaming) return
    setLastError(null)
    setMessages([
      ...messages,
      {
        id: `pending-${Date.now()}`,
        conversationId: activeConversationId,
        role: 'user',
        content: text,
        toolCalls: null,
        attachedFiles: selectedFiles.length > 0 ? selectedFiles : null,
        createdAt: new Date().toISOString()
      }
    ])
    setIsStreaming(true)
    api().sendMessage(activeConversationId, text, selectedFiles)
    clearSelectedFiles()
  }

  const handleBranchChange = async (branch: string): Promise<void> => {
    if (!activeConversationId) return
    await api().switchBranch(activeConversationId, branch)
    setConversations(
      conversations.map((c) => (c.id === activeConversationId ? { ...c, branch } : c))
    )
    clearSelectedFiles()
  }

  const handleSubsetChange = async (config: string | null): Promise<void> => {
    if (!activeConversationId) return
    await api().setHfSubset(activeConversationId, config)
    setConversations(
      conversations.map((c) => (c.id === activeConversationId ? { ...c, hfConfig: config } : c))
    )
  }

  if (!conversation) return <div className="flex-1" />

  return (
    <div className="flex h-full flex-1">
      {hasFiles && explorerOpen && (
        <FileExplorer conversationId={conversation.id} branch={conversation.branch} />
      )}

      <div className="flex h-full flex-1 flex-col">
        <div
          className="flex items-center justify-between border-b px-6 py-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            {hasFiles && (
              <button
                onClick={() => setExplorerOpen((v) => !v)}
                className="rounded p-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: 'var(--text-secondary)' }}
                title="Toggle file explorer"
              >
                <PanelLeft size={16} />
              </button>
            )}
            {isRepo && (
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {conversation.repoOwner}/{conversation.repoName}
              </span>
            )}
            {conversation.sourceType === 'youtube' && (
              <div className="flex items-center gap-2">
                <Youtube size={16} className="text-red-500" />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {conversation.videoTitle ?? 'YouTube video'}
                  </span>
                  {conversation.videoChannel && (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {conversation.videoChannel}
                    </span>
                  )}
                </div>
              </div>
            )}
            {conversation.sourceType === 'huggingface' && (
              <div className="flex items-center gap-2">
                <span>🤗</span>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {conversation.hfFullName}
                  </span>
                  <span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>
                    {conversation.hfKind}
                  </span>
                </div>
              </div>
            )}
          </div>
          {isRepo && (
            <BranchSelector
              branches={branches}
              activeBranch={conversation.branch}
              onChange={handleBranchChange}
            />
          )}
          {isHfDataset && (
            <SubsetSelector
              subsets={hfSubsets}
              activeSubset={conversation.hfConfig}
              onChange={handleSubsetChange}
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <ChatMessages
            messages={messages}
            streamingText={streamingText}
            activeToolCalls={activeToolCalls}
            isStreaming={isStreaming}
            retryMessage={retryMessage}
          />
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pb-6">
          {lastError && (
            <div
              className="mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-red-400"
              style={{
                borderColor: 'rgba(248, 113, 113, 0.3)',
                backgroundColor: 'rgba(248, 113, 113, 0.08)'
              }}
            >
              <AlertTriangle size={14} className="shrink-0" />
              <span>{lastError}</span>
            </div>
          )}
          <PromptBar
            placeholder={
              isRepo
                ? 'Bu repo hakkında bir şey sor...'
                : conversation.sourceType === 'youtube'
                  ? 'Bu video hakkında bir şey sor...'
                  : 'Bu model/dataset hakkında bir şey sor...'
            }
            onSubmit={handleSend}
            disabled={isStreaming}
            selectedFiles={hasFiles ? selectedFiles : []}
            onRemoveFile={toggleFileSelection}
            rightSlot={<ModelPicker />}
          />
        </div>
      </div>
    </div>
  )
}
