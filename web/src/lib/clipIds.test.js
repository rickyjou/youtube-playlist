import { describe, it, expect } from 'vitest'
import { withClipIds, stripClipIds } from './clipIds.js'

describe('clip ids', () => {
  it('gives every clip a unique id, even identical clips', () => {
    const clip = { videoId: 'abc12345678', start: 0, end: 10 }
    const [first, second] = withClipIds([clip, clip])
    expect(first).toMatchObject(clip)
    expect(first.id).toBeTruthy()
    expect(first.id).not.toBe(second.id)
  })

  it('never reuses an id across calls', () => {
    const [first] = withClipIds([{ videoId: 'a', start: 0, end: 1 }])
    const [second] = withClipIds([{ videoId: 'a', start: 0, end: 1 }])
    expect(first.id).not.toBe(second.id)
  })

  it('strips ids back to the plain clip shape', () => {
    expect(stripClipIds(withClipIds([{ videoId: 'a', start: 0, end: 1 }]))).toEqual([
      { videoId: 'a', start: 0, end: 1 },
    ])
  })
})
