import { useState } from 'react'
import type { Child } from '@/db/types'
import { useRecentSleeps } from '@/db/hooks'
import { MIN_SAMPLES, daySummary, fmtClockMin, sleepPatterns } from '@/lib/sleep'
import { DAY_MS, formatDayLabel, formatDuration, MIN, shortDayLabel, startOfDay, useNow } from '@/lib/time'
import { Card, PageTitle, Section } from '@/ui/kit'
import { daysWord } from '@/lib/age'
import { SleepCard } from './SleepCard'
import { SleepEditSheet } from './SleepEditSheet'
import { DayFeed } from '@/features/today/DayFeed'

const dur = (m: number) => formatDuration(m * MIN)
const ORD = ['1-й', '2-й', '3-й', '4-й', '5-й']

function Row({ time, title, sub }: { time: number; title: string; sub?: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <span>
        <span className="block">{title}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
      <span className="tabular-nums text-muted">~{fmtClockMin(time)}</span>
    </li>
  )
}

export function SleepPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const today = startOfDay(now)
  const sleeps = useRecentSleeps(child.id, today)
  const [adding, setAdding] = useState(false)
  const [day, setDay] = useState(today)
  const p = sleepPatterns(sleeps, now)
  const ready = p.days >= MIN_SAMPLES
  const week = Array.from({ length: 7 }, (_, i) => today - (6 - i) * DAY_MS).map((ds) => ({ ds, ...daySummary(sleeps, ds, now) }))
  const maxMs = Math.max(...week.map((d) => d.totalMs), 1)
  const typicalNaps = Math.round(p.napsPerDay.median)

  return (
    <div className="space-y-5">
      <PageTitle>Сон</PageTitle>
      <SleepCard child={child} />

      <Section title="Типовий день">
        {ready ? (
          <Card className="space-y-0 p-0">
            <ol className="divide-y divide-line">
              <Row time={p.wakeTime.median} title="Прокидається" />
              {Array.from({ length: typicalNaps }, (_, k) => p.napStart[k] && p.napStart[k].n >= MIN_SAMPLES && (
                <Row key={k} time={p.napStart[k].median} title={`${ORD[k]} сон`}
                  sub={`через ${dur(p.windowBeforeNap[k].median)} · триває ${dur(p.napDuration[k].median)}`} />
              ))}
              <Row time={p.bedtime.median} title="Нічний сон" sub={`через ${dur(p.windowBeforeNight.median)}`} />
            </ol>
            <p className="border-t border-line px-4 py-2 text-xs text-muted">За вашими записами · {p.days} {daysWord(p.days)}</p>
          </Card>
        ) : (
          <Card><p className="text-sm text-muted">Записуйте сни кілька днів — тут з'явиться типовий розклад малюка. Зараз: {p.days} з {MIN_SAMPLES}.</p></Card>
        )}
      </Section>

      <Section title="Тиждень">
        <Card>
          <div className="flex h-28 items-end gap-2">
            {week.map((d) => (
              <button key={d.ds} onClick={() => setDay(d.ds)} className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                aria-label={`${formatDayLabel(d.ds, now)}: ${formatDuration(d.totalMs)}`}>
                <div className="flex w-full flex-col justify-end overflow-hidden rounded-md" style={{ height: `${(d.totalMs / maxMs) * 100}%`, minHeight: d.totalMs ? 4 : 0 }}>
                  <div className="bg-sleep/40" style={{ flexGrow: d.dayMs }} />
                  <div className="bg-sleep" style={{ flexGrow: d.nightMs }} />
                </div>
                <span className={`text-[11px] ${d.ds === day ? 'font-semibold text-ink' : 'text-muted'}`}>{shortDayLabel(d.ds, now)}</span>
              </button>
            ))}
          </div>
        </Card>
      </Section>

      <Section title={formatDayLabel(day, now)} action={<button onClick={() => setAdding(true)} className="text-sm text-accent">+ Додати</button>}>
        <DayFeed child={child} dayStart={day} show="sleep" empty="Снів не записано" />
      </Section>

      <SleepEditSheet open={adding} onClose={() => setAdding(false)} childId={child.id} sleep={null} />
    </div>
  )
}
