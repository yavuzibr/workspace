import { useEffect, useState, type CSSProperties } from 'react'
import { api } from '../api/client'
import { useAppStore } from '../state/store'
import type { LlmProvider, OpenRouterModel } from '@shared/types'

export function SettingsModal(): JSX.Element | null {
  const { settingsOpen, setSettingsOpen, setProvider, setModel, setOllamaModel } = useAppStore()
  const [githubToken, setGithubToken] = useState('')
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [provider, setProviderDraft] = useState<LlmProvider>('openrouter')
  const [model, setModelDraft] = useState('')
  const [ollamaModel, setOllamaModelDraft] = useState('')
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [ollamaModels, setOllamaModels] = useState<OpenRouterModel[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!settingsOpen) return
    api()
      .getSettings()
      .then((s) => {
        if (s.model) setModelDraft(s.model)
        if (s.ollamaModel) setOllamaModelDraft(s.ollamaModel)
        if (s.provider) setProviderDraft(s.provider)
      })
    api()
      .listModels()
      .then(setModels)
      .catch(() => {})
    api()
      .listOllamaModels()
      .then(setOllamaModels)
      .catch(() => setOllamaModels([]))
  }, [settingsOpen])

  if (!settingsOpen) return null

  const pillStyle = (active: boolean): CSSProperties => ({
    backgroundColor: active ? 'var(--bg-surface-2)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)'
  })

  const handleSave = async (): Promise<void> => {
    await api().setSettings({
      githubToken: githubToken || undefined,
      openrouterKey: openrouterKey || undefined,
      model: model || undefined,
      provider,
      ollamaModel: ollamaModel || undefined
    })
    setProvider(provider)
    setModel(model)
    setOllamaModel(ollamaModel)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-md rounded-xl p-6 shadow-xl"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h2>

        <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
          GitHub Personal Access Token
        </label>
        <input
          type="password"
          value={githubToken}
          onChange={(e) => setGithubToken(e.target.value)}
          placeholder="ghp_..."
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)'
          }}
        />

        <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
          LLM Sağlayıcı
        </label>
        <div
          className="mb-4 flex items-center gap-0.5 rounded-full border p-0.5"
          style={{ borderColor: 'var(--border-color)', width: 'fit-content' }}
        >
          <button
            onClick={() => setProviderDraft('openrouter')}
            className="rounded-full px-3 py-1.5 text-xs"
            style={pillStyle(provider === 'openrouter')}
          >
            OpenRouter
          </button>
          <button
            onClick={() => setProviderDraft('ollama')}
            className="rounded-full px-3 py-1.5 text-xs"
            style={pillStyle(provider === 'ollama')}
          >
            Ollama (yerel)
          </button>
        </div>

        <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
          OpenRouter API Key
        </label>
        <input
          type="password"
          value={openrouterKey}
          onChange={(e) => setOpenrouterKey(e.target.value)}
          placeholder="sk-or-..."
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)'
          }}
        />

        <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
          OpenRouter Model
        </label>
        <input
          type="text"
          list="openrouter-models"
          value={model}
          onChange={(e) => setModelDraft(e.target.value)}
          placeholder="google/gemma-3-27b-it:free"
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)'
          }}
        />
        <datalist id="openrouter-models">
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </datalist>

        <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
          Yerel Model (Ollama)
        </label>
        <input
          type="text"
          list="ollama-models"
          value={ollamaModel}
          onChange={(e) => setOllamaModelDraft(e.target.value)}
          placeholder="llama3.1:8b"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)'
          }}
        />
        <datalist id="ollama-models">
          {ollamaModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </datalist>
        <p className="mb-6 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Sağlayıcı "Ollama" iken doğrudan kullanılır. Sağlayıcı "OpenRouter" iken, OpenRouter yanıt
          vermezse otomatik yedek olarak devreye girer. Boşsa yedekleme yapılmaz.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded-lg px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-white px-4 py-2 text-sm text-black hover:bg-gray-200"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
