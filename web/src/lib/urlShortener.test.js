import { describe, it, expect, vi, beforeEach } from 'vitest'

const sdk = vi.hoisted(() => ({
  initialize: vi.fn(),
  signUpAnonymous: vi.fn(),
  insert: vi.fn(),
  database: vi.fn(),
  constructed: vi.fn(),
}))

vi.mock('@volcano.dev/sdk', () => ({
  VolcanoAuth: class {
    constructor(config) {
      sdk.constructed(config)
      this.auth = { signUpAnonymous: sdk.signUpAnonymous }
      this.initialize = sdk.initialize
      this.insert = sdk.insert
      this.database = sdk.database
    }
  },
}))

const LONG_URL = 'https://rickyjou.github.io/youtube-playlist/?playlist=abc'
const SHORT_URL_PATTERN = /^http:\/\/go\.apexarkai\.com\/[A-Za-z0-9]{8}$/

// Fresh module per test: shortenUrl caches its Volcano client at module level.
async function loadShortenUrl() {
  vi.resetModules()
  return (await import('./urlShortener.js')).shortenUrl
}

describe('shortenUrl', () => {
  beforeEach(() => {
    Object.values(sdk).forEach((fn) => fn.mockReset())
    sdk.initialize.mockResolvedValue({ user: null })
    sdk.signUpAnonymous.mockResolvedValue({ user: { id: 'guest' }, error: null })
    sdk.insert.mockResolvedValue({ data: [{}], error: null })
  })

  it('stores the link and returns a go.apexarkai.com short URL with an 8-character alphanumeric code', async () => {
    const shortenUrl = await loadShortenUrl()

    const result = await shortenUrl(LONG_URL)

    expect(result).toMatch(SHORT_URL_PATTERN)
    const code = result.split('/').pop()
    expect(sdk.insert).toHaveBeenCalledWith('links', { code, url: LONG_URL })
    expect(sdk.database).toHaveBeenCalledWith('app')
  })

  it('signs in as an anonymous guest when there is no saved session', async () => {
    const shortenUrl = await loadShortenUrl()

    await shortenUrl(LONG_URL)

    expect(sdk.signUpAnonymous).toHaveBeenCalledTimes(1)
  })

  it('reuses a saved session instead of creating another guest', async () => {
    sdk.initialize.mockResolvedValue({ user: { id: 'existing' } })
    const shortenUrl = await loadShortenUrl()

    await shortenUrl(LONG_URL)

    expect(sdk.signUpAnonymous).not.toHaveBeenCalled()
    expect(sdk.insert).toHaveBeenCalledTimes(1)
  })

  it('reuses one client across multiple calls', async () => {
    const shortenUrl = await loadShortenUrl()

    await shortenUrl(LONG_URL)
    await shortenUrl(LONG_URL)

    expect(sdk.constructed).toHaveBeenCalledTimes(1)
    expect(sdk.signUpAnonymous).toHaveBeenCalledTimes(1)
  })

  it('retries with a new code when the generated code is already taken', async () => {
    sdk.insert
      .mockResolvedValueOnce({ data: null, error: new Error('duplicate key value violates unique constraint "links_pkey"') })
      .mockResolvedValueOnce({ data: [{}], error: null })
    const shortenUrl = await loadShortenUrl()

    const result = await shortenUrl(LONG_URL)

    expect(result).toMatch(SHORT_URL_PATTERN)
    expect(sdk.insert).toHaveBeenCalledTimes(2)
    const [first, second] = sdk.insert.mock.calls.map(([, row]) => row.code)
    expect(first).not.toBe(second)
  })

  it('returns null when every generated code collides', async () => {
    sdk.insert.mockResolvedValue({ data: null, error: new Error('duplicate key value violates unique constraint') })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const shortenUrl = await loadShortenUrl()

    expect(await shortenUrl(LONG_URL)).toBeNull()

    spy.mockRestore()
  })

  it('returns null when the insert fails for another reason', async () => {
    sdk.insert.mockResolvedValue({ data: null, error: new Error('permission denied') })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const shortenUrl = await loadShortenUrl()

    expect(await shortenUrl(LONG_URL)).toBeNull()
    expect(sdk.insert).toHaveBeenCalledTimes(1)

    spy.mockRestore()
  })

  it('returns null when guest sign-in fails, and tries a fresh client next time', async () => {
    sdk.signUpAnonymous.mockResolvedValueOnce({ user: null, error: new Error('rate limited') })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const shortenUrl = await loadShortenUrl()

    expect(await shortenUrl(LONG_URL)).toBeNull()
    expect(await shortenUrl(LONG_URL)).toMatch(SHORT_URL_PATTERN)
    expect(sdk.constructed).toHaveBeenCalledTimes(2)

    spy.mockRestore()
  })

  it('returns null without contacting the service when the URL exceeds the 8192-character limit', async () => {
    const shortenUrl = await loadShortenUrl()

    expect(await shortenUrl(`${LONG_URL}${'A'.repeat(8192)}`)).toBeNull()
    expect(sdk.constructed).not.toHaveBeenCalled()
  })
})
