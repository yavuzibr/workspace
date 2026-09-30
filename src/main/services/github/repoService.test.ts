import { describe, expect, it } from 'vitest'
import { isNoisyPath } from './repoService'

describe('isNoisyPath', () => {
  it.each([
    ['logo.png', true],
    ['assets/photo.JPG', true],
    ['bundle.min.js', true],
    ['bundle.min.css', true],
    ['src/index.map', true],
    ['package-lock.json', true],
    ['yarn.lock', true],
    ['pnpm-lock.yaml', true],
    ['sub/dir/package-lock.json', true],
    ['src/index.ts', false],
    ['README.md', false],
    ['src/components/Button.tsx', false],
    ['lockfile.txt', false]
  ])('isNoisyPath(%s) === %s', (path, expected) => {
    expect(isNoisyPath(path)).toBe(expected)
  })
})
