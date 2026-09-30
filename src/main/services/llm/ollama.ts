import OpenAI from 'openai'
import type { OpenRouterModel } from '@shared/types'

const OLLAMA_BASE_URL = 'http://localhost:11434'

export function getOllamaClient(): OpenAI {
  return new OpenAI({
    apiKey: 'ollama',
    baseURL: `${OLLAMA_BASE_URL}/v1`,
    timeout: 120_000,
    maxRetries: 0
  })
}

export async function listOllamaModels(): Promise<OpenRouterModel[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
  if (!res.ok) throw new Error(`Failed to list Ollama models: ${res.status}`)
  const json = (await res.json()) as { models?: { model: string; name: string }[] }
  return (json.models ?? []).map((m) => ({ id: m.model, name: m.name }))
}

export function isOllamaConnectionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  const cause = (err as { cause?: { code?: string } })?.cause
  return (
    message.includes('ECONNREFUSED') ||
    message.includes('fetch failed') ||
    cause?.code === 'ECONNREFUSED'
  )
}
