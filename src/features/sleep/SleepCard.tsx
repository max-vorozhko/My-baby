import type { Child } from '@/db/types'
import { addWakeUp, endSleep, getActiveSleep, startSleep } from '@/db/actions'
import { useRecentSleeps } from '@/db/hooks'
import { MIN_SAMPLES, sleepForecast } from '@/lib/sleep'
import { formatClock, formatDuration, formatTime, startOfDay, useNow } from '@/lib/time'
import { IconSleep } from '@/ui/icons'

/** Стан сну + 1 тап «Заснув / Прокинувся». Прогноз — з власних записів дитини. */
export function SleepCard({ child }: { child: Child }) {
  const now = useNow(1000)
  const sleeps = useRecentSleeps(child.id, startOfDay(now))
  const f = sleepForecast(sleeps, now)
  const sleeping = f.state === 'sleeping'
  const active = sleeping ? sleeps.find((s) => !s.end_at) : undefined

  const toggle = () => (sleeping ? endSleep(child.id) : startSleep(child.id))
  const wakeUp = async () => { const a = await getActiveSleep(child.id); if (a) await addWakeUp(a.id) }

  let title = ''
  let sub = ''
  if (f.state === 'sleeping') {
    title = `Спить ${formatClock(now - f.since)}`
    sub = `${f.kind === 'night' ? 'Нічний' : 'Денний'} сон з ${formatTime(f.since)}${active && f.kind === 'night' && active.wake_ups ? ` · пробуджень: ${active.wake_ups}` : ''}`
  } else if (f.state === 'no_data') {
    title = 'Сон'
    sub = 'Відмітьте, коли малюк засне'
  } else {
    title = `Не спить ${formatDuration(f.awakeMs)}`
    if (f.state === 'learning') sub = `Прогноз з'явиться після ${MIN_SAMPLES} днів записів`
    else sub = `${f.state === 'past' ? 'Зазвичай засинав до' : 'Зазвичай засинає'} ${f.state === 'past' ? formatTime(f.hi) : `близько ${formatTime(f.target)}`}`
  }

  return (
    <section className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
      <div className="min-w-0 flex-1">
        <p className="text-xl font-semibold tabular-nums">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{sub}</p>
        {sleeping && f.kind === 'night' && (
          <button onClick={wakeUp} className="mt-2 min-h-10 rounded-full border border-line px-3 text-sm">+1 пробудження</button>
        )}
      </div>
      <button
        onClick={toggle}
        aria-label={sleeping ? 'Прокинувся' : 'Заснув'}
        className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-full bg-sleep text-xs font-semibold text-white active:scale-95 dark:text-bg"
      >
        <IconSleep width={24} height={24} />
        {sleeping ? 'Прокинувся' : 'Заснув'}
      </button>
    </section>
  )
}
