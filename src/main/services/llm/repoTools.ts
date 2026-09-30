import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import type { Repo } from '@shared/types'
import { getRepoTree, getFileContent } from '../github/repoService'

export const repoToolSchemas: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_repo_summary',
      description:
        'Get repo metadata: description, default branch, language, size. Call this first.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_branches',
      description: 'List branches for the current repo',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_repo_tree',
      description: 'Get the recursive file/directory tree for a branch',
      parameters: {
        type: 'object',
        properties: { branch: { type: 'string' } },
        required: ['branch']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description:
        'Read the contents of a file at a path on a branch. Large files are truncated; request line ranges if needed.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          branch: { type: 'string' },
          start_line: { type: 'integer' },
          end_line: { type: 'integer' }
        },
        required: ['path', 'branch']
      }
    }
  }
]

export interface RepoToolContext {
  repo: Repo
  branches: string[]
}

export async function dispatchRepoTool(
  name: string,
  args: Record<string, unknown>,
  ctx: RepoToolContext
): Promise<string> {
  switch (name) {
    case 'get_repo_summary':
      return JSON.stringify({
        owner: ctx.repo.owner,
        name: ctx.repo.name,
        description: ctx.repo.description,
        defaultBranch: ctx.repo.defaultBranch
      })
    case 'list_branches':
      return JSON.stringify(ctx.branches)
    case 'get_repo_tree': {
      const branch = (args.branch as string) || ctx.repo.defaultBranch
      const { entries, truncated } = await getRepoTree(ctx.repo, branch)
      return JSON.stringify({
        truncated,
        entries: entries.map((e) => ({ path: e.path, type: e.type }))
      })
    }
    case 'read_file': {
      const branch = (args.branch as string) || ctx.repo.defaultBranch
      const path = args.path as string
      const startLine = args.start_line as number | undefined
      const endLine = args.end_line as number | undefined
      const result = await getFileContent(ctx.repo, branch, path, startLine, endLine)
      return result.content
    }
    default:
      return `Unknown tool: ${name}`
  }
}
