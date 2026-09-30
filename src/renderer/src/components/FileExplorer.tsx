import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'
import { useAppStore } from '../state/store'
import { api } from '../api/client'
import type { FileTreeEntry } from '@shared/types'

export interface TreeNode {
  name: string
  path: string
  type: 'blob' | 'tree'
  readable: boolean
  children: Map<string, TreeNode>
}

export function buildTree(entries: FileTreeEntry[]): TreeNode {
  const root: TreeNode = { name: '', path: '', type: 'tree', readable: true, children: new Map() }
  for (const entry of entries) {
    const parts = entry.path.split('/')
    let node = root
    let acc = ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      acc = acc ? `${acc}/${part}` : part
      const isLast = i === parts.length - 1
      let child = node.children.get(part)
      if (!child) {
        child = {
          name: part,
          path: acc,
          type: isLast ? entry.type : 'tree',
          readable: isLast ? entry.readable : true,
          children: new Map()
        }
        node.children.set(part, child)
      }
      node = child
    }
  }
  return root
}

export function sortChildren(node: TreeNode): TreeNode[] {
  return Array.from(node.children.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function FolderRow({ node, depth }: { node: TreeNode; depth: number }): JSX.Element {
  const [open, setOpen] = useState(depth < 1)
  const selectedFiles = useAppStore((s) => s.selectedFiles)
  const toggleFileSelection = useAppStore((s) => s.toggleFileSelection)

  if (node.type === 'blob') {
    const isSelected = selectedFiles.includes(node.path)
    return (
      <button
        onClick={() => node.readable && toggleFileSelection(node.path)}
        disabled={!node.readable}
        className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs ${
          isSelected
            ? 'bg-accent-subtle text-accent'
            : node.readable
              ? 'hover:bg-[var(--bg-surface)]'
              : 'cursor-not-allowed opacity-40'
        }`}
        style={{
          paddingLeft: `${depth * 14 + 6}px`,
          color: isSelected ? undefined : 'var(--text-secondary)'
        }}
        title={
          node.readable ? node.path : `${node.path} — bu dosya türü (tensor/binary) okunamıyor`
        }
      >
        <File size={12} className="shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-xs hover:bg-[var(--bg-surface)]"
        style={{ paddingLeft: `${depth * 14 + 2}px`, color: 'var(--text-secondary)' }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {open ? <FolderOpen size={12} /> : <Folder size={12} />}
        <span className="truncate">{node.name}</span>
      </button>
      {open &&
        sortChildren(node).map((child) => (
          <FolderRow key={child.path} node={child} depth={depth + 1} />
        ))}
    </div>
  )
}

interface Props {
  conversationId: string
  branch: string
}

export function FileExplorer({ conversationId, branch }: Props): JSX.Element {
  const [entries, setEntries] = useState<FileTreeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api()
      .getFileTree(conversationId, branch)
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [conversationId, branch])

  const tree = useMemo(() => buildTree(entries), [entries])

  return (
    <div
      className="flex h-full w-60 flex-col overflow-y-auto border-r py-2"
      style={{ borderColor: 'var(--border-color)' }}
    >
      {loading && (
        <span className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Loading files...
        </span>
      )}
      {error && <span className="px-3 py-2 text-xs text-red-400">{error}</span>}
      {!loading &&
        !error &&
        sortChildren(tree).map((child) => <FolderRow key={child.path} node={child} depth={0} />)}
    </div>
  )
}
