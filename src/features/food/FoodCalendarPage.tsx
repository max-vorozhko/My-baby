import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { getFood } from '@/data/foods'
import { useFeedingsSince, useMealsSince, useReactionsSince } from '@/db/hooks'
import { formatDayLabel, formatDuration, startOfDay, useNow } from '@/lib/time'
import { PageTitle, Section } from '@/ui/kit'
import { FoodImage } from '@/ui/FoodImage'
import { DayFeed } from '@/features/today/DayFeed'
import { useFoodSheets } from './FoodSheets'

const WEEK = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд']
const monthStart = (y: number, m: number) => new Date(y, m, 1).getTime()

/** Календар їжі: місяць сіткою — прикорм і годування (груди/пляшечка); тап — деталі дня. */
export function FoodCalendarPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const today = startOfDay(now)
  const [ym, setYm] = useState(() => { const d = new Date(now); return { y: d.getFullYear(), m: d.getMonth() } })
  const [sel, setSel] = useState(today)
  const from = monthStart(ym.y, ym.m)
  const to = monthStart(ym.y, ym.m + 1)
  const meals = useMealsSince(child.id, from)
  const reactions = useReactionsSince(child.id, from)
  const feedings = useFeedingsSince(child.id, from)
  const sheets = useFoodSheets(child)

  // День → продукти (у порядку першої появи), реакція і підсумок годувань груддю/пляшечкою.
  type Day = { foods: string[]; reaction: boolean; breast: number; breastMs: number; bottles: number; ml: number }
  const byDay = useMemo(() => {
    const map = new Map<number, Day>()
    const get = (ds: number) => map.get(ds) ?? (map.set(ds, { foods: [], reaction: false, breast: 0, breastMs: 0, bottles: 0, ml: 0 }), map.get(ds)!)
    for (const m of [...meals].sort((a, b) => a.at.localeCompare(b.at))) {
      const t = new Date(m.at).getTime()
      if (t >= to) continue
      const d = get(startOfDay(t))
      for (const it of m.items) if (!d.foods.includes(it.food_id)) d.foods.push(it.food_id)
    }
    for (const r of reactions) {
      const t = new Date(r.at).getTime()
      if (t < to) get(startOfDay(t)).reaction = true
    }
    for (const f of feedings) {
      const t = new Date(f.start_at).getTime()
      if (t >= to) continue
      const d = get(startOfDay(t))
      if (f.kind === 'breast') {
        d.breast++
        if (f.end_at) d.breastMs += new Date(f.end_at).getTime() - t
      } else { d.bottles++; d.ml += f.amount_ml ?? 0 }
    }
    return map
  }, [meals, reactions, feedings, to])

  const lead = (new Date(from).getDay() + 6) % 7 // понеділок — перший
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => startOfDay(new Date(ym.y, ym.m, i + 1)))]
  const title = new Date(from).toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
  const isCurrent = from === monthStart(new Date(now).getFullYear(), new Date(now).getMonth())
  const shift = (k: number) => setYm(({ y, m }) => { const d = new Date(y, m + k, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const selDay = byDay.get(sel)

  return (
    <div className="space-y-5">
      <Link to="/food" className="inline-flex min-h-11 items-center px-1 text-sm text-accent">← Їжа</Link>
      <PageTitle sub="Груди, пляшечка і прикорм по днях">Календар їжі</PageTitle>

      <section className="rounded-3xl bg-surface p-3 shadow-soft">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={() => shift(-1)} aria-label="Попередній місяць" className="h-11 w-11 rounded-full text-xl text-muted">‹</button>
          <h2 className="text-lg font-extrabold first-letter:uppercase">{title}</h2>
          <button onClick={() => shift(1)} disabled={isCurrent} aria-label="Наступний місяць" className="h-11 w-11 rounded-full text-xl text-muted disabled:opacity-30">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
          {WEEK.map((w) => <span key={w} className="py-1">{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((ds, i) => {
            if (ds === null) return <span key={`e${i}`} />
            const d = byDay.get(ds)
            const feeds = d ? d.breast + d.bottles : 0
            const future = ds > today
            const active = ds === sel
            return (
              <button key={ds} disabled={future} onClick={() => setSel(ds)} aria-pressed={active}
                aria-label={`${formatDayLabel(ds, now)}${feeds ? `, годувань: ${feeds}` : ''}${d?.foods.length ? `, прикорм: ${d.foods.map((f) => getFood(f)?.name_uk).join(', ')}` : ''}`}
                className={`relative flex aspect-[4/5] flex-col items-center rounded-2xl pt-1 text-sm disabled:opacity-30 ${
                  active ? 'bg-accent text-white dark:text-bg' : d?.foods.length ? 'bg-food-soft text-food-ink' : feeds ? 'bg-feed-soft' : ''} ${ds === today && !active ? 'ring-2 ring-accent' : ''}`}>
                <span className="font-bold tabular-nums">{new Date(ds).getDate()}</span>
                <span className="mt-auto mb-1 flex flex-col items-center gap-0.5 leading-none">
                  {d && d.foods.length > 0 && (
                    <span className="text-[13px]">{getFood(d.foods[0])?.emoji}{d.foods.length > 1 && <span className="text-[10px] font-bold">+{d.foods.length - 1}</span>}</span>
                  )}
                  {feeds > 0 && <span className={`text-[10px] font-bold tabular-nums ${active ? '' : 'text-feed-ink'}`}>🍼{feeds}</span>}
                </span>
                {d?.reaction && <i aria-hidden className="absolute top-1 right-1 h-2 w-2 rounded-full bg-sos" />}
              </button>
            )
          })}
        </div>
        <p className="mt-2 flex items-center gap-3 px-1 text-xs text-muted">
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-food-soft" />прикорм</span>
          <span>🍼 — годувань</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-sos" />реакція</span>
        </p>
      </section>

      <Section title={formatDayLabel(sel, now)}>
        {selDay && (selDay.breast > 0 || selDay.bottles > 0) && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {selDay.breast > 0 && (
              <div className="rounded-3xl bg-feed-soft p-3 text-feed-ink">
                <p className="text-xs font-bold">Груди</p>
                <p className="text-xl font-extrabold tabular-nums">{selDay.breast}×</p>
                {selDay.breastMs > 0 && <p className="text-xs font-semibold opacity-80">разом {formatDuration(selDay.breastMs)}</p>}
              </div>
            )}
            {selDay.bottles > 0 && (
              <div className="rounded-3xl bg-feed-soft p-3 text-feed-ink">
                <p className="text-xs font-bold">Пляшечка</p>
                <p className="text-xl font-extrabold tabular-nums">{selDay.bottles}×</p>
                {selDay.ml > 0 && <p className="text-xs font-semibold opacity-80">разом {selDay.ml} мл</p>}
              </div>
            )}
          </div>
        )}
        {selDay?.foods.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {selDay.foods.map((id) => (
              <button key={id} onClick={() => sheets.openFood(id)} className="flex items-center gap-2 rounded-full bg-surface py-1 pr-3 pl-1 shadow-soft">
                <FoodImage food={getFood(id)} size={32} /><span className="text-sm font-semibold">{getFood(id)?.name_uk}</span>
              </button>
            ))}
          </div>
        ) : null}
        <DayFeed child={child} dayStart={sel} show="eating" empty="Цього дня записів немає" />
      </Section>
      {sheets.element}
    </div>
  )
}
