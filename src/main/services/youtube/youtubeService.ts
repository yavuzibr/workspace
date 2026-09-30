import { YoutubeTranscript } from 'youtube-transcript'
import { getDb } from '../db'
import type { VideoSummary } from '@shared/types'

export interface TranscriptSegment {
  start: number
  duration: number
  text: string
}

interface VideoRow {
  id: string
  url: string
  title: string | null
  channel: string | null
  duration_seconds: number | null
  thumbnail_url: string | null
  transcript_json: string
  fetched_at: string
}

export interface VideoRecord {
  id: string
  url: string
  title: string | null
  channel: string | null
  durationSeconds: number | null
  thumbnailUrl: string | null
  transcript: TranscriptSegment[]
}

function toVideoRecord(row: VideoRow): VideoRecord {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    channel: row.channel,
    durationSeconds: row.duration_seconds,
    thumbnailUrl: row.thumbnail_url,
    transcript: JSON.parse(row.transcript_json) as TranscriptSegment[]
  }
}

export function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([\w-]{11})/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  throw new Error('Geçerli bir YouTube video linki değil')
}

async function fetchVideoMetadata(
  videoId: string
): Promise<{ title: string | null; channel: string | null; thumbnailUrl: string | null }> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`
  )}&format=json`

  const res = await fetch(url)
  if (!res.ok) {
    return { title: null, channel: null, thumbnailUrl: null }
  }
  const data = (await res.json()) as {
    title?: string
    author_name?: string
    thumbnail_url?: string
  }
  return {
    title: data.title ?? null,
    channel: data.author_name ?? null,
    thumbnailUrl: data.thumbnail_url ?? null
  }
}

async function fetchTranscriptSegments(videoId: string): Promise<TranscriptSegment[]> {
  const raw = await YoutubeTranscript.fetchTranscript(videoId)
  if (!raw.length) {
    throw new Error('Bu videoda altyazı/transkript bulunamadı')
  }
  return raw.map((seg) => ({
    start: seg.offset / 1000,
    duration: seg.duration / 1000,
    text: seg.text
  }))
}

function getCachedVideo(videoId: string): VideoRecord | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId) as VideoRow | undefined
  return row ? toVideoRecord(row) : null
}

function saveVideo(record: VideoRecord): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO videos (id, url, title, channel, duration_seconds, thumbnail_url, transcript_json, fetched_at)
     VALUES (@id, @url, @title, @channel, @durationSeconds, @thumbnailUrl, @transcriptJson, @fetchedAt)
     ON CONFLICT(id) DO UPDATE SET
       url = excluded.url, title = excluded.title, channel = excluded.channel,
       duration_seconds = excluded.duration_seconds, thumbnail_url = excluded.thumbnail_url,
       transcript_json = excluded.transcript_json, fetched_at = excluded.fetched_at`
  ).run({
    id: record.id,
    url: record.url,
    title: record.title,
    channel: record.channel,
    durationSeconds: record.durationSeconds,
    thumbnailUrl: record.thumbnailUrl,
    transcriptJson: JSON.stringify(record.transcript),
    fetchedAt: new Date().toISOString()
  })
}

export async function getOrFetchVideo(url: string): Promise<VideoRecord> {
  const videoId = extractVideoId(url)

  const cached = getCachedVideo(videoId)
  if (cached) return cached

  const [metadata, transcript] = await Promise.all([
    fetchVideoMetadata(videoId),
    fetchTranscriptSegments(videoId)
  ])

  const lastSegment = transcript[transcript.length - 1]
  const durationSeconds = lastSegment ? Math.ceil(lastSegment.start + lastSegment.duration) : null

  const record: VideoRecord = {
    id: videoId,
    url,
    title: metadata.title,
    channel: metadata.channel,
    durationSeconds,
    thumbnailUrl: metadata.thumbnailUrl,
    transcript
  }

  saveVideo(record)
  return record
}

export function getVideoById(videoId: string): VideoRecord | null {
  return getCachedVideo(videoId)
}

export function toVideoSummary(record: VideoRecord): VideoSummary {
  return {
    id: record.id,
    url: record.url,
    title: record.title,
    channel: record.channel,
    durationSeconds: record.durationSeconds,
    thumbnailUrl: record.thumbnailUrl
  }
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const MAX_TRANSCRIPT_LINES = 800

export function getTranscriptRange(
  video: VideoRecord,
  startSeconds?: number,
  endSeconds?: number
): string {
  let segments = video.transcript
  if (startSeconds !== undefined || endSeconds !== undefined) {
    const start = startSeconds ?? 0
    const end = endSeconds ?? Infinity
    segments = segments.filter((seg) => seg.start >= start && seg.start <= end)
  }

  const lines = segments.map((seg) => `[${formatTimestamp(seg.start)}] ${seg.text}`)

  if (lines.length > MAX_TRANSCRIPT_LINES) {
    return (
      lines.slice(0, MAX_TRANSCRIPT_LINES).join('\n') +
      `\n\n...truncated, ${lines.length - MAX_TRANSCRIPT_LINES} more lines. Use start_seconds/end_seconds to narrow the range.`
    )
  }

  return lines.join('\n') || 'No transcript found for this range.'
}
