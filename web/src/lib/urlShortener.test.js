import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shortenUrl } from './urlShortener.js'

const API = 'https://222b03b1-9b0e-45e8-8d20-a97e8a494853.frontends.volcano.run/api/links'
const LONG_URL = 'https://rickyjou.github.io/youtube-playlist/?playlist=abc'
const SHORT_URL = 'http://go.apexarkai.com/AbCd1234'

function respond(status, body) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }
}

describe('shortenUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(201, { code: 'AbCd1234', shortUrl: SHORT_URL, url: LONG_URL })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs the long URL as JSON to the tinyurl API and returns the short URL', async () => {
    expect(await shortenUrl(LONG_URL)).toBe(SHORT_URL)
    expect(fetch).toHaveBeenCalledWith(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: LONG_URL }),
    })
  })

  it('returns null when the API rejects the request', async () => {
    fetch.mockResolvedValue(respond(403, { error: 'Origin not allowed' }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await shortenUrl(LONG_URL)).toBeNull()

    spy.mockRestore()
  })

  it('returns null when the API is unavailable', async () => {
    fetch.mockResolvedValue(respond(503, { error: 'try again' }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await shortenUrl(LONG_URL)).toBeNull()

    spy.mockRestore()
  })

  it('returns null when the response has no usable short URL', async () => {
    fetch.mockResolvedValue(respond(201, { shortUrl: 'not a url' }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await shortenUrl(LONG_URL)).toBeNull()

    spy.mockRestore()
  })

  it('returns null when the response body is not JSON', async () => {
    fetch.mockResolvedValue({ ok: true, status: 201, json: () => Promise.reject(new SyntaxError('bad json')) })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await shortenUrl(LONG_URL)).toBeNull()

    spy.mockRestore()
  })

  it('returns null when the network request throws', async () => {
    fetch.mockRejectedValue(new Error('network down'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await shortenUrl(LONG_URL)).toBeNull()

    spy.mockRestore()
  })

  it('returns null without calling the API when the URL exceeds the 8192-character limit', async () => {
    expect(await shortenUrl(`${LONG_URL}${'A'.repeat(8192)}`)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})
