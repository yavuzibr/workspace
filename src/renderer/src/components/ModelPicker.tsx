import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAppStore } from '../state/store'
import { api } from '../api/client'
import type { OpenRouterModel } from '@shared/types'

export function ModelPicker(): JSX.Element {
  const { model, setModel, provider, setProvider, ollamaModel, setOllamaModel } = useAppStore()
  const isOllama = provider === 'ollama'
  const activeModel = isOllama ? ollamaModel : model

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(activeModel)
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api()
      .getSettings()
      .then((s) => {
        if (s.model) setModel(s.model)
        if (s.ollamaModel) setOllamaModel(s.ollamaModel)
        if (s.provider) setProvider(s.provider)
      })
      .catch(() => {})
  }, [])

  useEffect(() => setDraft(activeModel), [activeModel])

  useEffect(() => {
    if (!open) return
    ;(isOllama ? api().listOllamaModels() : api().listModels())
      .then(setModels)
      .catch(() => setModels([]))

    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, isOllama])

  const applyModel = async (next: string): Promise<void> => {
    const trimmed = next.trim()
    if (!trimmed || trimmed === activeModel) {
      setOpen(false)
      return
    }
    setOpen(false)
    if (isOllama) {
      setOllamaModel(trimmed)
      await api().setSettings({ ollamaModel: trimmed })
    } else {
      setModel(trimmed)
      await api().setSettings({ model: trimmed })
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--bg-surface-2)]"
        style={{ color: 'var(--text-secondary)' }}
        title={isOllama ? 'Yerel model seç (Ollama)' : 'Model seç'}
      >
        <span className="max-w-[140px] truncate">{activeModel || 'Model seç'}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 z-10 mb-2 w-64 rounded-xl border p-2 shadow-elevated-lg"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface-2)' }}
        >
          <input
            autoFocus
            type="text"
            list="model-picker-options"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyModel(draft)
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder={isOllama ? 'llama3.1:8b' : 'google/gemma-3-27b-it:free'}
            className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)'
            }}
          />
          <datalist id="model-picker-options">
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </datalist>
          <button
            onClick={() => applyModel(draft)}
            className="mt-2 w-full rounded-lg bg-accent px-2.5 py-1.5 text-xs text-accent-fg transition-colors hover:bg-accent-hover"
          >
            Kullan
          </button>
        </div>
      )}
    </div>
  )
}
