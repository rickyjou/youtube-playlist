import { describe, it, expect } from 'vitest'
import { formatTime, calculateTotalSeconds } from './time.js'

describe('formatTime', () => {
  it('formats seconds under a minute', () => {
    expect(formatTime(45)).toBe('0:45')
  })

  it('pads seconds under 10', () => {
    expect(formatTime(65)).toBe('1:05')
  })

  it('formats multiple minutes', () => {
    expect(formatTime(725)).toBe('12:05')
  })
})

describe('calculateTotalSeconds', () => {
  it('sums durations across clips', () => {
    const playlist = [
      { videoId: 'a', start: 0, end: 100 },
      { videoId: 'b', start: 10, end: 40 },
    ]
    expect(calculateTotalSeconds(playlist)).toBe(130)
  })

  it('returns 0 for an empty playlist', () => {
    expect(calculateTotalSeconds([])).toBe(0)
  })
})
