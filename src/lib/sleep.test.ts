import { describe, expect, it } from 'vitest'
import { dayTimeline, daySummary, periodAverages, sleepForecast, sleepPatterns, wakeWindows, type SleepLike } from './sleep'
import { HOUR, MIN } from './time'
import { getAge } from './age'

// Локальний час: 2026-11-10 — «сьогодні».
const at = (h: number, m = 0, d = 0) => new Date(2026, 10, 10 + d, h, m).toISOString()
const ms = (iso: string) => new Date(iso).getTime()

/** Типовий день: ніч 20:00→07:00, сни 09:15–10:15 (після 2:15), 13:00–14:30 (після 2:45), ніч о 18:00+3:30=… */
function typicalDays(n: number, jitter = (i: number) => (i % 3) * 5): SleepLike[] {
  const out: SleepLike[] = []
  for (let i = n; i >= 1; i--) {
    const j = jitter(i)
    out.push({ start_at: at(20, j, -i - 1), end_at: at(7, 0, -i), kind: 'night' })
    out.push({ start_at: at(9, 15 + j, -i), end_at: at(10, 15 + j, -i), kind: 'nap' })
    out.push({ start_at: at(13, 0 + j, -i), end_at: at(14, 30 + j, -i), kind: 'nap' })
  }
  out.push({ start_at: at(20, 0, -1), end_at: at(7, 0, 0), kind: 'night' })
  return out
}

describe('sleepPatterns', () => {
  it('learns typical wake windows per nap and before night from own records', () => {
    const p = sleepPatterns(typicalDays(6), ms(at(8)))
    expect(p.days).toBe(6) // 7 ночей → 6 повних днів між ними
    expect(p.napsPerDay.median).toBe(2)
    expect(p.windowBeforeNap[0].median).toBe(135 + 5) // 09:15+j після 07:00, медіана j=5
    expect(p.windowBeforeNight.median).toBeGreaterThan(300)
    expect(p.bedtime.median).toBeGreaterThanOrEqual(20 * 60)
  })
})

describe('sleepForecast (personal patterns)', () => {
  it('learning when there are not enough days yet', () => {
    const f = sleepForecast(typicalDays(2), ms(at(8)))
    expect(f.state).toBe('learning')
  })

  it('forecasts the first nap from the typical first wake window', () => {
    const f = sleepForecast(typicalDays(7), ms(at(8)))
    if (f.state !== 'awake') throw new Error(f.state)
    expect(f.nextKind).toBe('nap')
    expect(f.napIndex).toBe(0)
    expect(new Date(f.target).getHours()).toBe(9)
    expect(f.lo).toBeLessThan(f.target)
    expect(f.hi).toBeGreaterThan(f.target)
  })

  it('after the typical number of naps the next sleep is night', () => {
    const s = [...typicalDays(7),
      { start_at: at(9, 20), end_at: at(10, 20), kind: 'nap' as const },
      { start_at: at(13, 0), end_at: at(14, 30), kind: 'nap' as const }]
    const f = sleepForecast(s, ms(at(16)))
    if (f.state !== 'awake') throw new Error(f.state)
    expect(f.nextKind).toBe('night')
  })

  it('sleeping when there is an active sleep; ignores deleted', () => {
    expect(sleepForecast([{ start_at: at(10), end_at: null, kind: 'nap' }], ms(at(10, 30))).state).toBe('sleeping')
    expect(sleepForecast([{ start_at: at(10), end_at: null, kind: 'nap', deleted_at: 'x' }], ms(at(11))).state).toBe('no_data')
  })
})

describe('daySummary / periodAverages', () => {
  it('clips a night sleep across midnight', () => {
    const s = daySummary([
      { start_at: at(20, 0, -1), end_at: at(6), kind: 'night', wake_ups: 2 },
      { start_at: at(10), end_at: at(11, 30), kind: 'nap' },
    ], ms(at(0)), ms(at(23)))
    expect(s).toMatchObject({ nightMs: 6 * 3600_000, dayMs: 90 * 60_000, naps: 1, wakeUps: 2 })
  })
  it('averages only days with records', () => {
    const a = periodAverages(typicalDays(3), 7, ms(at(12)))
    expect(a.days).toBe(4)
    expect(a.naps).toBeGreaterThan(1)
  })
})

describe('getAge', () => {
  it('months and weeks; corrected age', () => {
    expect(getAge('2026-03-20', 0, new Date(2026, 10, 5))).toMatchObject({ months: 7, weeks: 2 })
    expect(getAge('2026-03-20', 4, new Date(2026, 10, 5)).months).toBe(6)
  })
})

describe('dayTimeline', () => {
  const day = new Date(2026, 10, 10).getTime()
  const at = (h: number, m = 0) => new Date(day + h * 3600_000 + m * 60_000).toISOString()
  it('обрізає нічний сон межами доби й сортує', () => {
    const segs = dayTimeline([
      { start_at: at(13), end_at: at(14, 30), kind: 'nap' },
      { start_at: at(-3), end_at: at(7), kind: 'night' },
      { start_at: at(21), end_at: at(30), kind: 'night' },
    ], day, day + 2 * 86400_000)
    expect(segs.map((s) => [s.from, s.to, s.kind])).toEqual([[0, 420, 'night'], [780, 870, 'nap'], [1260, 1440, 'night']])
  })
  it('активний сон тягнеться до «зараз»', () => {
    const segs = dayTimeline([{ start_at: at(10), end_at: null, kind: 'nap' }], day, day + 11 * 3600_000)
    expect(segs[0].to).toBe(660)
  })
})

describe('wake windows', () => {
  const d0 = new Date(2026, 10, 25).getTime()
  const at = (h: number, m = 0) => new Date(d0 + h * HOUR + m * MIN).toISOString()
  const night = { start_at: new Date(d0 - 3 * HOUR).toISOString(), end_at: at(7), kind: 'night' as const }
  const nap1 = { start_at: at(9, 30), end_at: at(10, 30), kind: 'nap' as const }
  const nap2 = { start_at: at(13), end_at: at(14), kind: 'nap' as const }

  it('lists gaps between sleeps and the ongoing one', () => {
    const w = wakeWindows([nap2, night, nap1], d0, d0 + 15 * HOUR)
    expect(w.map((x) => [(x.to - x.from) / MIN, x.ongoing])).toEqual([[150, false], [150, false], [60, true]])
  })
  it('no ongoing window while sleeping', () => {
    const w = wakeWindows([night, { start_at: at(9), end_at: null, kind: 'nap' as const }], d0, d0 + 10 * HOUR)
    expect(w).toHaveLength(1)
    expect(w[0].ongoing).toBe(false)
  })
  it('skips implausibly long gaps (missing records)', () => {
    expect(wakeWindows([night], d0, d0 + 21 * HOUR)).toHaveLength(0)
  })
})
