import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { getFood } from '@/data/foods'
import { useMealsSince, useReactionsSince } from '@/db/hooks'
import { formatDayLabel, startOfDay, useNow } from '@/lib/time'
import { PageTitle, Section } from '@/ui/kit'
import { FoodImage } from '@/ui/FoodImage'
import { DayFeed } from '@/features/today/DayFeed'
import { useFoodSheets } from './FoodSheets'

const WEEK = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд']
const monthStart = (y: number, m: number) => new Date(y, m, 1).getTime()

/** Календар прикорму: місяць сіткою, у дні — що їв малюк; тап — деталі дня. */
export function FoodCalendarPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const today = startOfDay(now)
  const [ym, setYm] = useState(() => { const d = new Date(now); return { y: d.getFullYear(), m: d.getMonth() } })
  const [sel, setSel] = useState(today)
  const from = monthStart(ym.y, ym.m)
  const to = monthStart(ym.y, ym.m + 1)
  const meals = useMealsSince(child.id, from)
  const reactions = useReactionsSince(child.id, from)
  const sheets = useFoodSheets(child)

  // День → унікальні продукти (у порядку першої появи) і чи була реакція.
  const byDay = useMemo(() => {
    const map = new Map<number, { foods: string[]; reaction: boolean }>()
    const get = (ds: number) => map.get(ds) ?? (map.set(ds, { foods: [], reaction: false }), map.get(ds)!)
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
    return map
  }, [meals, reactions, to])

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
      <PageTitle>Календар прикорму</PageTitle>

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
            const future = ds > today
            const active = ds === sel
            return (
              <button key={ds} disabled={future} onClick={() => setSel(ds)} aria-pressed={active}
                aria-label={`${formatDayLabel(ds, now)}${d?.foods.length ? `: ${d.foods.map((f) => getFood(f)?.name_uk).join(', ')}` : ''}`}
                className={`relative flex aspect-[4/5] flex-col items-center rounded-2xl pt-1 text-sm disabled:opacity-30 ${
                  active ? 'bg-accent text-white dark:text-bg' : d?.foods.length ? 'bg-food-soft text-food-ink' : ''} ${ds === today && !active ? 'ring-2 ring-accent' : ''}`}>
                <span className="font-bold tabular-nums">{new Date(ds).getDate()}</span>
                {d && d.foods.length > 0 && (
                  <span className="mt-auto mb-1 flex flex-col items-center leading-none">
                    <span className="text-base">{getFood(d.foods[0])?.emoji}</span>
                    {d.foods.length > 1 && <span className="text-[10px] font-bold">+{d.foods.length - 1}</span>}
                  </span>
                )}
                {d?.reaction && <i aria-hidden className="absolute top-1 right-1 h-2 w-2 rounded-full bg-sos" />}
              </button>
            )
          })}
        </div>
        <p className="mt-2 flex items-center gap-3 px-1 text-xs text-muted">
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-food-soft" />був прикорм</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-sos" />реакція</span>
        </p>
      </section>

      <Section title={formatDayLabel(sel, now)}>
        {selDay?.foods.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {selDay.foods.map((id) => (
              <button key={id} onClick={() => sheets.openFood(id)} className="flex items-center gap-2 rounded-full bg-surface py-1 pr-3 pl-1 shadow-soft">
                <FoodImage food={getFood(id)} size={32} /><span className="text-sm font-semibold">{getFood(id)?.name_uk}</span>
              </button>
            ))}
          </div>
        ) : null}
        <DayFeed child={child} dayStart={sel} show="food" empty="Цього дня прикорму не записано" />
      </Section>
      {sheets.element}
    </div>
  )
}
