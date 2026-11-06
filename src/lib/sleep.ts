import type { SleepKind } from '@/db/types'
import { DAY_MS, HOUR, MIN, startOfDay } from './time'

/**
 * Сон як щоденник + прогноз ЗА ВЛАСНИМИ ЗАПИСАМИ дитини (без вікових норм).
 * Патерн = медіана і міжквартильний діапазон фактичних проміжків неспання
 * перед 1-м, 2-м, 3-м денним сном і перед нічним сном за останні 14 днів.
 */

export interface SleepLike {
  start_at: string
  end_at: string | null
  kind: SleepKind
  wake_ups?: number
  deleted_at?: string | null
}

const t = (iso: string) => new Date(iso).getTime()
const alive = <T extends SleepLike>(s: T[]) => s.filter((x) => !x.deleted_at)
const ended = <T extends SleepLike>(s: T[]) => alive(s).filter((x) => x.end_at).sort((a, b) => t(a.start_at) - t(b.start_at))

/** Нічний сон за замовчуванням, якщо засинає з 19:00 до 5:00 (батьки можуть змінити). */
export function defaultKind(at = new Date()): SleepKind {
  const h = at.getHours()
  return h >= 19 || h < 5 ? 'night' : 'nap'
}

export function quantile(values: number[], q: number) {
  if (values.length === 0) return NaN
  const s = [...values].sort((a, b) => a - b)
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

export interface Spread { median: number; p25: number; p75: number; n: number }
const spread = (v: number[]): Spread => ({ median: quantile(v, 0.5), p25: quantile(v, 0.25), p75: quantile(v, 0.75), n: v.length })

/** Хвилини від півночі; вечірній час після 12:00 лишається, ранній ніч (00–06) зсувається на +24 год. */
const clockMin = (ms: number, lateShift = false) => {
  const d = new Date(ms)
  const m = d.getHours() * 60 + d.getMinutes()
  return lateShift && m < 6 * 60 ? m + 24 * 60 : m
}

export interface SleepPatterns {
  days: number
  /** Проміжок неспання перед k-м денним сном (хв). */
  windowBeforeNap: Spread[]
  napStart: Spread[]
  napDuration: Spread[]
  /** Проміжок неспання перед нічним сном (хв). */
  windowBeforeNight: Spread
  bedtime: Spread
  wakeTime: Spread
  napsPerDay: Spread
  nightDuration: Spread
}

/** Патерни за останні `days` днів (тільки завершені «дні»: від ранкового пробудження до нічного сну). */
export function sleepPatterns(all: SleepLike[], now = Date.now(), days = 14): SleepPatterns {
  const from = startOfDay(now) - days * DAY_MS
  const list = ended(all).filter((s) => t(s.end_at!) >= from && t(s.end_at!) <= now)
  const nights = list.filter((s) => s.kind === 'night')

  const wbn: number[][] = []
  const ns: number[][] = []
  const nd: number[][] = []
  const wbNight: number[] = []
  const napsPerDay: number[] = []
  let dayCount = 0

  // День = від кінця нічного сну до початку наступного нічного.
  for (let i = 0; i < nights.length; i++) {
    const morning = t(nights[i].end_at!)
    const next = nights[i + 1]
    if (!next) break
    const evening = t(next.start_at)
    if (evening - morning > 20 * HOUR || evening <= morning) continue
    const naps = list.filter((s) => s.kind === 'nap' && t(s.start_at) >= morning && t(s.end_at!) <= evening)
    dayCount++
    napsPerDay.push(naps.length)
    let prevEnd = morning
    naps.forEach((n, k) => {
      ;(wbn[k] ??= []).push((t(n.start_at) - prevEnd) / MIN)
      ;(ns[k] ??= []).push(clockMin(t(n.start_at)))
      ;(nd[k] ??= []).push((t(n.end_at!) - t(n.start_at)) / MIN)
      prevEnd = t(n.end_at!)
    })
    wbNight.push((evening - prevEnd) / MIN)
  }

  return {
    days: dayCount,
    windowBeforeNap: wbn.map(spread),
    napStart: ns.map(spread),
    napDuration: nd.map(spread),
    windowBeforeNight: spread(wbNight),
    bedtime: spread(nights.map((n) => clockMin(t(n.start_at), true))),
    wakeTime: spread(nights.map((n) => clockMin(t(n.end_at!)))),
    napsPerDay: spread(napsPerDay),
    nightDuration: spread(nights.map((n) => (t(n.end_at!) - t(n.start_at)) / MIN)),
  }
}

/** Мінімум спостережень, щоб показувати прогноз. */
export const MIN_SAMPLES = 3

export type Forecast =
  | { state: 'sleeping'; since: number; kind: SleepKind }
  | { state: 'no_data' }
  | { state: 'learning'; awakeMs: number; lastEnd: number; days: number }
  | {
      state: 'awake' | 'past'
      awakeMs: number
      lastEnd: number
      nextKind: SleepKind
      napIndex: number
      /** Типовий проміжок неспання (хв) і діапазон. */
      typical: Spread
      target: number
      lo: number
      hi: number
    }

function napsSinceMorning(sleeps: SleepLike[], now: number) {
  const night = ended(sleeps).filter((s) => s.kind === 'night' && t(s.end_at!) <= now && now - t(s.end_at!) < 16 * HOUR).pop()
  const anchor = night ? t(night.end_at!) : startOfDay(now)
  return alive(sleeps).filter((s) => s.kind === 'nap' && t(s.start_at) >= anchor && t(s.start_at) <= now).length
}

/** «Коли малюк імовірно засне» — з його власних даних. */
export function sleepForecast(all: SleepLike[], now = Date.now(), patterns = sleepPatterns(all, now)): Forecast {
  const sleeps = alive(all)
  const active = sleeps.find((s) => !s.end_at)
  if (active) return { state: 'sleeping', since: t(active.start_at), kind: active.kind }

  const last = ended(sleeps).filter((s) => t(s.end_at!) <= now).pop()
  if (!last || now - t(last.end_at!) > 12 * HOUR) return { state: 'no_data' }
  const lastEnd = t(last.end_at!)
  const awakeMs = now - lastEnd

  const napIndex = last.kind === 'night' ? 0 : napsSinceMorning(sleeps, now)
  const typicalNaps = Math.round(patterns.napsPerDay.median)
  const napSpread = patterns.windowBeforeNap[napIndex]
  const nextKind: SleepKind =
    patterns.napsPerDay.n >= MIN_SAMPLES && napIndex >= typicalNaps ? 'night' : 'nap'
  const typical = nextKind === 'night' ? patterns.windowBeforeNight : napSpread

  if (!typical || typical.n < MIN_SAMPLES) return { state: 'learning', awakeMs, lastEnd, days: patterns.days }

  const target = lastEnd + typical.median * MIN
  let lo = lastEnd + typical.p25 * MIN
  let hi = lastEnd + typical.p75 * MIN
  if (hi - lo < 20 * MIN) { lo = target - 10 * MIN; hi = target + 10 * MIN }
  return { state: now > hi ? 'past' : 'awake', awakeMs, lastEnd, nextKind, napIndex, typical, target, lo, hi }
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

/** Середні за N повних днів до сьогодні (дні без записів не враховуються). */
export function periodAverages(all: SleepLike[], days: number, now = Date.now()) {
  const today = startOfDay(now)
  const rows = Array.from({ length: days }, (_, i) => daySummary(all, today - (i + 1) * DAY_MS, now)).filter((d) => d.totalMs > 0)
  const avg = (f: (d: DaySummary) => number) => (rows.length ? rows.reduce((a, d) => a + f(d), 0) / rows.length : 0)
  return {
    days: rows.length,
    totalMs: avg((d) => d.totalMs),
    dayMs: avg((d) => d.dayMs),
    nightMs: avg((d) => d.nightMs),
    naps: avg((d) => d.naps),
    wakeUps: avg((d) => d.wakeUps),
  }
}

export const fmtClockMin = (m: number) => {
  const mm = Math.round(m) % (24 * 60)
  return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`
}
