import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'
import { getOrFetchVideo, toVideoSummary } from '../services/youtube/youtubeService'
import type { VideoSummary } from '@shared/types'

export function registerYoutubeIpc(): void {
  ipcMain.handle(
    IpcChannels.YoutubeFetchVideo,
    async (_event, url: string): Promise<VideoSummary> => {
      const video = await getOrFetchVideo(url)
      return toVideoSummary(video)
    }
  )
}
