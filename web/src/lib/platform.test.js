import { describe, it, expect } from 'vitest'
import { isIOS } from './platform.js'

describe('isIOS', () => {
  it('detects iPhone and iPod', () => {
    expect(isIOS({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 })).toBe(true)
    expect(isIOS({ userAgent: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)', platform: 'iPod', maxTouchPoints: 5 })).toBe(true)
  })

  it('detects iPadOS, which reports itself as a Mac with a touchscreen', () => {
    expect(isIOS({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true)
  })

  it('treats desktop Mac and Windows as not iOS', () => {
    expect(isIOS({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false)
    expect(isIOS({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32', maxTouchPoints: 0 })).toBe(false)
  })
})
