import type { Feeding, ItchLevel, SkinCare, SkinCheck, SkinSign, SkinTrigger, SkinZone } from '@/db/types'
import { DAY_MS, startOfDay } from './time'

const t = (iso: string) => new Date(iso).getTime()

/** Скільки днів із даними у періоді (для середніх «на день»). */
function activeDays(times: number[]) {
  return new Set(times.map((x) => startOfDay(x))).size
}

export function feedingStats(all: Feeding[], from: number, to = Date.now()) {
  const f = all.filter((x) => !x.deleted_at && t(x.start_at) >= from && t(x.start_at) < to)
  const breast = f.filter((x) => x.kind === 'breast')
  const bottle = f.filter((x) => x.kind === 'bottle')
  const days = activeDays(f.map((x) => t(x.start_at))) || 1
  const left = breast.filter((x) => x.side === 'left').length
  const right = breast.filter((x) => x.side === 'right').length
  const breastMin = breast.reduce((a, x) => a + (x.end_at ? (t(x.end_at) - t(x.start_at)) / 60_000 : 0), 0)
  const ml = bottle.reduce((a, x) => a + (x.amount_ml ?? 0), 0)
  return {
    days: f.length ? days : 0,
    breastPerDay: breast.length / days,
    breastAvgMin: breast.length ? breastMin / breast.length : 0,
    bottlesPerDay: bottle.length / days,
    mlPerDay: ml / days,
    leftShare: left + right ? left / (left + right) : null,
  }
}

const countBy = <T extends string>(lists: T[][]) => {
  const m = new Map<T, number>()
  for (const l of lists) for (const v of l) m.set(v, (m.get(v) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

export function skinStats(checks: SkinCheck[], care: SkinCare[], fromDate: string, from: number, to = Date.now()) {
  const c = checks.filter((x) => !x.deleted_at && x.date >= fromDate)
  const k = care.filter((x) => !x.deleted_at && t(x.at) >= from && t(x.at) < to)
  const days = Math.max(1, Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS) + 1)
  const itchDays: Record<ItchLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
  for (const x of c) itchDays[x.itch]++
  return {
    checks: c.length,
    itchDays,
    creamsPerDay: k.filter((x) => x.kind === 'emollient').length / days,
    baths: k.filter((x) => x.kind === 'bath').length,
    prescribed: k.filter((x) => x.kind === 'prescribed').length,
    zones: countBy<SkinZone>(c.map((x) => x.zones)),
    signs: countBy<SkinSign>(c.map((x) => x.signs)),
    triggers: countBy<SkinTrigger>(c.map((x) => x.triggers)),
  }
}
