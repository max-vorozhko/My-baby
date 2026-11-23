import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { getFood } from '@/data/foods'
import { useMarks, useMealsSince } from '@/db/hooks'
import { allergenRows, topFoods, varietySummary } from '@/lib/food'
import { DAY_MS, startOfDay, useNow } from '@/lib/time'
import { Card, PageTitle, Section, Segmented, Stat } from '@/ui/kit'
import { FoodImage } from '@/ui/FoodImage'

type Period = '7' | '30' | 'all'
const PERIOD_DAYS: Record<Period, number> = { '7': 7, '30': 30, all: 365 }

/** Статистика прикорму й алергенів — окрема сторінка, щоб не заважала тим, хто це не веде. */
export function FoodStatsPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const [period, setPeriod] = useState<Period>('30')
  const [allFoodsOpen, setAllFoodsOpen] = useState(false)
  const days = PERIOD_DAYS[period]
  const from = period === 'all' ? 0 : startOfDay(now) - (days - 1) * DAY_MS
  const meals = useMealsSince(child.id, 0)
  const marks = useMarks(child.id) ?? []

  const top = topFoods(meals, from)
  const variety = varietySummary(meals, from)
  const allergens = allergenRows(meals, marks, from)
  const maxCount = Math.max(1, ...top.map((x) => x.count))
  const shown = allFoodsOpen ? top : top.slice(0, 8)

  return (
    <div className="space-y-5">
      <Link to="/stats" className="inline-flex min-h-11 items-center px-1 text-sm text-accent">← Статистика</Link>
      <PageTitle>Прикорм і алергени</PageTitle>
      <Segmented<Period> value={period} onChange={setPeriod} options={[
        { value: '7', label: '7 днів' }, { value: '30', label: 'Місяць' }, { value: 'all', label: 'Весь час' },
      ]} />

      <Section title="Прикорм">
        {top.length === 0 ? <Card><p className="text-sm text-muted">Немає записів за цей період.</p></Card> : (
          <Card className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat value={variety.meals} label="прийомів їжі" />
              <Stat value={variety.distinct} label="різних продуктів" />
              <Stat value={variety.fresh} label="нових" />
            </div>
            <ul className="space-y-2.5">
              {shown.map((s) => {
                const f = getFood(s.foodId)
                const rated = s.liked + s.disliked
                return (
                  <li key={s.foodId}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2"><FoodImage food={f} size={28} /><span className="truncate">{f?.name_uk}</span></span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {rated > 0 && <span className="mr-2">👍 {Math.round((s.liked / rated) * 100)}%</span>}
                        <b className="text-ink">{s.count}</b> {s.count === 1 ? 'раз' : s.count < 5 ? 'рази' : 'разів'}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-line">
                      <div className="h-1.5 rounded-full bg-food" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
            {top.length > 8 && (
              <button onClick={() => setAllFoodsOpen((v) => !v)} className="text-sm text-accent">{allFoodsOpen ? 'Згорнути' : `Усі ${top.length}`}</button>
            )}
          </Card>
        )}
      </Section>

      <Section title="Алергени">
        <Card className="space-y-2">
          {allergens.some((a) => a.count > 0) ? (
            <div className="flex flex-wrap gap-2">
              {allergens.filter((a) => a.count > 0).sort((x, y) => y.count - x.count).map((a) => (
                <span key={a.code} className="rounded-full bg-line/60 px-3 py-1.5 text-sm">{a.name} <b className="tabular-nums">{a.count}</b></span>
              ))}
            </div>
          ) : <p className="text-sm text-muted">За цей період не давали.</p>}
          {allergens.some((a) => a.count === 0) && (
            <p className="text-xs text-muted">Не давали: {allergens.filter((a) => a.count === 0).map((a) => a.name.toLowerCase()).join(', ')}</p>
          )}
        </Card>
      </Section>
    </div>
  )
}
