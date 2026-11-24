import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { ITCH_LONG, TRIGGERS, ZONES, labelOf } from '@/data/skin'
import { useFeedingsSince, useSkinCareSince, useSkinChecksSince, useSleepsSince } from '@/db/hooks'
import { MIN_SAMPLES, periodAverages, periodTrend, sleepPatterns } from '@/lib/sleep'
import { DailyTotals, DaysTimeline, TypicalDay } from './SleepCharts'
import { feedingStats, skinStats } from '@/lib/stats'
import { isoDate } from '@/lib/skin'
import { DAY_MS, formatDuration, MIN, startOfDay, useNow } from '@/lib/time'
import type { ItchLevel } from '@/db/types'
import { Card, PageTitle, Section, Segmented, Stat } from '@/ui/kit'

type Period = '7' | '30' | 'all'
const PERIOD_DAYS: Record<Period, number> = { '7': 7, '30': 30, all: 365 }
const sign = (ms: number) => `${ms >= 0 ? '+' : '−'}${formatDuration(Math.abs(ms))}`
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('uk-UA')

/** Статистика — лише цифри з ваших записів. */
export function StatsPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const [period, setPeriod] = useState<Period>('30')
  const days = PERIOD_DAYS[period]
  const from = period === 'all' ? 0 : startOfDay(now) - (days - 1) * DAY_MS
  // Для порівняння з попереднім періодом сни беремо за подвійний проміжок.
  const fromSleep = period === 'all' ? startOfDay(now) - 365 * DAY_MS : startOfDay(now) - (2 * days - 1) * DAY_MS

  const sleeps = useSleepsSince(child.id, fromSleep)
  const feedings = useFeedingsSince(child.id, from)
  const checks = useSkinChecksSince(child.id, isoDate(from))
  const care = useSkinCareSince(child.id, from)


  const sleepAvg = periodAverages(sleeps, Math.min(days, 365), now)
  const pat = sleepPatterns(sleeps, now, Math.min(days, 365))
  const trend = period === 'all' ? null : periodTrend(sleeps, days, now)
  // Графіки не починаємо з порожніх днів до першого запису.
  const firstSleep = sleeps.reduce((m, x) => Math.min(m, new Date(x.start_at).getTime()), now)
  const chartDays = Math.max(7, Math.min(days, 30, Math.floor((startOfDay(now) - startOfDay(firstSleep)) / DAY_MS) + 1))
  const feed = feedingStats(feedings, from, now)
  const skin = skinStats(checks, care, isoDate(from), from, now)
  const itchTotal = Object.values(skin.itchDays).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-5">
      <PageTitle>Статистика</PageTitle>
      <Segmented<Period> value={period} onChange={setPeriod} options={[
        { value: '7', label: '7 днів' }, { value: '30', label: 'Місяць' }, { value: 'all', label: 'Весь час' },
      ]} />

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
            {trend && Math.abs(trend.totalDeltaMs) >= 5 * MIN && (
              <p className="text-sm">
                {trend.totalDeltaMs > 0 ? '↑' : '↓'} На {formatDuration(Math.abs(trend.totalDeltaMs))} {trend.totalDeltaMs > 0 ? 'більше' : 'менше'} сну за добу, ніж за попередні {days} днів
                <span className="text-muted"> (ніч {sign(trend.nightDeltaMs)}, день {sign(trend.dayDeltaMs)})</span>
              </p>
            )}
            <p className="text-xs text-muted">Середнє за {sleepAvg.days} днів із записами</p>
          </Card>
        )}
      </Section>

      <Section title="Типовий день">
        <TypicalDay p={pat} />
      </Section>

      <Section title={`Сон по днях${period === 'all' ? ' · 30 днів' : ''}`}>
        <DaysTimeline sleeps={sleeps} days={chartDays} now={now} />
      </Section>

      <Section title="Скільки спить за добу">
        <DailyTotals sleeps={sleeps} days={chartDays} now={now} />
      </Section>

      <Link to="/stats/food" className="flex min-h-16 items-center gap-3 rounded-3xl bg-surface px-4 py-2 shadow-soft">
        <span className="flex-1">
          <span className="block font-semibold">Прикорм і алергени</span>
          <span className="block text-xs text-muted">Продукти, різноманітність, алергени</span>
        </span>
        <span aria-hidden className="text-muted">›</span>
      </Link>

      <Section title="Груди / пляшечка" action={<Link to="/food/calendar" className="inline-flex min-h-11 items-center px-2 text-sm text-accent">По днях ›</Link>}>
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
