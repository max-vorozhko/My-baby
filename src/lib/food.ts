import { ALLERGENS, allFoods, getFood, type AllergenCode } from '@/data/foods'
import type { FoodIntro, Meal } from '@/db/types'
import { DAY_MS } from './time'

/**
 * Прикорм як щоденник: лише факти з записів батьків.
 * Статус продукту: позначка батьків (останні), інакше «пробували», якщо давали.
 * Таблиця foodIntros зберігає позначки: introduced/observing → «ок», reaction, postponed → «не підійшло».
 */
export type FoodStatus = 'new' | 'tried' | 'reaction' | 'disliked'

const t = (iso: string) => new Date(iso).getTime()

export interface FoodStat {
  foodId: string
  count: number
  spoons: number
  liked: number
  disliked: number
  first: number
  last: number
}

/** Скільки разів і коли давали кожен продукт за період [from, to). */
export function foodStats(meals: Meal[], from = 0, to = Infinity): Map<string, FoodStat> {
  const m = new Map<string, FoodStat>()
  for (const meal of meals) {
    if (meal.deleted_at) continue
    const at = t(meal.at)
    if (at < from || at >= to) continue
    for (const it of meal.items) {
      const s = m.get(it.food_id) ?? { foodId: it.food_id, count: 0, spoons: 0, liked: 0, disliked: 0, first: at, last: at }
      s.count++
      s.spoons += it.unit === 'spoon' && it.amount ? it.amount : 0
      if (it.liked === true) s.liked++
      if (it.liked === false) s.disliked++
      s.first = Math.min(s.first, at)
      s.last = Math.max(s.last, at)
      m.set(it.food_id, s)
    }
  }
  return m
}

/** Найчастіші продукти за період: «броколі — 10, морква — 7». */
export function topFoods(meals: Meal[], from = 0, to = Infinity) {
  return [...foodStats(meals, from, to).values()].sort((a, b) => b.count - a.count || b.last - a.last)
}

/** Остання позначка батьків для кожного продукту. */
export function latestMarks(marks: FoodIntro[]) {
  const m = new Map<string, FoodIntro>()
  for (const i of marks) {
    if (i.deleted_at) continue
    const prev = m.get(i.food_id)
    if (!prev || prev.started_at < i.started_at) m.set(i.food_id, i)
  }
  return m
}

export function statusOf(foodId: string, marks: Map<string, FoodIntro>, everGiven: Map<string, FoodStat>): FoodStatus {
  const mark = marks.get(foodId)?.status
  if (mark === 'reaction') return 'reaction'
  if (mark === 'postponed') return 'disliked'
  if (mark === 'introduced' || mark === 'observing' || everGiven.has(foodId)) return 'tried'
  return 'new'
}

/** Продукти, які вперше спробували за останні `days` днів, із кількістю днів від першої проби. */
export function recentlyNew(meals: Meal[], now = Date.now(), days = 7) {
  return [...foodStats(meals).values()]
    .filter((s) => now - s.first < days * DAY_MS)
    .sort((a, b) => b.first - a.first)
    .map((s) => ({ ...s, daysSince: Math.max(0, Math.floor((now - s.first) / DAY_MS)) }))
}

export interface AllergenRow {
  code: AllergenCode
  name: string
  emoji: string
  status: FoodStatus
  count: number
  last: number | null
}

/** 9 алергенів: чи пробували, скільки разів за період, коли востаннє. Без нагадувань. */
export function allergenRows(meals: Meal[], marks: FoodIntro[], from = 0, to = Infinity): AllergenRow[] {
  const latest = latestMarks(marks)
  const ever = foodStats(meals)
  const period = foodStats(meals, from, to)
  const rank: Record<FoodStatus, number> = { reaction: 3, disliked: 2, tried: 1, new: 0 }
  return ALLERGENS.map((a) => {
    const foods = allFoods().filter((f) => f.allergen_code === a.code)
    let status: FoodStatus = 'new'
    let count = 0
    let last: number | null = null
    for (const f of foods) {
      const s = statusOf(f.id, latest, ever)
      if (rank[s] > rank[status]) status = s
      count += period.get(f.id)?.count ?? 0
      const l = ever.get(f.id)?.last
      if (l) last = Math.max(last ?? 0, l)
    }
    return { ...a, status, count, last }
  })
}

/** Скільки різних продуктів давали за період і скільки з них нові. */
export function varietySummary(meals: Meal[], from: number, to = Infinity) {
  const ever = foodStats(meals)
  const period = foodStats(meals, from, to)
  const fresh = [...period.keys()].filter((id) => (ever.get(id)?.first ?? 0) >= from).length
  return { distinct: period.size, fresh, meals: meals.filter((m) => !m.deleted_at && t(m.at) >= from && t(m.at) < to).length }
}

export const isAllergen = (foodId: string) => !!getFood(foodId)?.allergen_code
