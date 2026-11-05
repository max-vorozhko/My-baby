import { useState } from 'react'
import type { Child } from '@/db/types'
import { useRecentSleeps } from '@/db/hooks'
import { WAKE_WINDOWS } from '@/data/wakeWindows'
import { getAge } from '@/lib/age'
import { daySummary, transitionHint } from '@/lib/sleep'
import { DAY_MS, formatDayLabel, formatDuration, shortDayLabel, startOfDay, useNow } from '@/lib/time'
import { Button, Card, PageTitle } from '@/ui/kit'
import { SleepCard } from './SleepCard'
import { SleepEditSheet } from './SleepEditSheet'
import { DayFeed } from '@/features/today/DayFeed'

export function SleepPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const today = startOfDay(now)
  const sleeps = useRecentSleeps(child.id, today)
  const age = getAge(child.birth_date, child.preterm_weeks)
  const [adding, setAdding] = useState(false)
  const [day, setDay] = useState(today)
  const [showTable, setShowTable] = useState(false)

  const todaySum = daySummary(sleeps, today, now)
  const week = Array.from({ length: 7 }, (_, i) => today - (6 - i) * DAY_MS).map((ds) => ({ ds, ...daySummary(sleeps, ds, now) }))
  const recorded = week.filter((d) => d.totalMs > 0 && d.ds < today)
  const avg = recorded.length ? recorded.reduce((a, d) => a + d.totalMs, 0) / recorded.length : 0
  const maxMs = Math.max(...week.map((d) => d.totalMs), 1)
  const hint = transitionHint(sleeps, age.months, now)

  return (
    <div className="space-y-4">
      <PageTitle>Сон</PageTitle>
      <SleepCard child={child} />

      {hint && (
        <Card className="bg-sleep-soft border-transparent">
          <p className="font-semibold">{hint === '3to2' ? 'Схоже, малюк переходить на 2 сни' : 'Схоже, малюк переходить на 1 сон'}</p>
          <p className="mt-1 text-sm text-muted">
            Останні дні було {hint === '3to2' ? '2 денні сни' : '1 денний сон'}. Це нормально в цьому віці: вікна неспання стануть довшими, а нічний сон можна трохи зсунути раніше.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">Сьогодні</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-xl font-bold">{formatDuration(todaySum.totalMs)}</p><p className="text-xs text-muted">усього</p></div>
          <div><p className="text-xl font-bold">{todaySum.naps}</p><p className="text-xs text-muted">денних снів</p></div>
          <div><p className="text-xl font-bold">{todaySum.wakeUps}</p><p className="text-xs text-muted">пробуджень вночі</p></div>
        </div>
      </Card>

      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">За тиждень</h2>
          {avg > 0 && <p className="text-sm text-muted">в середньому {formatDuration(avg)}/добу</p>}
        </div>
        <div className="mt-3 flex h-32 items-end gap-1.5">
          {week.map((d) => (
            <button key={d.ds} onClick={() => setDay(d.ds)} className="flex h-full flex-1 flex-col items-center justify-end gap-1" aria-label={`${formatDayLabel(d.ds, now)}: ${formatDuration(d.totalMs)}`}>
              <div className="flex w-full flex-col justify-end overflow-hidden rounded-lg" style={{ height: `${(d.totalMs / maxMs) * 100}%`, minHeight: d.totalMs ? 4 : 0 }}>
                <div className="bg-sleep/50" style={{ flexGrow: d.dayMs }} />
                <div className="bg-sleep" style={{ flexGrow: d.nightMs }} />
              </div>
              <span className={`text-[11px] ${d.ds === day ? 'font-bold text-ink' : 'text-muted'}`}>{shortDayLabel(d.ds, now)}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 flex gap-4 text-xs text-muted">
          <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-sleep" /> ніч</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-sleep/50" /> день</span>
        </p>
      </Card>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">{formatDayLabel(day, now)}</h2>
          <Button variant="ghost" onClick={() => setAdding(true)}>+ Додати сон</Button>
        </div>
        <DayFeed child={child} dayStart={day} show="sleep" empty="Снів за цю добу не записано." />
      </section>

      <Card>
        <button className="flex min-h-12 w-full items-center justify-between font-semibold" onClick={() => setShowTable((v) => !v)}>
          Вікна неспання за віком <span className="text-muted">{showTable ? '−' : '+'}</span>
        </button>
        {showTable && (
          <>
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-muted"><tr><th className="py-1 font-medium">Вік</th><th className="font-medium">Вікно</th><th className="font-medium">Снів</th></tr></thead>
              <tbody>
                {WAKE_WINDOWS.filter((w) => w.age_from_m >= 4 && w.age_from_m < 19).map((w) => (
                  <tr key={w.age_from_m} className={age.months >= w.age_from_m && age.months < w.age_to_m ? 'font-bold' : ''}>
                    <td className="py-1">{w.age_from_m}–{w.age_to_m} міс</td>
                    <td>{formatDuration(w.min_min * 60_000)}–{formatDuration(w.max_min * 60_000)}</td>
                    <td>{w.naps_per_day}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">Орієнтовні діапазони, кожна дитина індивідуальна. Чернетка — чекає перевірки педіатром.</p>
          </>
        )}
      </Card>

      <SleepEditSheet open={adding} onClose={() => setAdding(false)} childId={child.id} sleep={null} />
    </div>
  )
}
