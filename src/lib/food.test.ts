import { describe, expect, it } from 'vitest'
import type { FoodIntro, Meal } from '@/db/types'
import { allergenRows, foodStats, latestMarks, recentlyNew, statusOf, topFoods, varietySummary } from './food'
import { DAY_MS } from './time'

const base = { family_id: 'f', created_by: 'u', created_at: '', updated_at: '', deleted_at: null, child_id: 'c' }
const NOW = new Date('2026-11-30T12:00:00Z').getTime()
const iso = (ms: number) => new Date(ms).toISOString()
let n = 0
const meal = (daysAgo: number, ...foods: [string, number?, boolean?][]): Meal => ({
  ...base, id: 'm' + n++, at: iso(NOW - daysAgo * DAY_MS), note: '',
  items: foods.map(([food_id, amount = 2, liked]) => ({ food_id, amount, unit: 'spoon' as const, liked: liked ?? null })),
})
const mark = (food_id: string, status: FoodIntro['status'], daysAgo: number): FoodIntro => ({
  ...base, id: food_id + daysAgo, food_id, status, started_at: iso(NOW - daysAgo * DAY_MS), observe_until: iso(NOW),
})

describe('foodStats / topFoods', () => {
  const meals = [
    ...Array.from({ length: 10 }, (_, i) => meal(i, ['broccoli', 3, true])),
    ...Array.from({ length: 7 }, (_, i) => meal(i + 1, ['carrot', 2, i % 2 === 0])),
    meal(40, ['broccoli']),
  ]
  it('counts how many times each food was given in the period', () => {
    const top = topFoods(meals, NOW - 30 * DAY_MS)
    expect(top.map((s) => [s.foodId, s.count])).toEqual([['broccoli', 10], ['carrot', 7]])
    expect(top[0]).toMatchObject({ spoons: 30, liked: 10 })
    expect(top[1]).toMatchObject({ liked: 4, disliked: 3 })
  })
  it('all-time includes older meals', () => {
    expect(foodStats(meals).get('broccoli')!.count).toBe(11)
  })
  it('ignores soft-deleted meals', () => {
    expect(foodStats([{ ...meal(0, ['egg']), deleted_at: 'x' }]).size).toBe(0)
  })
})

describe('status', () => {
  it('parent mark wins, otherwise tried when given', () => {
    const ever = foodStats([meal(1, ['egg']), meal(1, ['pear'])])
    const marks = latestMarks([mark('egg', 'introduced', 5), mark('egg', 'reaction', 1)])
    expect(statusOf('egg', marks, ever)).toBe('reaction')
    expect(statusOf('pear', marks, ever)).toBe('tried')
    expect(statusOf('apple', marks, ever)).toBe('new')
  })
})

describe('recentlyNew', () => {
  it('lists foods first tried in the last 7 days with days since first try', () => {
    const r = recentlyNew([meal(2, ['egg']), meal(0, ['egg']), meal(20, ['pear'])], NOW)
    expect(r.map((x) => [x.foodId, x.daysSince, x.count])).toEqual([['egg', 2, 2]])
  })
})

describe('allergenRows / variety', () => {
  it('counts allergen servings in the period and status', () => {
    const meals = [meal(1, ['egg']), meal(3, ['egg'], ['yogurt']), meal(50, ['fish'])]
    const rows = allergenRows(meals, [], NOW - 30 * DAY_MS)
    expect(rows).toHaveLength(9)
    expect(rows.find((r) => r.code === 'egg')).toMatchObject({ status: 'tried', count: 2 })
    expect(rows.find((r) => r.code === 'milk')!.count).toBe(1)
    expect(rows.find((r) => r.code === 'fish')).toMatchObject({ status: 'tried', count: 0 })
    expect(rows.find((r) => r.code === 'soy')!.status).toBe('new')
  })
  it('variety: distinct foods and how many are new in the period', () => {
    const meals = [meal(40, ['pear']), meal(5, ['pear'], ['egg']), meal(2, ['beef'])]
    expect(varietySummary(meals, NOW - 30 * DAY_MS)).toEqual({ distinct: 3, fresh: 2, meals: 2 })
  })
})
