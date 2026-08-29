import { describe, it, expect, vi } from 'vitest'
import { decodePlaylistFromUrl, buildShareUrl } from './shareUrl.js'

describe('decodePlaylistFromUrl', () => {
  it('returns null when there is no playlist param', () => {
    expect(decodePlaylistFromUrl('')).toBeNull()
  })

  it('decodes a base64-encoded JSON playlist', () => {
    const playlist = [{ videoId: 'abc123', start: 0, end: 10 }]
    const encoded = btoa(JSON.stringify(playlist))
    expect(decodePlaylistFromUrl(`?playlist=${encoded}`)).toEqual(playlist)
  })

  it('returns null and logs an error for malformed base64', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(decodePlaylistFromUrl('?playlist=not-valid-base64!!!')).toBeNull()
    spy.mockRestore()
  })
})

describe('buildShareUrl', () => {
  it('encodes the playlist as base64 in the query string', () => {
    const playlist = [{ videoId: 'abc123', start: 0, end: 10 }]
    const url = buildShareUrl(playlist, 'https://example.com/app')
    expect(url).toBe(`https://example.com/app?playlist=${btoa(JSON.stringify(playlist))}`)
  })
})
