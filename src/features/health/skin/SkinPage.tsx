import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child, SkinCheck } from '@/db/types'
import { useMealsSince, useRecentSleeps, useSkinCareSince, useSkinChecksSince } from '@/db/hooks'
import { foodName } from '@/data/foods'
import { ITCH_LONG, SIGNS, TRIGGERS, ZONES, labelOf } from '@/data/skin'
import { foodStats } from '@/lib/food'
import { isoDate, itchSleepLink, skinSeries, triggerCounts } from '@/lib/skin'
import { DAY_MS, formatDayLabel, shortDayLabel, startOfDay, useNow } from '@/lib/time'
import { Button, Card, PageTitle, Section } from '@/ui/kit'
import { SkinCareButtons } from './SkinCareButtons'
import { SkinCheckSheet } from './SkinCheckSheet'

const DAYS = 14
const ITCH_CLS = ['bg-line', 'bg-accent/35', 'bg-accent/70', 'bg-accent']

function Photo({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { const u = URL.createObjectURL(blob); setUrl(u); return () => URL.revokeObjectURL(u) }, [blob])
  return url ? <img src={url} alt="Фото шкіри" className="h-16 w-16 rounded-xl object-cover" /> : null
}

export function SkinPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const today = startOfDay(now)
  const from = today - (DAYS - 1) * DAY_MS
  const checks = useSkinChecksSince(child.id, isoDate(from))
  const care = useSkinCareSince(child.id, from)
  const sleeps = useRecentSleeps(child.id, today)
  const meals = useMealsSince(child.id, 0)
  const [checkDate, setCheckDate] = useState<string | null>(null)

  // Нові продукти = перша проба у відповідний день (з журналу їжі).
  const firsts = [...foodStats(meals).values()].map((s) => ({ food_id: s.foodId, started_at: new Date(s.first).toISOString() }))
  const series = skinSeries({ checks, care, sleeps, intros: firsts, days: DAYS, now })
  const todayCheck = checks.find((c) => c.date === isoDate(today))
  const link = itchSleepLink(series)
  const triggers = triggerCounts(checks).filter((t) => t.onBadDays > 0).slice(0, 3)
  const flaresWithFood = series.filter((d) => d.flare && d.newFoods.length > 0)
  const history = [...checks].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-5">
      <Link to="/health" className="inline-flex min-h-11 items-center px-1 text-sm text-accent">← Здоров'я</Link>
      <PageTitle>Шкіра</PageTitle>

      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Сьогодні</p>
          <p className="text-lg font-semibold">{todayCheck ? `Свербіж ${ITCH_LONG[todayCheck.itch]}` : 'Огляду ще немає'}</p>
        </div>
        <Button variant={todayCheck ? 'secondary' : 'primary'} onClick={() => setCheckDate(isoDate(today))}>{todayCheck ? 'Змінити' : 'Огляд'}</Button>
      </Card>

      <SkinCareButtons child={child} />

      <Section title={`${DAYS} днів`}>
        <Card>
          <div className="flex h-24 items-end gap-1">
            {series.map((d) => (
              <button key={d.date} onClick={() => setCheckDate(d.date)} className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                aria-label={`${formatDayLabel(d.dayStart, now)}: свербіж ${d.itch === null ? 'не записано' : ITCH_LONG[d.itch]}, крем ${d.emollients}`}>
                {d.newFoods.length > 0 && <i className="h-1 w-1 rounded-full bg-food" title="Новий продукт" />}
                <div className={`w-full rounded ${d.itch === null ? 'border border-dashed border-line' : ITCH_CLS[d.itch]}`}
                  style={{ height: d.itch === null ? 4 : `${15 + d.itch * 28}%` }} />
                <span className="text-[10px] text-muted">{shortDayLabel(d.dayStart, now).slice(0, 2)}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Висота — свербіж · <i className="inline-block h-1 w-1 rounded-full bg-food align-middle" /> новий продукт</p>
        </Card>
      </Section>

      {(link || flaresWithFood.length > 0 || triggers.length > 0) && (
        <Section title="Збіги в часі">
          <Card className="space-y-2 text-sm">
            {flaresWithFood.map((d) => (
              <p key={d.date}>{formatDayLabel(d.dayStart, now)}: сильніший свербіж, за 2 доби до цього — новий продукт: {d.newFoods.map((id) => foodName(id).toLowerCase()).join(', ')}.</p>
            ))}
            {triggers.length > 0 && <p>У дні сильного свербежу відмічали: {triggers.map((t) => `${labelOf(TRIGGERS, t.trigger).toLowerCase()} (${t.onBadDays})`).join(', ')}.</p>}
            {link && <p>Нічних пробуджень у середньому: {link.strong.toFixed(1)} після днів із сильним свербежем, {link.calm.toFixed(1)} — у спокійні.</p>}
            <p className="text-xs text-muted">Це лише збіги в ваших записах, не причини.</p>
          </Card>
        </Section>
      )}

      {history.length > 0 && (
        <Section title="Огляди">
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {history.map((c: SkinCheck) => (
              <li key={c.id}>
                <button onClick={() => setCheckDate(c.date)} className="flex w-full gap-3 p-3 text-left">
                  {c.photo && <Photo blob={c.photo} />}
                  <span className="flex-1 text-sm">
                    <span className="block font-medium">{formatDayLabel(startOfDay(new Date(c.date + 'T12:00')), now)} · свербіж {ITCH_LONG[c.itch]}</span>
                    <span className="block text-muted">{[...c.zones.map((z) => labelOf(ZONES, z)), ...c.signs.map((s) => labelOf(SIGNS, s).toLowerCase())].join(', ')}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <SkinCheckSheet child={child} date={checkDate ?? isoDate(today)} open={!!checkDate} onClose={() => setCheckDate(null)} />
    </div>
  )
}
