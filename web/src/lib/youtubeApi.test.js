import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchVideoMetadata } from './youtubeApi.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchVideoMetadata', () => {
  it('maps API response items into a videoId-keyed metadata record', async () => {
    const mockResponse = {
      items: [
        {
          id: 'abc123',
          snippet: { title: 'Test Video', thumbnails: { default: { url: 'https://img/abc123.jpg' } } },
          contentDetails: { duration: 'PT1M5S' },
        },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    const result = await fetchVideoMetadata(['abc123'], 'test-key')

    expect(result).toEqual({
      abc123: { title: 'Test Video', thumbnail: 'https://img/abc123.jpg', durationSeconds: 65 },
    })
  })

  it('batches requests in groups of 50 video IDs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [] }) })
    vi.stubGlobal('fetch', fetchMock)

    const videoIds = Array.from({ length: 75 }, (_, i) => `id${i}`)
    await fetchVideoMetadata(videoIds, 'test-key')

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws when the API responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(fetchVideoMetadata(['abc123'], 'bad-key')).rejects.toThrow('YouTube Data API error: 403')
  })
})
