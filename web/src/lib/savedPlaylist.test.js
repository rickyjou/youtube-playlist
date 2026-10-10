import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { loadSavedPlaylist, savePlaylist } from './savedPlaylist.js'

describe('savedPlaylist', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null when nothing has been saved', () => {
    expect(loadSavedPlaylist()).toBeNull()
  })

  it('round-trips a playlist without the in-memory clip ids', () => {
    savePlaylist([{ id: 'clip-1', videoId: 'abcdefghijk', start: 5, end: 30 }])

    expect(JSON.parse(localStorage.getItem('playlist'))).toEqual([{ videoId: 'abcdefghijk', start: 5, end: 30 }])
    expect(loadSavedPlaylist()).toEqual([{ videoId: 'abcdefghijk', start: 5, end: 30 }])
  })

  it('restores an empty playlist as empty rather than as nothing saved', () => {
    savePlaylist([])
    expect(loadSavedPlaylist()).toEqual([])
  })

  it('keeps a clip whose end is still before its start, since that happens mid-edit', () => {
    savePlaylist([{ videoId: 'abcdefghijk', start: 90, end: 10 }])
    expect(loadSavedPlaylist()).toEqual([{ videoId: 'abcdefghijk', start: 90, end: 10 }])
  })

  it('drops malformed clips but keeps the valid ones', () => {
    localStorage.setItem('playlist', JSON.stringify([
      { videoId: 'abcdefghijk', start: 0, end: 10 },
      { videoId: 'bad id', start: 0, end: 10 },
      { videoId: 'lmnopqrstuv', start: -1, end: 10 },
      null,
    ]))
    expect(loadSavedPlaylist()).toEqual([{ videoId: 'abcdefghijk', start: 0, end: 10 }])
  })

  it('returns null for corrupt or non-array data', () => {
    localStorage.setItem('playlist', '{not json')
    expect(loadSavedPlaylist()).toBeNull()
    localStorage.setItem('playlist', '{"videoId":"abcdefghijk"}')
    expect(loadSavedPlaylist()).toBeNull()
  })

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadSavedPlaylist()).toBeNull()
    expect(() => savePlaylist([])).not.toThrow()
  })
})
