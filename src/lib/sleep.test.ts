import { describe, expect, it } from 'vitest'
import { daySummary, sleepForecast, transitionHint, type SleepLike } from './sleep'
import { getAge } from './age'

const at = (h: number, m = 0, dayOffset = 0) => {
  const d = new Date(2026, 10, 5 + dayOffset, h, m)
  return d.toISOString()
}
const ms = (iso: string) => new Date(iso).getTime()

describe('sleepForecast', () => {
  it('sleeping when there is an active sleep', () => {
    const f = sleepForecast([{ start_at: at(10), end_at: null, kind: 'nap' }], 7, ms(at(10, 30)))
    expect(f.state).toBe('sleeping')
  })

  it('first nap after night uses the shortest window (7 міс: 2 год)', () => {
    const sleeps: SleepLike[] = [{ start_at: at(20, 0, -1), end_at: at(7), kind: 'night' }]
    const f = sleepForecast(sleeps, 7, ms(at(8)))
    expect(f.state).toBe('awake')
    if (f.state === 'awake') {
      expect(f.target).toBe(ms(at(9)))
      expect(f.nextKind).toBe('nap')
    }
  })

  it('after all naps the next sleep is night with the longest window', () => {
    const sleeps: SleepLike[] = [
      { start_at: at(20, 0, -1), end_at: at(7), kind: 'night' },
      { start_at: at(9), end_at: at(10), kind: 'nap' },
      { start_at: at(12, 30), end_at: at(14), kind: 'nap' },
      { start_at: at(16, 30), end_at: at(17), kind: 'nap' },
    ]
    const f = sleepForecast(sleeps, 7, ms(at(18)))
    if (f.state !== 'awake') throw new Error(f.state)
    expect(f.nextKind).toBe('night')
    expect(f.target).toBe(ms(at(20))) // 17:00 + 3 год
  })

  it('overdue after the upper bound', () => {
    const f = sleepForecast([{ start_at: at(20, 0, -1), end_at: at(7), kind: 'night' }], 7, ms(at(9, 30)))
    expect(f.state).toBe('overdue')
  })

  it('ignores soft-deleted records', () => {
    const f = sleepForecast([{ start_at: at(10), end_at: null, kind: 'nap', deleted_at: at(10, 5) }], 7, ms(at(11)))
    expect(f.state).toBe('unknown')
  })
})

describe('daySummary', () => {
  it('clips a night sleep across midnight', () => {
    const sleeps: SleepLike[] = [
      { start_at: at(20, 0, -1), end_at: at(6), kind: 'night', wake_ups: 2 },
      { start_at: at(10), end_at: at(11, 30), kind: 'nap' },
    ]
    const s = daySummary(sleeps, ms(at(0)), ms(at(23)))
    expect(s.nightMs).toBe(6 * 3600_000)
    expect(s.dayMs).toBe(90 * 60_000)
    expect(s.naps).toBe(1)
    expect(s.wakeUps).toBe(2)
  })
})

describe('transitionHint', () => {
  it('suggests 3→2 when most recent days had 2 naps at 7+ months', () => {
    const sleeps: SleepLike[] = []
    for (let d = 1; d <= 4; d++) {
      sleeps.push({ start_at: at(9, 0, -d), end_at: at(10, 0, -d), kind: 'nap' })
      sleeps.push({ start_at: at(13, 0, -d), end_at: at(14, 0, -d), kind: 'nap' })
    }
    expect(transitionHint(sleeps, 7, ms(at(12)))).toBe('3to2')
    expect(transitionHint(sleeps, 6, ms(at(12)))).toBe(null)
  })
})

describe('getAge', () => {
  it('months and weeks', () => {
    expect(getAge('2026-03-20', 0, new Date(2026, 10, 5))).toMatchObject({ months: 7, weeks: 2 })
  })
  it('corrected age for preterm', () => {
    expect(getAge('2026-03-20', 4, new Date(2026, 10, 5)).months).toBe(6)
  })
})
