import { describe, expect, it } from 'vitest'
import { buildTree, sortChildren } from './FileExplorer'
import type { FileTreeEntry } from '@shared/types'

function entry(path: string, type: 'blob' | 'tree' = 'blob', readable = true): FileTreeEntry {
  return { path, type, readable }
}

describe('buildTree', () => {
  it('groups nested paths into a tree', () => {
    const tree = buildTree([entry('src/index.ts'), entry('src/components/Button.tsx'), entry('README.md')])

    const root = sortChildren(tree)
    expect(root.map((n) => n.name)).toEqual(['src', 'README.md'])

    const src = root.find((n) => n.name === 'src')!
    expect(src.type).toBe('tree')
    const srcChildren = sortChildren(src)
    expect(srcChildren.map((n) => n.name)).toEqual(['components', 'index.ts'])
  })

  it('marks intermediate directories as readable trees regardless of leaf readability', () => {
    const tree = buildTree([entry('assets/logo.png', 'blob', false)])
    const assets = sortChildren(tree)[0]
    expect(assets.type).toBe('tree')
    expect(assets.readable).toBe(true)

    const logo = sortChildren(assets)[0]
    expect(logo.readable).toBe(false)
  })

  it('returns an empty tree for no entries', () => {
    const tree = buildTree([])
    expect(sortChildren(tree)).toEqual([])
  })
})

describe('sortChildren', () => {
  it('sorts folders before files, then alphabetically within each group', () => {
    const tree = buildTree([
      entry('b.ts'),
      entry('a.ts'),
      entry('zeta/file.ts'),
      entry('alpha/file.ts')
    ])

    const sorted = sortChildren(tree)
    expect(sorted.map((n) => n.name)).toEqual(['alpha', 'zeta', 'a.ts', 'b.ts'])
  })
})
