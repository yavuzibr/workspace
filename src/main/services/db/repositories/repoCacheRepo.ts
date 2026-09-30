import { getDb } from '../index'
import type { Repo } from '@shared/types'

interface RepoRow {
  id: number
  owner: string
  name: string
  default_branch: string
  description: string | null
  fetched_at: string
}

function toRepo(row: RepoRow): Repo {
  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    defaultBranch: row.default_branch,
    description: row.description,
    fetchedAt: row.fetched_at
  }
}

export function upsertRepo(
  owner: string,
  name: string,
  defaultBranch: string,
  description: string | null
): Repo {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO repos (owner, name, default_branch, description, fetched_at)
     VALUES (@owner, @name, @defaultBranch, @description, @fetchedAt)
     ON CONFLICT(owner, name) DO UPDATE SET
       default_branch = excluded.default_branch,
       description = excluded.description,
       fetched_at = excluded.fetched_at`
  ).run({ owner, name, defaultBranch, description, fetchedAt: now })

  const row = db
    .prepare('SELECT * FROM repos WHERE owner = ? AND name = ?')
    .get(owner, name) as RepoRow
  return toRepo(row)
}

export function getRepoById(id: number): Repo | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM repos WHERE id = ?').get(id) as RepoRow | undefined
  return row ? toRepo(row) : null
}

export function getCachedTree(repoId: number, branch: string, commitSha: string): string | null {
  const db = getDb()
  const row = db
    .prepare('SELECT tree_json FROM repo_trees WHERE repo_id = ? AND branch = ? AND commit_sha = ?')
    .get(repoId, branch, commitSha) as { tree_json: string } | undefined
  return row ? row.tree_json : null
}

export function saveTree(
  repoId: number,
  branch: string,
  commitSha: string,
  treeJson: string
): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO repo_trees (repo_id, branch, commit_sha, tree_json, fetched_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(repo_id, branch, commit_sha) DO UPDATE SET tree_json = excluded.tree_json, fetched_at = excluded.fetched_at`
  ).run(repoId, branch, commitSha, treeJson, new Date().toISOString())
}

export function getCachedFile(
  repoId: number,
  branch: string,
  commitSha: string,
  path: string
): { content: string; truncated: boolean } | null {
  const db = getDb()
  const row = db
    .prepare(
      'SELECT content, truncated FROM file_cache WHERE repo_id = ? AND branch = ? AND commit_sha = ? AND path = ?'
    )
    .get(repoId, branch, commitSha, path) as { content: string; truncated: number } | undefined
  return row ? { content: row.content, truncated: !!row.truncated } : null
}

export function saveFile(
  repoId: number,
  branch: string,
  commitSha: string,
  path: string,
  content: string,
  truncated: boolean
): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO file_cache (repo_id, branch, commit_sha, path, content, truncated)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(repo_id, branch, commit_sha, path) DO UPDATE SET content = excluded.content, truncated = excluded.truncated`
  ).run(repoId, branch, commitSha, path, content, truncated ? 1 : 0)
}
