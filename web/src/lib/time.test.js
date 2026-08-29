import { describe, it, expect } from 'vitest'
import {
  formatTime,
  calculateTotalSeconds,
  formatClockTime,
  formatCountdown,
  secondsUntilPlaylistStart,
} from './time.js'

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

describe('formatClockTime', () => {
  it('formats a morning time with AM', () => {
    expect(formatClockTime(new Date(2026, 0, 1, 9, 5, 3))).toBe('9:05:03 AM')
  })

  it('formats an afternoon time with PM and 12-hour rollover', () => {
    expect(formatClockTime(new Date(2026, 0, 1, 14, 32, 7))).toBe('2:32:07 PM')
  })

  it('formats noon as 12 PM', () => {
    expect(formatClockTime(new Date(2026, 0, 1, 12, 0, 0))).toBe('12:00:00 PM')
  })

  it('formats midnight as 12 AM', () => {
    expect(formatClockTime(new Date(2026, 0, 1, 0, 0, 0))).toBe('12:00:00 AM')
  })
})

describe('formatCountdown', () => {
  it('zero-pads minutes and seconds', () => {
    expect(formatCountdown(45)).toBe('00:45')
  })

  it('formats minutes under an hour', () => {
    expect(formatCountdown(2699)).toBe('44:59')
  })

  it('formats zero as 00:00', () => {
    expect(formatCountdown(0)).toBe('00:00')
  })
})

describe('secondsUntilPlaylistStart', () => {
  it('counts down to the start-of-hour offset for a 15 minute playlist', () => {
    // 15 min playlist starts at :45 past the hour; at :10 past, 35 min = 2100s remain
    const now = new Date(2026, 0, 1, 3, 10, 0)
    expect(secondsUntilPlaylistStart(15 * 60, now)).toBe(35 * 60)
  })

  it('returns 0 exactly at the start offset', () => {
    const now = new Date(2026, 0, 1, 3, 45, 0)
    expect(secondsUntilPlaylistStart(15 * 60, now)).toBe(0)
  })

  it('wraps to next hour once past the start offset', () => {
    // 15 min playlist starts at :45; at :50 past, next start is 55 min away
    const now = new Date(2026, 0, 1, 3, 50, 0)
    expect(secondsUntilPlaylistStart(15 * 60, now)).toBe(55 * 60)
  })

  it('always returns 0 when total time is an hour or more', () => {
    const now = new Date(2026, 0, 1, 3, 22, 0)
    expect(secondsUntilPlaylistStart(3600, now)).toBe(0)
    expect(secondsUntilPlaylistStart(4000, now)).toBe(0)
  })
})
