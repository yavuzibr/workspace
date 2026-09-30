import { getDb } from '../db'
import type { HfKind, HfResourceSummary } from '@shared/types'

const MAX_README_CHARS = 20000
const MAX_SAMPLE_ROWS = 8
const MAX_FILE_LINES = 800
const MAX_FILE_CHARS = 60000

const NOISY_EXTENSIONS = [
  '.bin',
  '.safetensors',
  '.h5',
  '.ckpt',
  '.gguf',
  '.pt',
  '.pth',
  '.onnx',
  '.parquet',
  '.arrow',
  '.msgpack',
  '.npy',
  '.npz',
  '.zip',
  '.tar',
  '.gz',
  '.index',
  '.tflite',
  '.pb',
  '.model'
]

export function isNoisyHfPath(path: string): boolean {
  const lower = path.toLowerCase()
  return NOISY_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

// Encodes a slash-separated HF resource name or file path segment-by-segment, so the
// slashes stay as path separators instead of becoming %2F (which encodeURIComponent alone would do).
function encodeHfPathSegments(value: string): string {
  return value.split('/').map(encodeURIComponent).join('/')
}

export interface HfFileEntry {
  path: string
  size: number | null
}

export interface HfSamplePreview {
  config: string
  split: string
  availableSplits: { config: string; split: string }[]
  features: unknown
  rows: unknown[]
}

export interface HfResourceRecord {
  id: string
  kind: HfKind
  fullName: string
  card: Record<string, unknown>
  readme: string | null
  files: HfFileEntry[]
  samplePreview: HfSamplePreview | null
}

interface HfResourceRow {
  id: string
  kind: HfKind
  full_name: string
  card_json: string
  readme_md: string | null
  files_json: string
  sample_rows_json: string | null
  fetched_at: string
}

function toRecord(row: HfResourceRow): HfResourceRecord {
  return {
    id: row.id,
    kind: row.kind,
    fullName: row.full_name,
    card: JSON.parse(row.card_json) as Record<string, unknown>,
    readme: row.readme_md,
    files: JSON.parse(row.files_json) as HfFileEntry[],
    samplePreview: row.sample_rows_json
      ? (JSON.parse(row.sample_rows_json) as HfSamplePreview)
      : null
  }
}

function getCachedResource(id: string): HfResourceRecord | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM hf_resources WHERE id = ?').get(id) as
    HfResourceRow | undefined
  return row ? toRecord(row) : null
}

function saveResource(record: HfResourceRecord): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO hf_resources (id, kind, full_name, card_json, readme_md, files_json, sample_rows_json, fetched_at)
     VALUES (@id, @kind, @fullName, @cardJson, @readme, @filesJson, @sampleJson, @fetchedAt)
     ON CONFLICT(id) DO UPDATE SET
       card_json = excluded.card_json, readme_md = excluded.readme_md,
       files_json = excluded.files_json, sample_rows_json = excluded.sample_rows_json,
       fetched_at = excluded.fetched_at`
  ).run({
    id: record.id,
    kind: record.kind,
    fullName: record.fullName,
    cardJson: JSON.stringify(record.card),
    readme: record.readme,
    filesJson: JSON.stringify(record.files),
    sampleJson: record.samplePreview ? JSON.stringify(record.samplePreview) : null,
    fetchedAt: new Date().toISOString()
  })
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 404) throw new Error('Model/dataset bulunamadı (404)')
    if (res.status === 401 || res.status === 403) {
      throw new Error('Bu kaynağa erişim izni yok (private/gated olabilir)')
    }
    throw new Error(`Hugging Face API hatası: ${res.status}`)
  }
  return res.json()
}

async function fetchCardAndFiles(
  kind: HfKind,
  fullName: string
): Promise<{ card: Record<string, unknown>; files: HfFileEntry[] }> {
  const apiPath = kind === 'model' ? 'models' : 'datasets'
  const data = (await fetchJson(
    `https://huggingface.co/api/${apiPath}/${encodeHfPathSegments(fullName)}`
  )) as {
    siblings?: { rfilename: string; size?: number }[]
    [key: string]: unknown
  }

  const files: HfFileEntry[] = (data.siblings ?? []).map((s) => ({
    path: s.rfilename,
    size: s.size ?? null
  }))

  const card = { ...data }
  delete (card as Record<string, unknown>).siblings

  return { card, files }
}

async function fetchReadme(kind: HfKind, fullName: string): Promise<string | null> {
  const encodedName = encodeHfPathSegments(fullName)
  const url =
    kind === 'model'
      ? `https://huggingface.co/${encodedName}/raw/main/README.md`
      : `https://huggingface.co/datasets/${encodedName}/raw/main/README.md`

  const res = await fetch(url)
  if (!res.ok) return null
  const text = await res.text()
  if (text.length > MAX_README_CHARS) {
    return text.slice(0, MAX_README_CHARS) + '\n\n...truncated.'
  }
  return text
}

async function fetchAvailableSplits(
  fullName: string
): Promise<{ config: string; split: string }[]> {
  const data = (await fetchJson(
    `https://datasets-server.huggingface.co/splits?dataset=${encodeURIComponent(fullName)}`
  )) as { splits?: { config: string; split: string }[] }
  return data.splits ?? []
}

async function fetchFirstRows(
  fullName: string,
  config: string,
  split: string
): Promise<{ features: unknown; rows: unknown[] }> {
  const url = `https://datasets-server.huggingface.co/first-rows?dataset=${encodeURIComponent(fullName)}&config=${encodeURIComponent(config)}&split=${encodeURIComponent(split)}`
  const data = (await fetchJson(url)) as {
    features?: unknown
    rows?: { row: unknown }[]
  }
  const rows = (data.rows ?? []).slice(0, MAX_SAMPLE_ROWS).map((r) => r.row)
  return { features: data.features ?? null, rows }
}

interface DatasetSizeInfo {
  config: string
  numRows: number | null
  numBytes: number | null
}

export async function getDatasetSize(fullName: string, config?: string): Promise<string> {
  const url = `https://datasets-server.huggingface.co/size?dataset=${encodeURIComponent(fullName)}`
  const data = (await fetchJson(url)) as {
    size?: {
      dataset?: { num_rows?: number; num_bytes_parquet_files?: number }
      configs?: { config: string; num_rows?: number; num_bytes_parquet_files?: number }[]
    }
  }

  const configs: DatasetSizeInfo[] = (data.size?.configs ?? []).map((c) => ({
    config: c.config,
    numRows: c.num_rows ?? null,
    numBytes: c.num_bytes_parquet_files ?? null
  }))

  if (config) {
    const match = configs.find((c) => c.config === config)
    return JSON.stringify(
      match ?? { config, error: 'Config not found', availableConfigs: configs.map((c) => c.config) }
    )
  }

  return JSON.stringify({
    totalRowsAcrossAllConfigs: data.size?.dataset?.num_rows ?? null,
    totalBytesAcrossAllConfigs: data.size?.dataset?.num_bytes_parquet_files ?? null,
    configCount: configs.length,
    configs
  })
}

export async function getOrFetchResource(
  kind: HfKind,
  fullName: string
): Promise<HfResourceRecord> {
  const id = `${kind}:${fullName}`

  const cached = getCachedResource(id)
  if (cached) return cached

  const [{ card, files }, readme] = await Promise.all([
    fetchCardAndFiles(kind, fullName),
    fetchReadme(kind, fullName)
  ])

  let samplePreview: HfSamplePreview | null = null
  if (kind === 'dataset') {
    try {
      const splits = await fetchAvailableSplits(fullName)
      const first = splits[0]
      if (first) {
        const { features, rows } = await fetchFirstRows(fullName, first.config, first.split)
        samplePreview = {
          config: first.config,
          split: first.split,
          availableSplits: splits,
          features,
          rows
        }
      }
    } catch {
      samplePreview = null
    }
  }

  const record: HfResourceRecord = { id, kind, fullName, card, readme, files, samplePreview }
  saveResource(record)
  return record
}

export function getResourceById(id: string): HfResourceRecord | null {
  return getCachedResource(id)
}

export function getAvailableConfigs(record: HfResourceRecord): string[] {
  if (!record.samplePreview) return []
  const configs = new Set(record.samplePreview.availableSplits.map((s) => s.config))
  return Array.from(configs)
}

export function toResourceSummary(record: HfResourceRecord): HfResourceSummary {
  const card = record.card as {
    pipeline_tag?: string
    task_categories?: string[]
    license?: string
    cardData?: { license?: string }
    downloads?: number
    likes?: number
  }

  return {
    kind: record.kind,
    fullName: record.fullName,
    taskOrCategory: card.pipeline_tag ?? card.task_categories?.[0] ?? null,
    license: card.license ?? card.cardData?.license ?? null,
    downloads: card.downloads ?? null,
    likes: card.likes ?? null
  }
}

export async function getHfFileContent(record: HfResourceRecord, path: string): Promise<string> {
  if (isNoisyHfPath(path)) {
    return '[skipped: binary/tensor content not readable]'
  }

  const encodedName = encodeHfPathSegments(record.fullName)
  const encodedPath = encodeHfPathSegments(path)
  const url =
    record.kind === 'model'
      ? `https://huggingface.co/${encodedName}/raw/main/${encodedPath}`
      : `https://huggingface.co/datasets/${encodedName}/raw/main/${encodedPath}`

  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 404) return '[file not found]'
    throw new Error(`Hugging Face dosya hatası: ${res.status}`)
  }

  const text = await res.text()
  const lines = text.split('\n')
  if (lines.length > MAX_FILE_LINES || text.length > MAX_FILE_CHARS) {
    const truncated = lines.slice(0, MAX_FILE_LINES).join('\n').slice(0, MAX_FILE_CHARS)
    return truncated + '\n\n...truncated.'
  }
  return text
}

export async function getSampleRows(
  record: HfResourceRecord,
  config?: string,
  split?: string
): Promise<string> {
  if (!config && !split && record.samplePreview) {
    return JSON.stringify(
      {
        config: record.samplePreview.config,
        split: record.samplePreview.split,
        availableSplits: record.samplePreview.availableSplits,
        rows: record.samplePreview.rows
      },
      null,
      2
    )
  }

  const splits = await fetchAvailableSplits(record.fullName)
  const target =
    splits.find((s) => (!config || s.config === config) && (!split || s.split === split)) ??
    splits[0]

  if (!target) return 'No splits available for this dataset.'

  const { features, rows } = await fetchFirstRows(record.fullName, target.config, target.split)
  return JSON.stringify(
    { config: target.config, split: target.split, availableSplits: splits, features, rows },
    null,
    2
  )
}
