import { useState } from 'react'
import type { Child } from '@/db/types'
import { getFood } from '@/data/foods'
import { ITCH_LONG, TRIGGERS, ZONES, labelOf } from '@/data/skin'
import { useFeedingsSince, useMarks, useMealsSince, useSkinCareSince, useSkinChecksSince, useSleepsSince } from '@/db/hooks'
import { allergenRows, topFoods, varietySummary } from '@/lib/food'
import { fmtClockMin, MIN_SAMPLES, periodAverages, sleepPatterns } from '@/lib/sleep'
import { feedingStats, skinStats } from '@/lib/stats'
import { isoDate } from '@/lib/skin'
import { DAY_MS, formatDuration, MIN, startOfDay, useNow } from '@/lib/time'
import type { ItchLevel } from '@/db/types'
import { Card, PageTitle, Section, Segmented, Stat } from '@/ui/kit'

type Period = '7' | '30' | 'all'
const PERIOD_DAYS: Record<Period, number> = { '7': 7, '30': 30, all: 365 }
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('uk-UA')

/** Статистика — лише цифри з ваших записів. */
export function StatsPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const [period, setPeriod] = useState<Period>('30')
  const [allFoodsOpen, setAllFoodsOpen] = useState(false)
  const days = PERIOD_DAYS[period]
  const from = period === 'all' ? 0 : startOfDay(now) - (days - 1) * DAY_MS
  const fromSleep = period === 'all' ? startOfDay(now) - 365 * DAY_MS : from

  const meals = useMealsSince(child.id, 0)
  const marks = useMarks(child.id) ?? []
  const sleeps = useSleepsSince(child.id, fromSleep)
  const feedings = useFeedingsSince(child.id, from)
  const checks = useSkinChecksSince(child.id, isoDate(from))
  const care = useSkinCareSince(child.id, from)

  const top = topFoods(meals, from)
  const variety = varietySummary(meals, from)
  const allergens = allergenRows(meals, marks, from)
  const maxCount = Math.max(1, ...top.map((x) => x.count))
  const shown = allFoodsOpen ? top : top.slice(0, 8)

  const sleepAvg = periodAverages(sleeps, Math.min(days, 365), now)
  const pat = sleepPatterns(sleeps, now, Math.min(days, 365))
  const feed = feedingStats(feedings, from, now)
  const skin = skinStats(checks, care, isoDate(from), from, now)
  const itchTotal = Object.values(skin.itchDays).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-5">
      <PageTitle>Статистика</PageTitle>
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
                      <span className="truncate">{f?.emoji} {f?.name_uk}</span>
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

      <Section title="Сон">
        {sleepAvg.days === 0 ? <Card><p className="text-sm text-muted">Немає повних днів із записами сну.</p></Card> : (
          <Card className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat value={formatDuration(sleepAvg.totalMs)} label="сну за добу" />
              <Stat value={formatDuration(sleepAvg.nightMs)} label="вночі" />
              <Stat value={formatDuration(sleepAvg.dayMs)} label="вдень" />
              <Stat value={fmt1(sleepAvg.naps)} label="денних снів" />
              <Stat value={fmt1(sleepAvg.wakeUps)} label="пробуджень уночі" />
              {pat.days >= MIN_SAMPLES && <Stat value={formatDuration(pat.windowBeforeNap[0]?.median * MIN || 0)} label="до 1-го сну" />}
            </div>
            {pat.days >= MIN_SAMPLES && (
              <p className="text-sm text-muted">Зазвичай прокидається о ~{fmtClockMin(pat.wakeTime.median)}, засинає на ніч о ~{fmtClockMin(pat.bedtime.median)}.</p>
            )}
            <p className="text-xs text-muted">Середнє за {sleepAvg.days} днів із записами</p>
          </Card>
        )}
      </Section>

      <Section title="Груди / пляшечка">
        {feed.days === 0 ? <Card><p className="text-sm text-muted">Немає записів за цей період.</p></Card> : (
          <Card className="grid grid-cols-2 gap-3">
            <Stat value={fmt1(feed.breastPerDay)} label="прикладань на день" />
            <Stat value={formatDuration(feed.breastAvgMin * MIN)} label="у середньому" />
            <Stat value={`${Math.round(feed.mlPerDay)} мл`} label="з пляшечки на день" />
            {feed.leftShare !== null && <Stat value={`${Math.round(feed.leftShare * 100)} / ${100 - Math.round(feed.leftShare * 100)}`} label="ліва / права, %" />}
          </Card>
        )}
      </Section>

      {child.skin_module && (
        <Section title="Шкіра">
          {skin.checks === 0 ? <Card><p className="text-sm text-muted">Немає оглядів за цей період.</p></Card> : (
            <Card className="space-y-4">
              <div>
                <div className="flex h-2.5 overflow-hidden rounded-full">
                  {([0, 1, 2, 3] as ItchLevel[]).map((l) => (
                    <div key={l} className={['bg-line', 'bg-accent/35', 'bg-accent/70', 'bg-accent'][l]} style={{ width: `${(skin.itchDays[l] / itchTotal) * 100}%` }} />
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted">
                  {([0, 1, 2, 3] as ItchLevel[]).filter((l) => skin.itchDays[l]).map((l) => `${ITCH_LONG[l]} — ${skin.itchDays[l]} дн.`).join(' · ')}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat value={fmt1(skin.creamsPerDay)} label="кремів на день" />
                <Stat value={skin.baths} label="купань" />
                <Stat value={skin.prescribed} label="засобів" />
              </div>
              {skin.zones.length > 0 && <p className="text-sm"><span className="text-muted">Зони:</span> {skin.zones.slice(0, 4).map(([z, n]) => `${labelOf(ZONES, z).toLowerCase()} ${n}`).join(', ')}</p>}
              {skin.triggers.length > 0 && <p className="text-sm"><span className="text-muted">Що змінювалось:</span> {skin.triggers.slice(0, 4).map(([z, n]) => `${labelOf(TRIGGERS, z).toLowerCase()} ${n}`).join(', ')}</p>}
            </Card>
          )}
        </Section>
      )}
    </div>
  )
}
