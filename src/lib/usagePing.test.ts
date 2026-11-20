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
})
