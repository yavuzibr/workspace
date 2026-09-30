import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'
import { getSecret, setSecret } from '../services/secrets/keychain'
import { listOpenRouterModels } from '../services/llm/openrouter'
import { listOllamaModels } from '../services/llm/ollama'
import { resetOctokitClient } from '../services/github/client'
import type { SettingsPayload, OpenRouterModel, LlmProvider } from '@shared/types'

export function registerSettingsIpc(): void {
  ipcMain.handle(IpcChannels.SettingsGet, async (): Promise<SettingsPayload> => {
    return {
      githubToken: getSecret('githubToken') ? '••••••••' : undefined,
      openrouterKey: getSecret('openrouterKey') ? '••••••••' : undefined,
      model: getSecret('model') ?? undefined,
      provider: (getSecret('provider') as LlmProvider | null) ?? 'openrouter',
      ollamaModel: getSecret('ollamaModel') ?? undefined
    }
  })

  ipcMain.handle(
    IpcChannels.SettingsSet,
    async (_event, payload: SettingsPayload): Promise<void> => {
      if (payload.githubToken !== undefined && !payload.githubToken.includes('•')) {
        setSecret('githubToken', payload.githubToken)
        resetOctokitClient()
      }
      if (payload.openrouterKey !== undefined && !payload.openrouterKey.includes('•')) {
        setSecret('openrouterKey', payload.openrouterKey)
      }
      if (payload.model !== undefined) {
        setSecret('model', payload.model)
      }
      if (payload.provider !== undefined) {
        setSecret('provider', payload.provider)
      }
      if (payload.ollamaModel !== undefined) {
        setSecret('ollamaModel', payload.ollamaModel)
      }
    }
  )

  ipcMain.handle(IpcChannels.SettingsListModels, async (): Promise<OpenRouterModel[]> => {
    return listOpenRouterModels()
  })

  ipcMain.handle(IpcChannels.SettingsListOllamaModels, async (): Promise<OpenRouterModel[]> => {
    return listOllamaModels()
  })
}
