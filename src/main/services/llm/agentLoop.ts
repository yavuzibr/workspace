import type { WebContents } from 'electron'
import type OpenAI from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool
} from 'openai/resources/chat/completions'
import { getOpenRouterClient } from './openrouter'
import { getOllamaClient, isOllamaConnectionError } from './ollama'
import { repoToolSchemas, dispatchRepoTool } from './repoTools'
import { youtubeToolSchemas, dispatchYoutubeTool } from './youtubeTools'
import { huggingfaceToolSchemas, dispatchHuggingfaceTool } from './huggingfaceTools'
import {
  buildRepoSystemPrompt,
  buildYoutubeSystemPrompt,
  buildHuggingfaceSystemPrompt
} from './systemPrompt'
import { addMessage, getMessages } from '../db/repositories/messageRepo'
import { getSecret } from '../secrets/keychain'
import { getFileContent } from '../github/repoService'
import type { VideoRecord } from '../youtube/youtubeService'
import type { HfResourceRecord } from '../huggingface/huggingfaceService'
import { getHfFileContent } from '../huggingface/huggingfaceService'
import type { Conversation, HfKind, Repo, StreamDelta, ToolCallRecord } from '@shared/types'
import { IpcChannels } from '@shared/ipcChannels'

const MAX_ITERATIONS = 15
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
const DEFAULT_RETRY_DELAY_MS = 1500
const MAX_RETRY_DELAY_MS = 60_000
const STREAM_IDLE_TIMEOUT_MS = 45_000

interface CompletionAttemptResult {
  textAcc: string
  toolCallAcc: Map<number, { id: string; name: string; args: string }>
}

async function runCompletionAttempt(
  client: OpenAI,
  model: string,
  messages: ChatCompletionMessageParam[],
  toolSchemas: ChatCompletionTool[],
  onText: (text: string) => void,
  nonStreaming = false
): Promise<CompletionAttemptResult> {
  // Some local models served via Ollama don't reliably populate structured `tool_calls`
  // when streaming is combined with `tools` — the tool call leaks out as raw text instead
  // (e.g. "<tool_call>{...}</tool_call>"). Non-streaming mode gets properly parsed tool_calls.
  if (nonStreaming) {
    const completion = await client.chat.completions.create({
      model,
      messages,
      tools: toolSchemas,
      stream: false
    })

    const message = completion.choices[0]?.message
    const textAcc = message?.content ?? ''
    if (textAcc) onText(textAcc)

    const toolCallAcc = new Map<number, { id: string; name: string; args: string }>()
    message?.tool_calls?.forEach((tc, idx) => {
      toolCallAcc.set(idx, {
        id: tc.id,
        name: tc.function.name,
        args: tc.function.arguments
      })
    })

    return { textAcc, toolCallAcc }
  }

  const stream = await client.chat.completions.create({
    model,
    messages,
    tools: toolSchemas,
    stream: true
  })

  let textAcc = ''
  const toolCallAcc = new Map<number, { id: string; name: string; args: string }>()
  const iterator = stream[Symbol.asyncIterator]()

  while (true) {
    const timeoutPromise = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), STREAM_IDLE_TIMEOUT_MS)
    )
    const result = await Promise.race([iterator.next(), timeoutPromise])

    if (result === 'timeout') {
      void iterator.return?.().catch(() => {})
      throw new Error('Stream bir süredir veri göndermiyor (idle timeout)')
    }
    if (result.done) break

    const delta = result.value.choices[0]?.delta

    if (delta?.content) {
      textAcc += delta.content
      onText(delta.content)
    }

    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index
        const existing = toolCallAcc.get(idx) ?? { id: tc.id ?? '', name: '', args: '' }
        if (tc.id) existing.id = tc.id
        if (tc.function?.name) existing.name += tc.function.name
        if (tc.function?.arguments) existing.args += tc.function.arguments
        toolCallAcc.set(idx, existing)
      }
    }
  }

  return { textAcc, toolCallAcc }
}

function isRetryableError(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status
  if (typeof status === 'number') return RETRYABLE_STATUS.has(status)
  // No status at all usually means a connection-level failure (timeout, DNS, refused) — also worth retrying/falling back.
  return true
}

function getRetryDelayMs(err: unknown): number {
  const status = (err as { status?: number } | null)?.status
  if (status !== 429) return DEFAULT_RETRY_DELAY_MS

  try {
    const raw = (err as { error?: { metadata?: { raw?: string } } })?.error?.metadata?.raw
    if (!raw) return DEFAULT_RETRY_DELAY_MS

    const parsed = JSON.parse(raw) as {
      error?: { details?: { '@type'?: string; retryDelay?: string }[] }
    }
    const retryInfo = parsed.error?.details?.find((d) => d['@type']?.includes('RetryInfo'))
    const match = retryInfo?.retryDelay?.match(/^(\d+(?:\.\d+)?)s$/)
    if (match) {
      const seconds = parseFloat(match[1])
      return Math.min(Math.ceil(seconds * 1000) + 500, MAX_RETRY_DELAY_MS)
    }
  } catch {
    // fall through to default
  }

  return DEFAULT_RETRY_DELAY_MS
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Logs only the message, never the raw error object — provider SDK errors (Octokit, OpenAI)
// can carry request/auth headers, so printing them whole risks leaking secrets into logs.
function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function formatRetryMessage(delayMs: number): string {
  if (delayMs < 3000) return 'Bağlantı hatası oluştu, tekrar deneniyor...'
  const seconds = Math.round(delayMs / 1000)
  return `Sağlayıcı geçici olarak kota sınırına takıldı, ${seconds} saniye içinde tekrar denenecek...`
}

export type AgentContext =
  | { kind: 'repo'; repo: Repo; branches: string[] }
  | { kind: 'youtube'; video: VideoRecord }
  | { kind: 'huggingface'; hfKind: HfKind; resource: HfResourceRecord; config: string | null }

function send(webContents: WebContents, delta: StreamDelta): void {
  webContents.send(IpcChannels.ChatStream, delta)
}

// Tool names that let the model browse or read files OTHER than the ones the user explicitly
// attached. These are dropped when the user attaches file(s), so the model can't wander off
// into unrelated same-named files and burn tokens instead of just using what was handed to it.
const FILE_BROWSING_TOOLS = new Set(['get_repo_tree', 'read_file', 'list_files'])

function getToolSchemas(ctx: AgentContext, hasAttachedFiles: boolean): ChatCompletionTool[] {
  const schemas =
    ctx.kind === 'repo'
      ? repoToolSchemas
      : ctx.kind === 'youtube'
        ? youtubeToolSchemas
        : huggingfaceToolSchemas(ctx.hfKind)

  if (!hasAttachedFiles) return schemas
  return schemas.filter((s) => !FILE_BROWSING_TOOLS.has(s.function.name))
}

async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AgentContext
): Promise<string> {
  if (ctx.kind === 'repo') {
    return dispatchRepoTool(name, args, { repo: ctx.repo, branches: ctx.branches })
  }
  if (ctx.kind === 'youtube') {
    return dispatchYoutubeTool(name, args, { video: ctx.video })
  }
  return dispatchHuggingfaceTool(name, args, {
    kind: ctx.hfKind,
    resource: ctx.resource,
    config: ctx.config
  })
}

const MEMORY_NOTE = `

Conversation memory: the full results of tools you called earlier in this conversation are preserved in the message history above (as prior tool calls/results). Reuse that information for follow-up questions instead of calling the same tool again. Only call a tool again if you need genuinely new information that isn't already available in this conversation (e.g. a different file, a different time range/split, or the user is asking about something not yet fetched).`

function buildAttachedFilesNote(attachedFilePaths: string[]): string {
  if (attachedFilePaths.length === 0) return ''
  const list = attachedFilePaths.map((p) => `\`${p}\``).join(', ')
  return `\n\nThe user has explicitly attached the following file(s) for this message: ${list}. Their full content is included below as attached-file messages. Answer using ONLY that attached content — do not call any file-browsing/reading tool to look at other files this turn, even if another file with a similar or identical name exists elsewhere. You may still mention in your answer that another file looks relevant and suggest the user attach it, but do not read it yourself.`
}

function buildContextSystemPrompt(ctx: AgentContext, attachedFilePaths: string[]): string {
  const attachedNote = buildAttachedFilesNote(attachedFilePaths)
  if (ctx.kind === 'repo') {
    return (
      buildRepoSystemPrompt(ctx.repo.owner, ctx.repo.name, ctx.repo.defaultBranch) +
      MEMORY_NOTE +
      attachedNote
    )
  }
  if (ctx.kind === 'youtube') {
    return (
      buildYoutubeSystemPrompt(ctx.video.title, ctx.video.channel, ctx.video.durationSeconds) +
      MEMORY_NOTE +
      attachedNote
    )
  }
  return (
    buildHuggingfaceSystemPrompt(ctx.hfKind, ctx.resource.fullName, ctx.config) +
    MEMORY_NOTE +
    attachedNote
  )
}

export async function runAgentLoop(
  webContents: WebContents,
  conversation: Conversation,
  ctx: AgentContext,
  userText: string,
  attachedFilePaths: string[] = []
): Promise<void> {
  const provider = getSecret('provider') ?? 'openrouter'
  const ollamaModel = getSecret('ollamaModel') ?? null

  let model =
    provider === 'ollama'
      ? (ollamaModel ?? 'llama3.1:8b')
      : (getSecret('model') ?? 'openai/gpt-4o-mini')
  let client = provider === 'ollama' ? getOllamaClient() : getOpenRouterClient()
  let usingFallback = provider === 'ollama'

  addMessage(conversation.id, 'user', userText, null, attachedFilePaths)

  let iterations = 0
  let finalText = ''
  const allToolCalls: ToolCallRecord[] = []

  try {
    const history = getMessages(conversation.id)
    const priorHistory = history.slice(0, -1)

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: buildContextSystemPrompt(ctx, attachedFilePaths) },
      ...priorHistory.flatMap((m) => toOpenAiMessages(m))
    ]

    if (ctx.kind === 'repo') {
      for (const path of attachedFilePaths) {
        const { content } = await getFileContent(ctx.repo, conversation.branch, path)
        messages.push({
          role: 'user',
          content: `Attached file \`${path}\` (branch ${conversation.branch}):\n\n\`\`\`\n${content}\n\`\`\``
        })
      }
    } else if (ctx.kind === 'huggingface') {
      for (const path of attachedFilePaths) {
        const content = await getHfFileContent(ctx.resource, path)
        messages.push({
          role: 'user',
          content: `Attached file \`${path}\` (${ctx.resource.fullName}):\n\n\`\`\`\n${content}\n\`\`\``
        })
      }
    }

    messages.push({ role: 'user', content: userText })

    const toolSchemas = getToolSchemas(ctx, attachedFilePaths.length > 0)
    let emptyResponseRetried = false

    while (iterations < MAX_ITERATIONS) {
      iterations++

      const onText = (text: string): void => {
        send(webContents, { conversationId: conversation.id, type: 'text', text })
      }

      let attempt: CompletionAttemptResult
      try {
        attempt = await runCompletionAttempt(
          client,
          model,
          messages,
          toolSchemas,
          onText,
          usingFallback
        )
      } catch (err) {
        if (!isRetryableError(err)) throw err

        const delayMs = getRetryDelayMs(err)
        console.error(
          `[agentLoop] retryable error, retrying once after ${delayMs}ms:`,
          errMessage(err)
        )
        send(webContents, {
          conversationId: conversation.id,
          type: 'retry',
          error: formatRetryMessage(delayMs)
        })
        await sleep(delayMs)

        try {
          attempt = await runCompletionAttempt(
            client,
            model,
            messages,
            toolSchemas,
            onText,
            usingFallback
          )
        } catch (retryErr) {
          if (usingFallback || !ollamaModel) throw retryErr

          console.error(
            '[agentLoop] provider still failing, falling back to local Ollama model:',
            errMessage(retryErr)
          )
          send(webContents, {
            conversationId: conversation.id,
            type: 'retry',
            error: `Sağlayıcı yanıt vermiyor, yerel model (${ollamaModel}) ile devam ediliyor...`
          })

          client = getOllamaClient()
          model = ollamaModel
          usingFallback = true

          try {
            attempt = await runCompletionAttempt(client, model, messages, toolSchemas, onText, true)
          } catch (fallbackErr) {
            if (isOllamaConnectionError(fallbackErr)) {
              throw new Error(
                `Yerel Ollama modeline de ulaşılamadı. "ollama serve" çalışıyor mu ve "${ollamaModel}" indirilmiş mi kontrol et.`
              )
            }
            throw fallbackErr
          }
        }
      }

      const { textAcc, toolCallAcc } = attempt

      if (toolCallAcc.size === 0) {
        if (!textAcc.trim() && !emptyResponseRetried) {
          emptyResponseRetried = true
          iterations--
          console.error('[agentLoop] model returned an empty response, retrying once')
          send(webContents, {
            conversationId: conversation.id,
            type: 'retry',
            error: 'Model boş bir cevap döndürdü, tekrar deneniyor...'
          })
          await sleep(DEFAULT_RETRY_DELAY_MS)
          continue
        }
        finalText = textAcc
        break
      }

      const assistantToolCalls: ChatCompletionMessageToolCall[] = Array.from(
        toolCallAcc.values()
      ).map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.args }
      }))

      messages.push({
        role: 'assistant',
        content: textAcc || null,
        tool_calls: assistantToolCalls
      })

      for (const tc of assistantToolCalls) {
        let args: Record<string, unknown> = {}
        try {
          args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
        } catch {
          args = {}
        }

        const record: ToolCallRecord = { id: tc.id, name: tc.function.name, args }
        send(webContents, {
          conversationId: conversation.id,
          type: 'tool_call_start',
          toolCall: record
        })

        let result: string
        try {
          result = await dispatchTool(tc.function.name, args, ctx)
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`
        }

        record.result = result
        allToolCalls.push(record)

        send(webContents, {
          conversationId: conversation.id,
          type: 'tool_call_end',
          toolCall: record
        })

        messages.push({ role: 'tool', tool_call_id: tc.id, content: result })
      }
    }

    if (!finalText) {
      finalText =
        iterations >= MAX_ITERATIONS
          ? "I've reached the maximum number of steps for this question. Try narrowing your question."
          : 'Model boş bir cevap döndürdü. Lütfen tekrar dener misin, sorun devam ederse farklı bir model seçmeyi dene.'
    }

    const saved = addMessage(conversation.id, 'assistant', finalText, allToolCalls)
    send(webContents, {
      conversationId: conversation.id,
      type: 'done',
      messageId: saved.id
    })
  } catch (err) {
    console.error('[agentLoop] error:', errMessage(err))
    const message = isOllamaConnectionError(err)
      ? `Ollama'ya bağlanılamadı. "ollama serve" çalışıyor mu ve model indirilmiş mi ("ollama pull <model>") kontrol et.`
      : err instanceof Error
        ? err.message
        : String(err)
    send(webContents, { conversationId: conversation.id, type: 'error', error: message })
  }
}

function toOpenAiMessages(m: {
  role: string
  content: string
  toolCalls: ToolCallRecord[] | null
}): ChatCompletionMessageParam[] {
  if (m.role === 'user') return [{ role: 'user', content: m.content }]

  if (m.toolCalls && m.toolCalls.length > 0) {
    const assistantToolCalls: ChatCompletionMessageToolCall[] = m.toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.name, arguments: JSON.stringify(tc.args) }
    }))

    return [
      { role: 'assistant', content: null, tool_calls: assistantToolCalls },
      ...m.toolCalls.map((tc): ChatCompletionMessageParam => ({
        role: 'tool',
        tool_call_id: tc.id,
        content: tc.result ?? ''
      })),
      { role: 'assistant', content: m.content }
    ]
  }

  return [{ role: 'assistant', content: m.content }]
}
