import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child, SkinCheck } from '@/db/types'
import { useIntros, useRecentSleeps, useSkinCareSince, useSkinChecksSince } from '@/db/hooks'
import { FOOD_BY_ID } from '@/data/foods'
import { ITCH_LABEL, TRIGGERS, ZONES, SIGNS, labelOf } from '@/data/skin'
import { isoDate, itchSleepLink, skinSeries, triggerCounts } from '@/lib/skin'
import { DAY_MS, formatDayLabel, shortDayLabel, startOfDay, useNow } from '@/lib/time'
import { Button, Card, PageTitle } from '@/ui/kit'
import { Disclaimer } from '@/ui/Disclaimer'
import { SkinCareButtons } from './SkinCareButtons'
import { SkinCheckSheet } from './SkinCheckSheet'

const DAYS = 14
const ITCH_CLS = ['bg-food', 'bg-accent/60', 'bg-accent', 'bg-sos']

function Photo({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { const u = URL.createObjectURL(blob); setUrl(u); return () => URL.revokeObjectURL(u) }, [blob])
  return url ? <img src={url} alt="Фото шкіри" className="h-20 w-20 rounded-xl object-cover" /> : null
}

export function SkinPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const today = startOfDay(now)
  const from = today - (DAYS - 1) * DAY_MS
  const checks = useSkinChecksSince(child.id, isoDate(from))
  const care = useSkinCareSince(child.id, from)
  const sleeps = useRecentSleeps(child.id, today)
  const intros = useIntros(child.id) ?? []
  const [checkDate, setCheckDate] = useState<string | null>(null)

  const series = skinSeries({ checks, care, sleeps, intros, days: DAYS, now })
  const todayCheck = checks.find((c) => c.date === isoDate(today))
  const link = itchSleepLink(series)
  const triggers = triggerCounts(checks).filter((t) => t.onBadDays > 0).slice(0, 4)
  const flaresWithFood = series.filter((d) => d.flare && d.newFoods.length > 0)
  const history = [...checks].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-4">
      <Link to="/health" className="inline-flex min-h-12 items-center text-accent">← Здоров'я</Link>
      <PageTitle sub="Суха шкіра і атопічний дерматит">Шкіра</PageTitle>

      <Card>
        {todayCheck ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Огляд сьогодні</p>
              <p className="text-lg font-bold">Свербіж: {ITCH_LABEL[todayCheck.itch].toLowerCase()}</p>
            </div>
            <Button variant="secondary" onClick={() => setCheckDate(todayCheck.date)}>Змінити</Button>
          </div>
        ) : (
          <>
            <p className="font-semibold">Як шкіра сьогодні?</p>
            <p className="mt-0.5 text-sm text-muted">Огляд займає 10–15 секунд і допомагає побачити, що впливає на загострення.</p>
            <Button className="mt-3 w-full" onClick={() => setCheckDate(isoDate(today))}>Огляд шкіри</Button>
          </>
        )}
      </Card>

      <SkinCareButtons child={child} />

      <Card>
        <h2 className="font-semibold">За {DAYS} днів</h2>
        <div className="mt-3 flex h-28 items-end gap-1">
          {series.map((d) => (
            <button key={d.date} onClick={() => setCheckDate(d.date)} className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              aria-label={`${formatDayLabel(d.dayStart, now)}: свербіж ${d.itch === null ? 'не записано' : ITCH_LABEL[d.itch]}, крем ${d.emollients}, пробуджень ${d.wakeUps}`}>
              {d.newFoods.length > 0 && <span className="text-[10px]" title="Новий продукт">🍽</span>}
              <div className={`w-full rounded-md ${d.itch === null ? 'border border-dashed border-line' : ITCH_CLS[d.itch]}`}
                style={{ height: d.itch === null ? 6 : `${18 + d.itch * 24}%` }} />
              <div className="flex h-2 gap-px">{Array.from({ length: Math.min(d.emollients, 3) }, (_, i) => <i key={i} className="h-1.5 w-1.5 rounded-full bg-sleep" />)}</div>
              <span className="text-[10px] text-muted">{shortDayLabel(d.dayStart, now).slice(0, 2)}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-food" /> немає</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-accent/60" /> легкий</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-accent" /> сильний</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-sos" /> дуже сильний</span>
          <span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-sleep" /> крем</span>
          <span>🍽 новий продукт</span>
        </p>
      </Card>

      {(link || flaresWithFood.length > 0 || triggers.length > 0) && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Що помітно</h2>
          {link && (
            <p className="text-sm">
              Після днів із сильним свербежем — у середньому <b>{link.strong.toFixed(1)}</b> нічних пробуджень, у спокійні дні — <b>{link.calm.toFixed(1)}</b>.
            </p>
          )}
          {flaresWithFood.map((d) => (
            <p key={d.date} className="text-sm">
              {formatDayLabel(d.dayStart, now)} — загострення; за 2 доби до нього почали вводити: <b>{d.newFoods.map((id) => FOOD_BY_ID.get(id)?.name_uk.toLowerCase()).join(', ')}</b>.
            </p>
          ))}
          {triggers.length > 0 && (
            <p className="text-sm">
              Найчастіше в дні загострень: {triggers.map((t) => `${labelOf(TRIGGERS, t.trigger).toLowerCase()} (${t.onBadDays})`).join(', ')}.
            </p>
          )}
          <p className="text-xs text-muted">Це збіги в часі, а не доказ причини. Обговоріть їх із лікарем.</p>
        </Card>
      )}

      <Link to="/health/skin/advice" className="flex min-h-16 items-center justify-between rounded-3xl border border-line bg-surface px-4">
        <span><span className="block font-semibold">Як доглядати за шкірою</span><span className="block text-sm text-muted">Поради для орієнтиру</span></span>
        <span className="text-accent">→</span>
      </Link>

      {history.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Огляди</h2>
          <ul className="space-y-2">
            {history.map((c: SkinCheck) => (
              <li key={c.id}>
                <button onClick={() => setCheckDate(c.date)} className="flex w-full gap-3 rounded-3xl border border-line bg-surface p-3 text-left">
                  {c.photo && <Photo blob={c.photo} />}
                  <span className="flex-1 text-sm">
                    <span className="block font-semibold">{formatDayLabel(startOfDay(new Date(c.date + 'T12:00')), now)} · свербіж {ITCH_LABEL[c.itch].toLowerCase()}</span>
                    {c.zones.length > 0 && <span className="block text-muted">{c.zones.map((z) => labelOf(ZONES, z)).join(', ')}</span>}
                    {c.signs.length > 0 && <span className="block text-muted">{c.signs.map((s) => labelOf(SIGNS, s).toLowerCase()).join(', ')}</span>}
                    {c.note && <span className="block">{c.note}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Disclaimer />
      <SkinCheckSheet child={child} date={checkDate ?? isoDate(today)} open={!!checkDate} onClose={() => setCheckDate(null)} />
    </div>
  )
}
