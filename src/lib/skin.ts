import type { ItchLevel, SkinCare, SkinCheck, SkinTrigger } from '@/db/types'

/** Перша проба продукту (з журналу їжі). */
export interface FirstTry { food_id: string; started_at: string; deleted_at?: string | null }
import { daySummary, type SleepLike } from './sleep'
import { DAY_MS, startOfDay } from './time'

export function isoDate(t: number) {
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const alive = <T extends { deleted_at?: string | null }>(x: T[]) => x.filter((r) => !r.deleted_at)

export interface SkinDay {
  dayStart: number
  date: string
  itch: ItchLevel | null
  emollients: number
  baths: number
  prescribed: number
  wakeUps: number
  /** Нові продукти, які почали вводити за 48 год до кінця цього дня. */
  newFoods: string[]
  flare: boolean
}

/** Серія за N днів (старі → нові) для графіка «свербіж ↔ сон ↔ догляд». */
export function skinSeries(input: {
  checks: SkinCheck[]; care: SkinCare[]; sleeps: SleepLike[]; intros: FirstTry[]; days: number; now?: number
}): SkinDay[] {
  const now = input.now ?? Date.now()
  const today = startOfDay(now)
  const checks = new Map(alive(input.checks).map((c) => [c.date, c]))
  const care = alive(input.care)
  const intros = alive(input.intros)
  const out: SkinDay[] = []
  let prevItch: ItchLevel | null = null

  for (let i = input.days - 1; i >= 0; i--) {
    const ds = today - i * DAY_MS
    const de = ds + DAY_MS
    const inDay = (iso: string) => { const t = new Date(iso).getTime(); return t >= ds && t < de }
    const date = isoDate(ds)
    const itch = checks.get(date)?.itch ?? null
    const flare = itch !== null && itch >= 2 && (prevItch === null || prevItch <= 1)
    out.push({
      dayStart: ds,
      date,
      itch,
      emollients: care.filter((c) => c.kind === 'emollient' && inDay(c.at)).length,
      baths: care.filter((c) => c.kind === 'bath' && inDay(c.at)).length,
      prescribed: care.filter((c) => c.kind === 'prescribed' && inDay(c.at)).length,
      wakeUps: daySummary(input.sleeps, ds, now).wakeUps,
      newFoods: intros.filter((x) => { const t = new Date(x.started_at).getTime(); return t >= de - 2 * DAY_MS && t < de }).map((x) => x.food_id),
      flare,
    })
    if (itch !== null) prevItch = itch
  }
  return out
}

/**
 * Свербіж і нічні пробудження: середнє пробуджень у ночі після днів
 * із сильним свербежем проти спокійних. null — замало даних (< 3 днів у кожній групі).
 */
export function itchSleepLink(series: SkinDay[]) {
  const strong = series.filter((d) => d.itch !== null && d.itch >= 2)
  const calm = series.filter((d) => d.itch !== null && d.itch <= 1)
  if (strong.length < 3 || calm.length < 3) return null
  const avg = (a: SkinDay[]) => a.reduce((s, d) => s + d.wakeUps, 0) / a.length
  return { strong: avg(strong), calm: avg(calm) }
}

/** Як часто відмічали кожен тригер у днях загострення (свербіж ≥ 2). */
export function triggerCounts(checks: SkinCheck[]): { trigger: SkinTrigger; total: number; onBadDays: number }[] {
  const m = new Map<SkinTrigger, { total: number; onBadDays: number }>()
  for (const c of alive(checks)) {
    for (const t of c.triggers) {
      const v = m.get(t) ?? { total: 0, onBadDays: 0 }
      v.total++
      if (c.itch >= 2) v.onBadDays++
      m.set(t, v)
    }
  }
  return [...m.entries()].map(([trigger, v]) => ({ trigger, ...v })).sort((a, b) => b.onBadDays - a.onBadDays || b.total - a.total)
}
