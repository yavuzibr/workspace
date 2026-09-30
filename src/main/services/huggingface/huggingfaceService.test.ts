import { describe, expect, it } from 'vitest'
import { isNoisyHfPath } from './huggingfaceService'

describe('isNoisyHfPath', () => {
  it.each([
    ['model.safetensors', true],
    ['pytorch_model.bin', true],
    ['weights.H5', true],
    ['data.parquet', true],
    ['checkpoint.ckpt', true],
    ['model.gguf', true],
    ['config.json', false],
    ['tokenizer_config.json', false],
    ['README.md', false],
    ['scripts/train.py', false]
  ])('isNoisyHfPath(%s) === %s', (path, expected) => {
    expect(isNoisyHfPath(path)).toBe(expected)
  })
})
