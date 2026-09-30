import { useEffect, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { HomePage } from './pages/HomePage'
import { ChatPage } from './pages/ChatPage'
import { SettingsModal } from './pages/SettingsModal'
import { useAppStore } from './state/store'
import { api } from './api/client'
import type { SourceType } from '@shared/types'

export default function App(): JSX.Element {
  const {
    activeConversationId,
    setActiveConversation,
    setConversations,
    messages,
    setMessages,
    appendStreamingText,
    resetStreaming,
    addActiveToolCall,
    updateActiveToolCall,
    isStreaming,
    setIsStreaming,
    setLastError,
    setRetryMessage
  } = useAppStore()

  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingTextRef = useRef('')
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Streaming text arrives in many small chunks (especially via OpenRouter). Applying each
  // chunk directly to the store triggers a full markdown re-render every time, which feels
  // laggy. Buffer chunks and flush to the store at most every ~100ms instead.
  const flushPendingText = (): void => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    if (pendingTextRef.current) {
      appendStreamingText(pendingTextRef.current)
      pendingTextRef.current = ''
    }
  }

  const queueText = (text: string): void => {
    pendingTextRef.current += text
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null
        flushPendingText()
      }, 100)
    }
  }

  const disarmWatchdog = (): void => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }

  const armWatchdog = (): void => {
    disarmWatchdog()
    watchdogRef.current = setTimeout(() => {
      setIsStreaming(false)
      resetStreaming()
      setLastError('Yanıt alınamadı (zaman aşımı). Lütfen tekrar dener misin.')
    }, 90_000)
  }

  useEffect(() => {
    api()
      .listConversations()
      .then(setConversations)
      .catch(() => {})
  }, [])

  // Safety net: if a response never arrives (main process hang, dropped IPC, app restart
  // mid-request), don't let the UI stay stuck in a "streaming" state forever.
  useEffect(() => {
    if (isStreaming) {
      armWatchdog()
    } else {
      disarmWatchdog()
    }
    return disarmWatchdog
  }, [isStreaming])

  useEffect(() => {
    const unsubscribe = api().onStream((delta) => {
      if (delta.conversationId !== activeConversationId) return

      if (delta.type === 'text' && delta.text) {
        armWatchdog()
        setRetryMessage(null)
        queueText(delta.text)
      } else if (delta.type === 'tool_call_start' && delta.toolCall) {
        armWatchdog()
        setRetryMessage(null)
        flushPendingText()
        addActiveToolCall(delta.toolCall)
      } else if (delta.type === 'tool_call_end' && delta.toolCall) {
        armWatchdog()
        updateActiveToolCall(delta.toolCall)
      } else if (delta.type === 'retry') {
        armWatchdog()
        setRetryMessage(delta.error ?? 'Bağlantı hatası oluştu, tekrar deneniyor...')
      } else if (delta.type === 'done') {
        disarmWatchdog()
        flushPendingText()
        setIsStreaming(false)
        resetStreaming()
        api()
          .getMessages(activeConversationId!)
          .then(setMessages)
          .catch(() => {})
      } else if (delta.type === 'error') {
        disarmWatchdog()
        flushPendingText()
        setIsStreaming(false)
        resetStreaming()
        setLastError(delta.error ?? 'Bilinmeyen bir hata oluştu')
      }
    })
    return unsubscribe
  }, [activeConversationId, messages])

  const handleSubmit = async (sourceType: SourceType, input: string): Promise<void> => {
    const conversation = await api().newConversation(sourceType, input)
    const updated = await api().listConversations()
    setConversations(updated)
    setActiveConversation(conversation.id)
  }

  const handleNewChat = (): void => {
    setActiveConversation(null)
    setMessages([])
  }

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <Sidebar onSelectConversation={(id) => setActiveConversation(id)} onNewChat={handleNewChat} />
      {activeConversationId ? (
        <ChatPage key={activeConversationId} />
      ) : (
        <div className="h-full flex-1">
          <HomePage onSubmit={handleSubmit} />
        </div>
      )}
      <SettingsModal />
    </div>
  )
}
