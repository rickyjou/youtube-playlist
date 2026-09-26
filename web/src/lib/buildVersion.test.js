import { describe, it, expect } from 'vitest'
import { formatBuildVersion } from './buildVersion.js'

describe('formatBuildVersion', () => {
  it('combines the UTC build timestamp with the build number', () => {
    expect(formatBuildVersion(new Date('2026-09-05T03:07:00Z'), '42')).toBe('v2026.09.05-0307 (build 42)')
  })

  it('labels local builds without a build number as dev', () => {
    expect(formatBuildVersion(new Date('2026-12-31T23:59:00Z'), undefined)).toBe('v2026.12.31-2359 (build dev)')
  })
})
