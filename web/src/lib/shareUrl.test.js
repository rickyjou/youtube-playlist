import { describe, it, expect, vi } from 'vitest'
import { decodePlaylistFromUrl, buildShareUrl, isValidPlaylist } from './shareUrl.js'

describe('decodePlaylistFromUrl', () => {
  it('returns null when there is no playlist param', () => {
    expect(decodePlaylistFromUrl('')).toBeNull()
  })

  it('decodes a base64-encoded JSON playlist', () => {
    const playlist = [{ videoId: 'abc12345678', start: 0, end: 10 }]
    const encoded = btoa(JSON.stringify(playlist))
    expect(decodePlaylistFromUrl(`?playlist=${encoded}`)).toEqual(playlist)
  })

  it('returns null and logs an error for malformed base64', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(decodePlaylistFromUrl('?playlist=not-valid-base64!!!')).toBeNull()
    spy.mockRestore()
  })

  it('returns null for syntactically valid JSON that is not a playlist array', () => {
    const encoded = btoa(JSON.stringify({}))
    expect(decodePlaylistFromUrl(`?playlist=${encoded}`)).toBeNull()
  })

  it('returns null for an array whose entries have the wrong shape', () => {
    const encoded = btoa(JSON.stringify([{ videoId: 123, start: 0, end: 10 }]))
    expect(decodePlaylistFromUrl(`?playlist=${encoded}`)).toBeNull()
  })
})

describe('isValidPlaylist', () => {
  it('accepts a well-formed playlist', () => {
    expect(isValidPlaylist([{ videoId: 'abc12345678', start: 0, end: 10 }])).toBe(true)
  })

  it('rejects a videoId that is not a valid YouTube ID shape', () => {
    expect(isValidPlaylist([{ videoId: '<script>', start: 0, end: 10 }])).toBe(false)
    expect(isValidPlaylist([{ videoId: 'not-a-valid-id', start: 0, end: 10 }])).toBe(false)
  })

  it('rejects a non-finite start or end', () => {
    expect(isValidPlaylist([{ videoId: 'abc12345678', start: Infinity, end: 10 }])).toBe(false)
    expect(isValidPlaylist([{ videoId: 'abc12345678', start: 0, end: NaN }])).toBe(false)
  })

  it('rejects a negative start', () => {
    expect(isValidPlaylist([{ videoId: 'abc12345678', start: -1, end: 10 }])).toBe(false)
  })

  it('rejects an end before start', () => {
    expect(isValidPlaylist([{ videoId: 'abc12345678', start: 10, end: 5 }])).toBe(false)
  })
})

describe('buildShareUrl', () => {
  it('encodes the playlist as base64 in the query string', () => {
    const playlist = [{ videoId: 'abc123', start: 0, end: 10 }]
    const url = buildShareUrl(playlist, 'https://example.com/app')
    expect(url).toBe(`https://example.com/app?playlist=${btoa(JSON.stringify(playlist))}`)
  })
})
