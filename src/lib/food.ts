import { ALLERGENS, FOODS, FOOD_BY_ID, type AllergenCode, type Food } from '@/data/foods'
import type { FoodIntro, FoodIntroStatus, Meal } from '@/db/types'
import { DAY_MS } from './time'

export const OBSERVE_DAYS = 3
/** Як довго «введений» алерген може не з'являтися в раціоні до нагадування. ЧЕРНЕТКА. */
export const ALLERGEN_REMIND_DAYS = 7

export type FoodStatus = 'new' | FoodIntroStatus

const t = (iso: string) => new Date(iso).getTime()

/** Останнє введення кожного продукту. */
export function latestIntros(intros: FoodIntro[]) {
  const m = new Map<string, FoodIntro>()
  for (const i of intros) {
    if (i.deleted_at) continue
    const prev = m.get(i.food_id)
    if (!prev || prev.started_at < i.started_at) m.set(i.food_id, i)
  }
  return m
}

export function statusOf(foodId: string, latest: Map<string, FoodIntro>): FoodStatus {
  return latest.get(foodId)?.status ?? 'new'
}

/**
 * Активне спостереження. Триває, доки батьки не позначать результат:
 * після 3 діб застосунок питає «як пройшло?», але новий продукт не пропонує.
 */
export function activeObservation(intros: FoodIntro[]) {
  return [...latestIntros(intros).values()].find((i) => i.status === 'observing') ?? null
}

export function observationProgress(intro: FoodIntro, now = Date.now()) {
  const elapsed = now - t(intro.started_at)
  const day = Math.max(1, Math.min(OBSERVE_DAYS, Math.floor(elapsed / DAY_MS) + 1))
  return { day, done: now >= t(intro.observe_until), leftMs: Math.max(0, t(intro.observe_until) - now) }
}

/** «Наступний новий продукт»: порожньо, поки триває спостереження (ТЗ 3.2). */
export function suggestNext(intros: FoodIntro[], ageMonths: number, limit = 3): Food[] {
  if (activeObservation(intros)) return []
  const latest = latestIntros(intros)
  const fresh = FOODS.filter((f) => f.min_age_months <= ageMonths && !latest.has(f.id))
  const postponed = FOODS.filter((f) => f.min_age_months <= ageMonths && latest.get(f.id)?.status === 'postponed')
  return [...fresh, ...postponed].slice(0, limit)
}

export interface AllergenState {
  code: AllergenCode
  name: string
  emoji: string
  foods: Food[]
  status: FoodStatus
  lastGiven: number | null
  remind: boolean
}

/** Трекер 9 алергенів: статус, коли давали востаннє, чи нагадати. */
export function allergenStates(intros: FoodIntro[], meals: Meal[], now = Date.now()): AllergenState[] {
  const latest = latestIntros(intros)
  const rank: Record<FoodStatus, number> = { reaction: 4, introduced: 3, observing: 2, postponed: 1, new: 0 }

  return ALLERGENS.map((a) => {
    const foods = FOODS.filter((f) => f.allergen_code === a.code)
    let status: FoodStatus = 'new'
    let lastGiven: number | null = null
    for (const food of foods) {
      const intro = latest.get(food.id)
      if (!intro) continue
      if (rank[intro.status] > rank[status]) status = intro.status
      lastGiven = Math.max(lastGiven ?? 0, t(intro.started_at))
    }
    for (const meal of meals) {
      if (meal.deleted_at) continue
      if (meal.items.some((it) => FOOD_BY_ID.get(it.food_id)?.allergen_code === a.code)) {
        lastGiven = Math.max(lastGiven ?? 0, t(meal.at))
      }
    }
    const remind = status === 'introduced' && lastGiven !== null && now - lastGiven > ALLERGEN_REMIND_DAYS * DAY_MS
    return { ...a, foods, status, lastGiven, remind }
  })
}

/** Продукти, які можна вільно давати в прийомі їжі: введені + той, що зараз спостерігаємо. */
export function mealCandidates(intros: FoodIntro[]): Food[] {
  const latest = latestIntros(intros)
  return FOODS.filter((f) => {
    const s = latest.get(f.id)?.status
    return s === 'introduced' || s === 'observing'
  })
}
