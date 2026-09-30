import { getOctokit } from './client'
import {
  upsertRepo,
  getCachedTree,
  saveTree,
  getCachedFile,
  saveFile
} from '../db/repositories/repoCacheRepo'
import type { Repo } from '@shared/types'

const MAX_FILE_LINES = 800
const MAX_FILE_CHARS = 60000

const BINARY_OR_NOISY_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.svg',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.mp3',
  '.zip',
  '.gz',
  '.pdf',
  '.min.js',
  '.min.css',
  '.map',
  '.lock'
]
const NOISY_FILENAMES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']

export function isNoisyPath(path: string): boolean {
  const lower = path.toLowerCase()
  if (NOISY_FILENAMES.some((f) => lower.endsWith('/' + f) || lower === f)) return true
  return BINARY_OR_NOISY_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export interface TreeEntry {
  path: string
  type: 'blob' | 'tree'
  size?: number
}

export async function fetchRepoAndBranches(
  owner: string,
  name: string
): Promise<{ repo: Repo; branches: string[] }> {
  const octokit = getOctokit()

  const { data: repoData } = await octokit.repos.get({ owner, repo: name })
  const { data: branchData } = await octokit.repos.listBranches({
    owner,
    repo: name,
    per_page: 100
  })

  const repo = upsertRepo(owner, name, repoData.default_branch, repoData.description)
  const branches = branchData.map((b) => b.name)

  return { repo, branches }
}

export async function getBranchHeadSha(
  owner: string,
  name: string,
  branch: string
): Promise<string> {
  const octokit = getOctokit()
  const { data } = await octokit.repos.getBranch({ owner, repo: name, branch })
  return data.commit.sha
}

export async function getRepoTree(
  repo: Repo,
  branch: string
): Promise<{ entries: TreeEntry[]; commitSha: string; truncated: boolean }> {
  const octokit = getOctokit()
  const commitSha = await getBranchHeadSha(repo.owner, repo.name, branch)

  const cached = getCachedTree(repo.id, branch, commitSha)
  if (cached) {
    const parsed = JSON.parse(cached) as { entries: TreeEntry[]; truncated: boolean }
    return { ...parsed, commitSha }
  }

  const { data } = await octokit.git.getTree({
    owner: repo.owner,
    repo: repo.name,
    tree_sha: commitSha,
    recursive: '1'
  })

  const entries: TreeEntry[] = (data.tree ?? [])
    .filter((item) => item.path && (item.type === 'blob' || item.type === 'tree'))
    .map((item) => ({
      path: item.path as string,
      type: item.type as 'blob' | 'tree',
      size: item.size
    }))

  saveTree(repo.id, branch, commitSha, JSON.stringify({ entries, truncated: !!data.truncated }))

  return { entries, commitSha, truncated: !!data.truncated }
}

export async function getFileContent(
  repo: Repo,
  branch: string,
  path: string,
  startLine?: number,
  endLine?: number
): Promise<{ content: string; truncated: boolean }> {
  const commitSha = await getBranchHeadSha(repo.owner, repo.name, branch)

  let full = getCachedFile(repo.id, branch, commitSha, path)

  if (!full) {
    if (isNoisyPath(path)) {
      return { content: '[skipped: binary/lockfile/minified content not read]', truncated: true }
    }

    const octokit = getOctokit()
    const { data } = await octokit.repos.getContent({
      owner: repo.owner,
      repo: repo.name,
      path,
      ref: branch
    })

    if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) {
      return { content: '[not a readable file]', truncated: false }
    }

    const decoded = Buffer.from(data.content, 'base64').toString('utf-8')
    const isTruncated = decoded.length > MAX_FILE_CHARS
    const stored = isTruncated ? decoded.slice(0, MAX_FILE_CHARS) : decoded

    saveFile(repo.id, branch, commitSha, path, stored, isTruncated)
    full = { content: stored, truncated: isTruncated }
  }

  if (startLine || endLine) {
    const lines = full.content.split('\n')
    const start = Math.max(0, (startLine ?? 1) - 1)
    const end = Math.min(lines.length, endLine ?? lines.length)
    return { content: lines.slice(start, end).join('\n'), truncated: full.truncated }
  }

  const lines = full.content.split('\n')
  if (lines.length > MAX_FILE_LINES) {
    return {
      content:
        lines.slice(0, MAX_FILE_LINES).join('\n') +
        `\n\n...truncated, ${lines.length - MAX_FILE_LINES} more lines. Use start_line/end_line to see more.`,
      truncated: true
    }
  }

  return full
}
