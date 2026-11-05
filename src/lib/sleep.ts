import { wakeWindowFor, type WakeWindow } from '@/data/wakeWindows'
import type { SleepKind } from '@/db/types'
import { DAY_MS, HOUR, MIN, startOfDay } from './time'

export interface SleepLike {
  start_at: string
  end_at: string | null
  kind: SleepKind
  wake_ups?: number
  deleted_at?: string | null
}

const t = (iso: string) => new Date(iso).getTime()
const alive = <T extends SleepLike>(s: T[]) => s.filter((x) => !x.deleted_at)

/** Нічний сон за замовчуванням, якщо засинає з 19:00 до 5:00. */
export function defaultKind(at = new Date()): SleepKind {
  const h = at.getHours()
  return h >= 19 || h < 5 ? 'night' : 'nap'
}

export type Forecast =
  | { state: 'sleeping'; since: number; kind: SleepKind }
  | { state: 'unknown'; ww: WakeWindow }
  | {
      state: 'awake' | 'overdue'
      ww: WakeWindow
      lastEnd: number
      awakeMs: number
      target: number
      lo: number
      hi: number
      nextKind: SleepKind
      napsToday: number
    }

/** Скільки денних снів уже було від ранкового пробудження. */
function napsSinceMorning(sleeps: SleepLike[], now: number) {
  const nights = sleeps
    .filter((s) => s.kind === 'night' && s.end_at && t(s.end_at) <= now && now - t(s.end_at) < 16 * HOUR)
    .sort((a, b) => t(b.end_at!) - t(a.end_at!))
  const anchor = nights[0] ? t(nights[0].end_at!) : startOfDay(now)
  return sleeps.filter((s) => s.kind === 'nap' && t(s.start_at) >= anchor && t(s.start_at) <= now).length
}

/**
 * Прогноз наступного сну. Перше вікно дня — коротке (min), останнє перед
 * нічним сном — найдовше (max), між ними — лінійно.
 */
export function sleepForecast(all: SleepLike[], ageMonths: number, now = Date.now()): Forecast {
  const sleeps = alive(all)
  const active = sleeps.find((s) => !s.end_at)
  if (active) return { state: 'sleeping', since: t(active.start_at), kind: active.kind }

  const ww = wakeWindowFor(ageMonths)
  const ended = sleeps.filter((s) => s.end_at && t(s.end_at) <= now).sort((a, b) => t(b.end_at!) - t(a.end_at!))
  const last = ended[0]
  if (!last || now - t(last.end_at!) > 12 * HOUR) return { state: 'unknown', ww }

  const lastEnd = t(last.end_at!)
  const napsToday = last.kind === 'night' ? 0 : napsSinceMorning(sleeps, now)
  const nextKind: SleepKind = napsToday >= ww.naps_per_day ? 'night' : 'nap'
  const frac = nextKind === 'night' ? 1 : napsToday / ww.naps_per_day
  const windowMin = Math.round(ww.min_min + (ww.max_min - ww.min_min) * frac)
  const target = lastEnd + windowMin * MIN
  const lo = target - 15 * MIN
  const hi = target + 15 * MIN

  return {
    state: now > hi ? 'overdue' : 'awake',
    ww, lastEnd, awakeMs: now - lastEnd, target, lo, hi, nextKind, napsToday,
  }
}

export interface DaySummary {
  totalMs: number
  dayMs: number
  nightMs: number
  naps: number
  wakeUps: number
}

/** Підсумок за календарну добу [00:00, 24:00): тривалість обрізається межами доби. */
export function daySummary(all: SleepLike[], dayStart: number, now = Date.now()): DaySummary {
  const dayEnd = dayStart + DAY_MS
  const res: DaySummary = { totalMs: 0, dayMs: 0, nightMs: 0, naps: 0, wakeUps: 0 }
  for (const s of alive(all)) {
    const a = Math.max(t(s.start_at), dayStart)
    const b = Math.min(s.end_at ? t(s.end_at) : now, dayEnd)
    if (b <= a) continue
    const d = b - a
    res.totalMs += d
    if (s.kind === 'nap') {
      res.dayMs += d
      if (t(s.start_at) >= dayStart) res.naps += 1
    } else {
      res.nightMs += d
      const endT = s.end_at ? t(s.end_at) : now
      if (endT >= dayStart && endT < dayEnd) res.wakeUps += s.wake_ups ?? 0
    }
  }
  return res
}

export type TransitionHint = '3to2' | '2to1' | null

/**
 * Підказка переходу на менше снів (ТЗ 3.3) за фактичними даними:
 * якщо щонайменше 3 з останніх 5 записаних днів мали на 1 сон менше, ніж у таблиці.
 */
export function transitionHint(all: SleepLike[], ageMonths: number, now = Date.now()): TransitionHint {
  const ww = wakeWindowFor(ageMonths)
  let target: TransitionHint = null
  if (ww.naps_per_day === 3 && ageMonths >= 7) target = '3to2'
  else if (ww.naps_per_day === 2 && ageMonths >= 12) target = '2to1'
  if (!target) return null
  const fewer = ww.naps_per_day - 1

  const sleeps = alive(all)
  const today = startOfDay(now)
  const days: number[] = []
  for (let i = 1; i <= 10 && days.length < 5; i++) {
    const ds = today - i * DAY_MS
    const has = sleeps.some((s) => t(s.start_at) >= ds && t(s.start_at) < ds + DAY_MS)
    if (has) days.push(daySummary(sleeps, ds, now).naps)
  }
  if (days.length < 3) return null
  return days.filter((n) => n <= fewer).length >= 3 ? target : null
}
