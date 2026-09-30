import { FileSearch, Loader2, CheckCircle2 } from 'lucide-react'
import type { ToolCallRecord } from '@shared/types'

function formatTimestamp(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const LABELS: Record<string, (args: Record<string, unknown>) => string> = {
  get_repo_summary: () => 'Reading repo summary',
  list_branches: () => 'Listing branches',
  get_repo_tree: (args) => `Reading file tree (${args.branch ?? ''})`,
  read_file: (args) => `Reading ${args.path ?? 'file'}`,
  get_video_summary: () => 'Reading video summary',
  get_transcript: (args) => {
    const start = args.start_seconds as number | undefined
    const end = args.end_seconds as number | undefined
    if (start === undefined && end === undefined) return 'Reading transcript'
    return `Reading transcript (${start !== undefined ? formatTimestamp(start) : '0:00'}–${
      end !== undefined ? formatTimestamp(end) : 'end'
    })`
  },
  get_card_summary: () => 'Reading card summary',
  get_readme: () => 'Reading README',
  list_files: () => 'Listing files',
  get_sample_rows: (args) => {
    const config = args.config as string | undefined
    const split = args.split as string | undefined
    if (!config && !split) return 'Reading sample rows'
    return `Reading sample rows (${[config, split].filter(Boolean).join('/')})`
  }
}

export function ToolCallIndicator({ toolCall }: { toolCall: ToolCallRecord }): JSX.Element {
  const label = LABELS[toolCall.name]?.(toolCall.args) ?? toolCall.name
  const done = toolCall.result !== undefined

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
      style={{ backgroundColor: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
    >
      {done ? (
        <CheckCircle2 size={13} className="text-green-500" />
      ) : (
        <Loader2 size={13} className="animate-spin" />
      )}
      <FileSearch size={13} />
      <span>{label}</span>
    </div>
  )
}
