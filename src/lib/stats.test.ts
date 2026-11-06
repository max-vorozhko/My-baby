import { describe, expect, it } from 'vitest'
import type { Feeding, SkinCare, SkinCheck } from '@/db/types'
import { feedingStats, skinStats } from './stats'

const base = { family_id: 'f', created_by: 'u', created_at: '', updated_at: '', deleted_at: null, child_id: 'c' }
const d = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m).toISOString()
const breast = (day: number, h: number, side: 'left' | 'right', min = 10): Feeding => ({
  ...base, id: `b${day}${h}`, kind: 'breast', start_at: d(day, h), end_at: d(day, h, min), side, bottle_content: null, amount_ml: null, note: '',
})
const bottle = (day: number, h: number, ml: number): Feeding => ({
  ...base, id: `o${day}${h}`, kind: 'bottle', start_at: d(day, h), end_at: d(day, h), side: null, bottle_content: 'formula', amount_ml: ml, note: '',
})

describe('feedingStats', () => {
  it('per-day averages over days with records and side share', () => {
    const f = [breast(1, 8, 'left'), breast(1, 12, 'right', 20), breast(2, 8, 'left'), bottle(2, 20, 150), bottle(1, 20, 90)]
    const s = feedingStats(f, new Date(2026, 10, 1).getTime(), new Date(2026, 10, 3).getTime())
    expect(s).toMatchObject({ days: 2, breastPerDay: 1.5, bottlesPerDay: 1, mlPerDay: 120 })
    expect(s.leftShare).toBeCloseTo(2 / 3)
    expect(Math.round(s.breastAvgMin)).toBe(13)
  })
})

describe('skinStats', () => {
  it('counts days per itch level, creams per day and top zones', () => {
    const chk = (date: string, itch: 0 | 1 | 2 | 3, zones: SkinCheck['zones']): SkinCheck => ({
      ...base, id: date, date, itch, zones, signs: [], triggers: [], photo: null, note: '',
    })
    const cream = (day: number, h: number): SkinCare => ({ ...base, id: `c${day}${h}`, at: d(day, h), kind: 'emollient', product: '', note: '' })
    const s = skinStats(
      [chk('2026-11-01', 1, ['face']), chk('2026-11-02', 3, ['face', 'elbows']), chk('2026-10-20', 3, ['legs'])],
      [cream(1, 8), cream(1, 20), cream(2, 9)],
      '2026-11-01', new Date(2026, 10, 1).getTime(), new Date(2026, 10, 2, 22).getTime(),
    )
    expect(s.itchDays).toEqual({ 0: 0, 1: 1, 2: 0, 3: 1 })
    expect(s.creamsPerDay).toBe(1.5)
    expect(s.zones[0]).toEqual(['face', 2])
  })
})
