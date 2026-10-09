import { describe, it, expect } from 'vitest'
import { parseYouTubeInput } from './youtubeInput.js'

describe('parseYouTubeInput', () => {
  it('detects a standard watch URL as a video', () => {
    expect(parseYouTubeInput('https://www.youtube.com/watch?v=6MTbZBg9pQc'))
      .toEqual({ type: 'video', videoId: '6MTbZBg9pQc' })
  })

  it('detects a youtu.be short URL as a video', () => {
    expect(parseYouTubeInput('https://youtu.be/6MTbZBg9pQc'))
      .toEqual({ type: 'video', videoId: '6MTbZBg9pQc' })
  })

  it('detects a playlist URL as a playlist', () => {
    expect(parseYouTubeInput('https://www.youtube.com/playlist?list=PLabcDEF1234567890'))
      .toEqual({ type: 'playlist', playlistId: 'PLabcDEF1234567890' })
  })

  it('prefers the video when a watch URL also has a list param', () => {
    expect(parseYouTubeInput('https://www.youtube.com/watch?v=6MTbZBg9pQc&list=PLabcDEF1234567890'))
      .toEqual({ type: 'video', videoId: '6MTbZBg9pQc' })
  })

  it('rejects a non-YouTube URL', () => {
    expect(parseYouTubeInput('https://example.com/watch?v=6MTbZBg9pQc'))
      .toEqual({ type: 'invalid' })
  })

  it('rejects a plain non-URL string', () => {
    expect(parseYouTubeInput('not a url')).toEqual({ type: 'invalid' })
  })

  it('rejects empty input', () => {
    expect(parseYouTubeInput('')).toEqual({ type: 'invalid' })
  })
})
