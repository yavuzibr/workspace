import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import type { VideoRecord } from '../youtube/youtubeService'
import { getTranscriptRange } from '../youtube/youtubeService'

export const youtubeToolSchemas: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_video_summary',
      description: 'Get video title, channel and duration. Call this first.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_transcript',
      description:
        'Get the timestamped transcript of the video, optionally limited to a time range in seconds. Omit both params to get the full transcript (large transcripts are truncated).',
      parameters: {
        type: 'object',
        properties: {
          start_seconds: { type: 'number' },
          end_seconds: { type: 'number' }
        },
        required: []
      }
    }
  }
]

export interface YoutubeToolContext {
  video: VideoRecord
}

export async function dispatchYoutubeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: YoutubeToolContext
): Promise<string> {
  switch (name) {
    case 'get_video_summary':
      return JSON.stringify({
        title: ctx.video.title,
        channel: ctx.video.channel,
        durationSeconds: ctx.video.durationSeconds,
        url: ctx.video.url
      })
    case 'get_transcript': {
      const startSeconds = args.start_seconds as number | undefined
      const endSeconds = args.end_seconds as number | undefined
      return getTranscriptRange(ctx.video, startSeconds, endSeconds)
    }
    default:
      return `Unknown tool: ${name}`
  }
}
