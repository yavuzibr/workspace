import { useState, type CSSProperties } from 'react'
import { Folder, Youtube } from 'lucide-react'
import { PromptBar } from '../components/PromptBar'
import { ModelPicker } from '../components/ModelPicker'
import { Mascot } from '../components/Mascot'
import type { HfKind, SourceType } from '@shared/types'

interface Props {
  onSubmit: (sourceType: SourceType, input: string) => Promise<void>
}

const YOUTUBE_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{11}/

export function HomePage({ onSubmit }: Props): JSX.Element {
  const [mode, setMode] = useState<SourceType>('repo')
  const [hfKind, setHfKind] = useState<HfKind>('model')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (text: string): Promise<void> => {
    setError(null)

    if (mode === 'repo' && !/^[\w.-]+\/[\w.-]+$/.test(text)) {
      setError('Format: kullanici-adi/repo-adi')
      return
    }
    if (mode === 'youtube' && !YOUTUBE_URL_PATTERN.test(text)) {
      setError('Geçerli bir YouTube video linki gir')
      return
    }
    if (mode === 'huggingface' && !/^[\w.-]+\/[\w.-]+$/.test(text)) {
      setError('Format: saglayici/isim')
      return
    }

    setLoading(true)
    try {
      const input = mode === 'huggingface' ? `${hfKind}:${text}` : text
      await onSubmit(mode, input)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const pillStyle = (active: boolean): CSSProperties => ({
    backgroundColor: active ? 'var(--accent-subtle)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)'
  })

  const modeSwitcher = (
    <div
      className="flex items-center gap-0.5 rounded-full border p-0.5"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <button
        onClick={() => {
          setMode('repo')
          setError(null)
        }}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
        style={pillStyle(mode === 'repo')}
      >
        <Folder size={13} /> Repo
      </button>
      <button
        onClick={() => {
          setMode('youtube')
          setError(null)
        }}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
        style={pillStyle(mode === 'youtube')}
      >
        <Youtube size={13} /> YouTube
      </button>
      <button
        onClick={() => {
          setMode('huggingface')
          setError(null)
        }}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
        style={pillStyle(mode === 'huggingface')}
      >
        <span>🤗</span> Hugging Face
      </button>
    </div>
  )

  const hfKindSwitcher = mode === 'huggingface' && (
    <div
      className="flex items-center gap-0.5 rounded-full border p-0.5"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <button
        onClick={() => setHfKind('model')}
        className="rounded-full px-2.5 py-1 text-xs"
        style={pillStyle(hfKind === 'model')}
      >
        Model
      </button>
      <button
        onClick={() => setHfKind('dataset')}
        className="rounded-full px-2.5 py-1 text-xs"
        style={pillStyle(hfKind === 'dataset')}
      >
        Dataset
      </button>
    </div>
  )

  const titles: Record<SourceType, string> = {
    repo: 'Bir repo ile konuş',
    youtube: 'Bir YouTube videosu ile konuş',
    huggingface:
      hfKind === 'model'
        ? 'Bir Hugging Face modeliyle konuş'
        : "Bir Hugging Face dataset'iyle konuş"
  }

  const placeholders: Record<SourceType, string> = {
    repo: 'facebook/react',
    youtube: 'https://www.youtube.com/watch?v=...',
    huggingface: hfKind === 'model' ? 'distilbert/distilbert-base-uncased' : 'stanfordnlp/imdb'
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <div
            className="absolute h-48 w-48 rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, var(--accent-subtle), transparent 70%)'
            }}
          />
          <Mascot size={72} className="relative" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {titles[mode]}
          </h1>
          <p className="max-w-md text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'repo' && (
              <>
                GitHub reposunu{' '}
                <code style={{ color: 'var(--text-primary)' }}>kullanici-adi/repo-adi</code>{' '}
                formatında gir, indirmeden mimarisini ve özelliklerini sorabilirsin.
              </>
            )}
            {mode === 'youtube' && (
              <>
                Bir YouTube video linki yapıştır, videoyu izlemeden içeriği hakkında sorular
                sorabilirsin.
              </>
            )}
            {mode === 'huggingface' && (
              <>
                Hugging Face {hfKind === 'model' ? 'modelini' : "dataset'ini"}{' '}
                <code style={{ color: 'var(--text-primary)' }}>saglayici/isim</code> formatında gir,
                indirmeden kart/{hfKind === 'dataset' ? 'örnek veri' : 'dosya yapısı'} hakkında
                sorular sorabilirsin.
              </>
            )}
          </p>
        </div>
      </div>

      {hfKindSwitcher}

      <div className="w-full max-w-xl">
        <PromptBar
          placeholder={placeholders[mode]}
          onSubmit={handleSubmit}
          disabled={loading}
          leftSlot={modeSwitcher}
          rightSlot={<ModelPicker />}
        />
      </div>
      {loading && (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {mode === 'repo' && 'Repo yükleniyor...'}
          {mode === 'youtube' && 'Video ve transkript yükleniyor...'}
          {mode === 'huggingface' && 'Kart ve dosya bilgisi yükleniyor...'}
        </span>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
