import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowUp, File, X } from 'lucide-react'

const MAX_HEIGHT_PX = 240

interface Props {
  placeholder: string
  onSubmit: (text: string) => void
  disabled?: boolean
  selectedFiles?: string[]
  onRemoveFile?: (path: string) => void
  leftSlot?: ReactNode
  rightSlot?: ReactNode
}

export function PromptBar({
  placeholder,
  onSubmit,
  disabled,
  selectedFiles = [],
  onRemoveFile,
  leftSlot,
  rightSlot
}: Props): JSX.Element {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [value])

  const submit = (): void => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-2xl border border-[var(--border-color)] px-4 py-3 shadow-elevated transition-shadow focus-within:border-accent focus-within:ring-2 focus-within:ring-[var(--accent-ring)]"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedFiles.map((path) => (
            <span
              key={path}
              className="flex items-center gap-1 rounded-full bg-accent-subtle px-2.5 py-1 text-xs text-accent"
            >
              <File size={11} />
              <span className="max-w-[160px] truncate">{path.split('/').pop()}</span>
              {onRemoveFile && (
                <button onClick={() => onRemoveFile(path)} className="opacity-70 hover:opacity-100">
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className="w-full resize-none overflow-y-auto bg-transparent text-sm outline-none"
        style={{ color: 'var(--text-primary)', maxHeight: `${MAX_HEIGHT_PX}px` }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">{leftSlot}</div>
        <div className="flex items-center gap-2">
          {rightSlot}
          <button
            onClick={submit}
            disabled={disabled || !value.trim()}
            className="rounded-full bg-accent p-2 text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:hover:bg-accent"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
