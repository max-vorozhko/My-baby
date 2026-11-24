import { describe, expect, it } from 'vitest'
import { localDay, shouldPing } from './usagePing'

describe('usage ping cadence', () => {
  it('pings once per local day', () => {
    const d = new Date(2026, 10, 20, 23, 50)
    expect(localDay(d)).toBe('2026-11-20')
    expect(shouldPing(null, '2026-11-20')).toBe(true)
    expect(shouldPing('2026-11-20', '2026-11-20')).toBe(false)
    expect(shouldPing('2026-11-19', '2026-11-20')).toBe(true)
  })

  it('pings again the same day after Google sign-in, but not after sign-out', () => {
    expect(shouldPing('2026-11-20', '2026-11-20', true)).toBe(true)
    expect(shouldPing('2026-11-20|g', '2026-11-20', true)).toBe(false)
    expect(shouldPing('2026-11-20|g', '2026-11-20', false)).toBe(false)
    expect(shouldPing('2026-11-19|g', '2026-11-20', true)).toBe(true)
  })
})
