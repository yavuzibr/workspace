import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'
import { getOrFetchResource, toResourceSummary } from '../services/huggingface/huggingfaceService'
import type { HfKind, HfResourceSummary } from '@shared/types'

export function registerHuggingfaceIpc(): void {
  ipcMain.handle(
    IpcChannels.HuggingfaceFetchResource,
    async (_event, kind: HfKind, fullName: string): Promise<HfResourceSummary> => {
      const resource = await getOrFetchResource(kind, fullName)
      return toResourceSummary(resource)
    }
  )
}
