import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipcChannels'
import {
  createRepoConversation,
  createYoutubeConversation,
  createHuggingfaceConversation,
  listConversations,
  touchConversation,
  setConversationBranch,
  setConversationHfConfig,
  getConversation,
  deleteConversation
} from '../services/db/repositories/conversationRepo'
import { getMessages } from '../services/db/repositories/messageRepo'
import { getRepoById } from '../services/db/repositories/repoCacheRepo'
import { fetchRepoAndBranches, getRepoTree, isNoisyPath } from '../services/github/repoService'
import { getOrFetchVideo, getVideoById } from '../services/youtube/youtubeService'
import {
  getAvailableConfigs,
  getOrFetchResource,
  getResourceById,
  isNoisyHfPath
} from '../services/huggingface/huggingfaceService'
import { runAgentLoop, type AgentContext } from '../services/llm/agentLoop'
import type { ChatMessage, Conversation, FileTreeEntry, HfKind, SourceType } from '@shared/types'

export function registerChatIpc(): void {
  ipcMain.handle(
    IpcChannels.ChatNewConversation,
    async (_event, sourceType: SourceType, input: string): Promise<Conversation> => {
      if (sourceType === 'youtube') {
        const video = await getOrFetchVideo(input)
        return createYoutubeConversation(video.id, video.title ?? video.url)
      }

      if (sourceType === 'huggingface') {
        const [hfKind, fullName] = input.split(':') as [HfKind, string]
        if ((hfKind !== 'model' && hfKind !== 'dataset') || !fullName) {
          throw new Error('Invalid Hugging Face input')
        }
        const resource = await getOrFetchResource(hfKind, fullName)
        return createHuggingfaceConversation(hfKind, resource.id, resource.fullName)
      }

      const [owner, name] = input.split('/').map((s) => s.trim())
      if (!owner || !name) throw new Error('Expected format: owner/repo')

      const { repo } = await fetchRepoAndBranches(owner, name)
      return createRepoConversation(repo.id, repo.defaultBranch, `${owner}/${name}`)
    }
  )

  ipcMain.handle(IpcChannels.ChatListConversations, async (): Promise<Conversation[]> => {
    return listConversations()
  })

  ipcMain.handle(
    IpcChannels.ChatGetMessages,
    async (_event, conversationId: string): Promise<ChatMessage[]> => {
      return getMessages(conversationId)
    }
  )

  ipcMain.handle(
    IpcChannels.ChatSwitchBranch,
    async (_event, conversationId: string, branch: string): Promise<void> => {
      setConversationBranch(conversationId, branch)
    }
  )

  ipcMain.handle(
    IpcChannels.ChatGetHfSubsets,
    async (_event, conversationId: string): Promise<string[]> => {
      const conversation = getConversation(conversationId)
      if (!conversation || !conversation.hfKind || !conversation.hfFullName) return []
      const resource = getResourceById(`${conversation.hfKind}:${conversation.hfFullName}`)
      if (!resource) return []
      return getAvailableConfigs(resource)
    }
  )

  ipcMain.handle(
    IpcChannels.ChatSetHfSubset,
    async (_event, conversationId: string, config: string | null): Promise<void> => {
      setConversationHfConfig(conversationId, config)
    }
  )

  ipcMain.handle(
    IpcChannels.ChatDeleteConversation,
    async (_event, conversationId: string): Promise<void> => {
      deleteConversation(conversationId)
    }
  )

  ipcMain.handle(
    IpcChannels.ChatGetFileTree,
    async (_event, conversationId: string, branch: string): Promise<FileTreeEntry[]> => {
      const conversation = getConversation(conversationId)
      if (!conversation) throw new Error('Conversation not found')

      if (conversation.sourceType === 'huggingface') {
        if (!conversation.hfKind || !conversation.hfFullName) throw new Error('Resource not found')
        const resource = getResourceById(`${conversation.hfKind}:${conversation.hfFullName}`)
        if (!resource) throw new Error('Resource not found')

        return resource.files.map((f) => ({
          path: f.path,
          type: 'blob',
          readable: !isNoisyHfPath(f.path)
        }))
      }

      if (!conversation.repoId) throw new Error('Conversation not found')
      const repo = getRepoById(conversation.repoId)
      if (!repo) throw new Error('Repo not found')

      const { entries } = await getRepoTree(repo, branch)
      return entries.map((e) => ({ path: e.path, type: e.type, readable: !isNoisyPath(e.path) }))
    }
  )

  ipcMain.on(
    IpcChannels.ChatSendMessage,
    async (event, conversationId: string, text: string, filePaths: string[] = []) => {
      try {
        const conversation = getConversation(conversationId)
        if (!conversation) throw new Error('Conversation not found')

        touchConversation(conversationId)

        if (conversation.sourceType === 'youtube') {
          if (!conversation.videoId) throw new Error('Conversation has no video')
          const video = getVideoById(conversation.videoId)
          if (!video) throw new Error('Video not found in cache')

          const ctx: AgentContext = { kind: 'youtube', video }
          await runAgentLoop(event.sender, conversation, ctx, text)
          return
        }

        if (conversation.sourceType === 'huggingface') {
          if (!conversation.hfKind || !conversation.hfFullName) {
            throw new Error('Conversation has no Hugging Face resource')
          }
          const resourceId = `${conversation.hfKind}:${conversation.hfFullName}`
          const resource = getResourceById(resourceId)
          if (!resource) throw new Error('Hugging Face resource not found in cache')

          const ctx: AgentContext = {
            kind: 'huggingface',
            hfKind: conversation.hfKind,
            resource,
            config: conversation.hfConfig
          }
          await runAgentLoop(event.sender, conversation, ctx, text, filePaths)
          return
        }

        if (!conversation.repoId) throw new Error('Conversation has no repo')
        const repo = getRepoById(conversation.repoId)
        if (!repo) throw new Error('Repo not found in cache')

        const { branches } = await fetchRepoAndBranches(repo.owner, repo.name)
        const ctx: AgentContext = { kind: 'repo', repo, branches }
        await runAgentLoop(event.sender, conversation, ctx, text, filePaths)
      } catch (err) {
        console.error('[chat:sendMessage] error:', err instanceof Error ? err.message : String(err))
        event.sender.send(IpcChannels.ChatStream, {
          conversationId,
          type: 'error',
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }
  )
}
