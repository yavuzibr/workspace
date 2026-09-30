import { Octokit } from '@octokit/rest'
import { throttling } from '@octokit/plugin-throttling'
import { getSecret } from '../secrets/keychain'

const ThrottledOctokit = Octokit.plugin(throttling)

let cachedClient: InstanceType<typeof ThrottledOctokit> | null = null
let cachedToken: string | null | undefined

export function getOctokit(): InstanceType<typeof ThrottledOctokit> {
  const token = getSecret('githubToken') ?? undefined

  if (cachedClient && cachedToken === token) {
    return cachedClient
  }

  cachedToken = token
  cachedClient = new ThrottledOctokit({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter, options, _octokit, retryCount) => {
        if (retryCount < 1) return true
        return false
      },
      onSecondaryRateLimit: () => false
    }
  })

  return cachedClient
}

export function resetOctokitClient(): void {
  cachedClient = null
  cachedToken = undefined
}
