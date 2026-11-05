import { describe, expect, it } from 'vitest'
import type { FoodIntro, Meal } from '@/db/types'
import { activeObservation, allergenStates, observationProgress, suggestNext } from './food'
import { DAY_MS } from './time'

const base = { family_id: 'f', created_by: 'u', created_at: '', updated_at: '', deleted_at: null, child_id: 'c' }
const NOW = new Date('2026-11-05T12:00:00Z').getTime()
const iso = (ms: number) => new Date(ms).toISOString()
const intro = (food_id: string, status: FoodIntro['status'], startedMs: number): FoodIntro => ({
  ...base, id: food_id + startedMs, food_id, status, started_at: iso(startedMs), observe_until: iso(startedMs + 3 * DAY_MS),
})

describe('observation', () => {
  it('blocks suggestions while a food is being observed', () => {
    const intros = [intro('zucchini', 'observing', NOW - DAY_MS)]
    expect(activeObservation(intros)?.food_id).toBe('zucchini')
    expect(suggestNext(intros, 7)).toEqual([])
  })

  it('progress: day 2 of 3, not done', () => {
    const p = observationProgress(intro('zucchini', 'observing', NOW - 1.5 * DAY_MS), NOW)
    expect(p).toMatchObject({ day: 2, done: false })
  })

  it('day is at least 1 even if the clock lags behind the start', () => {
    expect(observationProgress(intro('zucchini', 'observing', NOW + 30_000), NOW).day).toBe(1)
  })

  it('done after 3 days but still blocks until resolved', () => {
    const intros = [intro('zucchini', 'observing', NOW - 3.2 * DAY_MS)]
    expect(observationProgress(intros[0], NOW).done).toBe(true)
    expect(suggestNext(intros, 7)).toEqual([])
  })

  it('suggests next untried age-appropriate foods after resolving', () => {
    const intros = [intro('zucchini', 'introduced', NOW - 4 * DAY_MS)]
    const next = suggestNext(intros, 6).map((f) => f.id)
    expect(next).not.toContain('zucchini')
    expect(next[0]).toBe('broccoli')
  })

  it('never suggests honey before 12 months', () => {
    const all = suggestNext([], 11, 100).map((f) => f.id)
    expect(all).not.toContain('honey')
    expect(suggestNext([], 12, 100).map((f) => f.id)).toContain('honey')
  })

  it('uses only the latest intro per food', () => {
    const intros = [intro('egg', 'postponed', NOW - 10 * DAY_MS), intro('egg', 'observing', NOW - DAY_MS)]
    expect(activeObservation(intros)?.food_id).toBe('egg')
  })
})

describe('allergenStates', () => {
  it('reminds when an introduced allergen was not given for over a week', () => {
    const intros = [intro('egg', 'introduced', NOW - 20 * DAY_MS)]
    const meals: Meal[] = [{ ...base, id: 'm', at: iso(NOW - 9 * DAY_MS), items: [{ food_id: 'egg', amount: 2, unit: 'spoon', liked: true }], note: '' }]
    const egg = allergenStates(intros, meals, NOW).find((a) => a.code === 'egg')!
    expect(egg.status).toBe('introduced')
    expect(egg.remind).toBe(true)
    expect(allergenStates(intros, [{ ...meals[0], at: iso(NOW - DAY_MS) }], NOW).find((a) => a.code === 'egg')!.remind).toBe(false)
  })

  it('reaction outranks other statuses for the allergen', () => {
    const intros = [intro('yogurt', 'introduced', NOW - 9 * DAY_MS), intro('cottage_cheese', 'reaction', NOW - 2 * DAY_MS)]
    expect(allergenStates(intros, [], NOW).find((a) => a.code === 'milk')!.status).toBe('reaction')
  })

  it('covers all 9 allergens with at least one food', () => {
    const s = allergenStates([], [], NOW)
    expect(s).toHaveLength(9)
    expect(s.every((a) => a.foods.length > 0)).toBe(true)
  })
})
