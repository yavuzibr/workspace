import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { File, Loader2 } from 'lucide-react'
import type { ChatMessage, ToolCallRecord } from '@shared/types'
import { ToolCallIndicator } from './ToolCallIndicator'

interface Props {
  messages: ChatMessage[]
  streamingText: string
  activeToolCalls: ToolCallRecord[]
  isStreaming: boolean
  retryMessage: string | null
}

// Finished messages: full markdown + code syntax highlighting. Memoized so they don't
// re-parse on every streaming update elsewhere in the list — only re-renders when content changes.
const Markdown = memo(function Markdown({ content }: { content: string }): JSX.Element {
  return (
    <div className="md-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  )
})

// While actively streaming: same markdown (headings/bold/lists/tables stay live) but WITHOUT
// rehype-highlight — re-tokenizing code blocks on every partial chunk is what caused the lag.
// Code blocks still render as plain <pre><code> here, then get full syntax highlighting once
// the message is finalized and rendered via <Markdown> above.
function LiveMarkdown({ content }: { content: string }): JSX.Element {
  return (
    <div className="md-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

export function ChatMessages({
  messages,
  streamingText,
  activeToolCalls,
  isStreaming,
  retryMessage
}: Props): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      {messages.map((m) => (
        <div key={m.id} className={m.role === 'user' ? 'self-end' : 'w-full self-start'}>
          {m.role === 'user' ? (
            <div
              className="flex max-w-xl flex-col gap-1.5 rounded-2xl px-4 py-2.5 text-sm"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            >
              {m.content}
              {m.attachedFiles && m.attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.attachedFiles.map((path) => (
                    <span
                      key={path}
                      className="flex items-center gap-1 rounded-full bg-accent-subtle px-2.5 py-1 text-xs text-accent"
                    >
                      <File size={11} />
                      <span className="max-w-[220px] truncate">{path.split('/').pop()}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {m.toolCalls?.map((tc) => (
                <ToolCallIndicator key={tc.id} toolCall={tc} />
              ))}
              <Markdown content={m.content} />
            </div>
          )}
        </div>
      ))}

      {isStreaming && (
        <div className="flex w-full flex-col gap-2">
          {activeToolCalls.map((tc) => (
            <ToolCallIndicator key={tc.id} toolCall={tc} />
          ))}
          {retryMessage && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
              style={{ backgroundColor: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
            >
              <Loader2 size={13} className="animate-spin" />
              <span>{retryMessage}</span>
            </div>
          )}
          {streamingText && <LiveMarkdown content={streamingText} />}
        </div>
      )}
    </div>
  )
}
