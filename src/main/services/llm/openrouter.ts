import OpenAI from 'openai'
import { getSecret } from '../secrets/keychain'
import type { OpenRouterModel } from '@shared/types'

export function getOpenRouterClient(): OpenAI {
  const apiKey = getSecret('openrouterKey') ?? ''
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    timeout: 60_000,
    maxRetries: 1,
    defaultHeaders: {
      'HTTP-Referer': 'https://workspace.local',
      'X-Title': 'Workspace'
    }
  })
}

export async function listOpenRouterModels(): Promise<OpenRouterModel[]> {
  const apiKey = getSecret('openrouterKey') ?? ''
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
  })
  if (!res.ok) throw new Error(`Failed to list models: ${res.status}`)
  const json = (await res.json()) as { data: { id: string; name: string }[] }
  return json.data.map((m) => ({ id: m.id, name: m.name }))
}
