import { describe, it, expect, vi, afterEach } from 'vitest'
import { shortenUrl } from './urlShortener.js'

describe('shortenUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the shortened URL on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('https://tinyurl.com/abc123'),
      }),
    )

    const result = await shortenUrl('https://example.com/very/long/path?playlist=abc')

    expect(result).toBe('https://tinyurl.com/abc123')
    expect(fetch).toHaveBeenCalledWith(
      'https://tinyurl.com/api-create.php?url=' +
        encodeURIComponent('https://example.com/very/long/path?playlist=abc'),
    )
  })

  it('returns null when the response is not http error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve(''),
      }),
    )

    expect(await shortenUrl('https://example.com')).toBeNull()
  })

  it('returns null when the response body is not a URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('Error'),
      }),
    )

    expect(await shortenUrl('https://example.com')).toBeNull()
  })

  it('returns null when the network request throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await shortenUrl('https://example.com')).toBeNull()

    spy.mockRestore()
  })
})
