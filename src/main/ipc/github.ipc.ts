import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'
import { fetchRepoAndBranches } from '../services/github/repoService'
import type { FetchRepoResult } from '@shared/types'

export function registerGithubIpc(): void {
  ipcMain.handle(
    IpcChannels.GithubFetchRepo,
    async (_event, ownerRepo: string): Promise<FetchRepoResult> => {
      const [owner, name] = ownerRepo.split('/').map((s) => s.trim())
      if (!owner || !name) {
        throw new Error('Expected format: owner/repo')
      }
      const { repo, branches } = await fetchRepoAndBranches(owner, name)
      return { repo, branches }
    }
  )
}
