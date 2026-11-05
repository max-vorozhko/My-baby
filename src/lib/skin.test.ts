import { describe, expect, it } from 'vitest'
import type { FoodIntro, ItchLevel, SkinCare, SkinCheck } from '@/db/types'
import { isoDate, itchSleepLink, skinSeries, triggerCounts } from './skin'
import { DAY_MS, startOfDay } from './time'

const base = { family_id: 'f', created_by: 'u', created_at: '', updated_at: '', deleted_at: null, child_id: 'c' }
const NOW = new Date(2026, 10, 10, 20, 0).getTime()
const day = (offset: number) => startOfDay(NOW) - offset * DAY_MS
const check = (offset: number, itch: ItchLevel, triggers: SkinCheck['triggers'] = []): SkinCheck => ({
  ...base, id: 'k' + offset, date: isoDate(day(offset)), itch, zones: [], signs: [], triggers, photo: null, note: '',
})
const cream = (offset: number, h: number): SkinCare => ({
  ...base, id: `c${offset}${h}`, at: new Date(day(offset) + h * 3600_000).toISOString(), kind: 'emollient', product: '', note: '',
})

describe('skinSeries', () => {
  it('counts emollients per day and marks flares', () => {
    const s = skinSeries({
      checks: [check(2, 1), check(1, 2), check(0, 3)],
      care: [cream(0, 8), cream(0, 20), cream(1, 9)],
      sleeps: [], intros: [], days: 3, now: NOW,
    })
    expect(s.map((d) => d.emollients)).toEqual([0, 1, 2])
    expect(s.map((d) => d.flare)).toEqual([false, true, false])
  })

  it('links a flare to a food started within 48h before', () => {
    const intro: FoodIntro = {
      ...base, id: 'i', food_id: 'egg', status: 'observing',
      started_at: new Date(day(2) + 12 * 3600_000).toISOString(), observe_until: '',
    }
    const s = skinSeries({ checks: [check(1, 3)], care: [], sleeps: [], intros: [intro], days: 3, now: NOW })
    expect(s[1].newFoods).toEqual(['egg']) // вчора: продукт почали позавчора
    expect(s[2].newFoods).toEqual([]) // сьогодні: вже понад 48 год
  })

  it('ignores soft-deleted records', () => {
    const s = skinSeries({ checks: [{ ...check(0, 3), deleted_at: 'x' }], care: [], sleeps: [], intros: [], days: 1, now: NOW })
    expect(s[0].itch).toBe(null)
  })
})

describe('itchSleepLink', () => {
  it('needs at least 3 days in each group', () => {
    const s = skinSeries({ checks: [check(0, 3), check(1, 0)], care: [], sleeps: [], intros: [], days: 2, now: NOW })
    expect(itchSleepLink(s)).toBe(null)
  })

  it('averages wake-ups for strong vs calm itch days', () => {
    const sleeps = [0, 1, 2, 3, 4, 5].map((o) => ({
      start_at: new Date(day(o) - 4 * 3600_000).toISOString(),
      end_at: new Date(day(o) + 6 * 3600_000).toISOString(),
      kind: 'night' as const, wake_ups: o < 3 ? 4 : 1,
    }))
    const checks = [check(0, 3), check(1, 2), check(2, 3), check(3, 0), check(4, 1), check(5, 0)]
    const s = skinSeries({ checks, care: [], sleeps, intros: [], days: 6, now: NOW })
    expect(itchSleepLink(s)).toEqual({ strong: 4, calm: 1 })
  })
})

describe('triggerCounts', () => {
  it('ranks triggers by bad days', () => {
    const r = triggerCounts([check(0, 3, ['overheat']), check(1, 2, ['overheat', 'teeth']), check(2, 0, ['teeth', 'teeth'])])
    expect(r[0]).toMatchObject({ trigger: 'overheat', onBadDays: 2 })
  })
})
