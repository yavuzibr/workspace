import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import type { HfResourceRecord } from '../huggingface/huggingfaceService'
import {
  getDatasetSize,
  getHfFileContent,
  getSampleRows,
  isNoisyHfPath
} from '../huggingface/huggingfaceService'
import type { HfKind } from '@shared/types'

const commonSchemas: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_card_summary',
      description:
        'Get the model/dataset card metadata: task/pipeline, license, downloads, likes, tags. Call this first.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_readme',
      description: 'Get the README.md (model/dataset card body) content.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description:
        'List files in the repository with their sizes. Binary/checkpoint files (weights, parquet, etc.) are listed but their content is never readable.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description:
        'Read a text file from the repo (config.json, tokenizer files, scripts, small data samples, etc.). Binary/tensor files cannot be read.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path']
      }
    }
  }
]

const sampleRowsSchema: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_sample_rows',
    description:
      "Get a preview of a few real sample rows from the dataset (via the datasets-server API), optionally for a specific config/split. Omit both to use the conversation's selected subset (or the default one). Use this ONLY to preview content/format — never call this repeatedly to count rows or estimate size, use get_dataset_size for that instead.",
    parameters: {
      type: 'object',
      properties: {
        config: { type: 'string' },
        split: { type: 'string' }
      },
      required: []
    }
  }
}

const datasetSizeSchema: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_dataset_size',
    description:
      'Get the exact row counts and byte sizes for the dataset in a single call — total across all configs/subsets, and a per-config breakdown. This is the correct tool for "how big is this dataset" / "how many examples" questions. Do NOT use get_sample_rows to count rows.',
    parameters: {
      type: 'object',
      properties: { config: { type: 'string' } },
      required: []
    }
  }
}

export function huggingfaceToolSchemas(kind: HfKind): ChatCompletionTool[] {
  return kind === 'dataset'
    ? [...commonSchemas, sampleRowsSchema, datasetSizeSchema]
    : commonSchemas
}

export interface HuggingfaceToolContext {
  kind: HfKind
  resource: HfResourceRecord
  config: string | null
}

export async function dispatchHuggingfaceTool(
  name: string,
  args: Record<string, unknown>,
  ctx: HuggingfaceToolContext
): Promise<string> {
  switch (name) {
    case 'get_card_summary':
      return JSON.stringify(ctx.resource.card)
    case 'get_readme':
      return ctx.resource.readme ?? 'No README available for this resource.'
    case 'list_files':
      return JSON.stringify(
        ctx.resource.files.map((f) => ({
          path: f.path,
          size: f.size,
          readable: !isNoisyHfPath(f.path)
        }))
      )
    case 'read_file': {
      const path = args.path as string
      return getHfFileContent(ctx.resource, path)
    }
    case 'get_sample_rows': {
      if (ctx.kind !== 'dataset') return 'get_sample_rows is only available for datasets.'
      const config = (args.config as string | undefined) ?? ctx.config ?? undefined
      const split = args.split as string | undefined
      return getSampleRows(ctx.resource, config, split)
    }
    case 'get_dataset_size': {
      if (ctx.kind !== 'dataset') return 'get_dataset_size is only available for datasets.'
      const config = (args.config as string | undefined) ?? ctx.config ?? undefined
      return getDatasetSize(ctx.resource.fullName, config)
    }
    default:
      return `Unknown tool: ${name}`
  }
}
