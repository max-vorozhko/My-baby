import type { Child } from '@/db/types'
import { endSleep, getActiveSleep, addWakeUp, startSleep } from '@/db/actions'
import { useRecentSleeps } from '@/db/hooks'
import { getAge } from '@/lib/age'
import { sleepForecast } from '@/lib/sleep'
import { formatClock, formatDuration, formatTime, startOfDay, useNow } from '@/lib/time'
import { IconSleep } from '@/ui/icons'

/** Головна картка сну: прогноз + кнопка «Заснув / Прокинувся» (1 тап). */
export function SleepCard({ child }: { child: Child }) {
  const now = useNow(1000)
  const sleeps = useRecentSleeps(child.id, startOfDay(now))
  const age = getAge(child.birth_date, child.preterm_weeks)
  const f = sleepForecast(sleeps, age.months, now)
  const sleeping = f.state === 'sleeping'
  const active = sleeping ? sleeps.find((s) => !s.end_at) : undefined

  const toggle = () => (sleeping ? endSleep(child.id) : startSleep(child.id))
  const wakeUp = async () => {
    const a = await getActiveSleep(child.id)
    if (a) await addWakeUp(a.id)
  }

  return (
    <section className="rounded-3xl bg-sleep-soft p-4">
      {f.state === 'sleeping' && (
        <>
          <p className="text-sm text-muted">{f.kind === 'night' ? 'Нічний сон' : 'Денний сон'} з {formatTime(f.since)}</p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums">{formatClock(now - f.since)}</p>
          {f.kind === 'night' && active && (
            <p className="mt-1 text-sm text-muted">Пробуджень: <b className="text-ink">{active.wake_ups}</b></p>
          )}
        </>
      )}
      {(f.state === 'awake' || f.state === 'overdue') && (
        <>
          <p className="text-sm text-muted">
            {f.nextKind === 'night' ? 'Нічний сон' : 'Наступний сон'} · не спить {formatDuration(f.awakeMs)}
          </p>
          <p className="mt-0.5 text-2xl font-bold">
            {f.state === 'overdue' ? 'Вже час вкладати' : <>близько {formatTime(f.target)}</>}
          </p>
          <p className="mt-1 text-sm text-muted">
            Вікно {formatTime(f.lo)}–{formatTime(f.hi)} · для {age.months} міс зазвичай {formatDuration(f.ww.min_min * 60_000)}–{formatDuration(f.ww.max_min * 60_000)}
          </p>
        </>
      )}
      {f.state === 'unknown' && (
        <>
          <p className="text-sm text-muted">Наступний сон</p>
          <p className="mt-0.5 text-lg font-semibold">Відмітьте, коли малюк засне або прокинеться</p>
          <p className="mt-1 text-sm text-muted">
            Для {age.months} міс вікно неспання зазвичай {formatDuration(f.ww.min_min * 60_000)}–{formatDuration(f.ww.max_min * 60_000)}.
          </p>
        </>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={toggle}
          className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-sleep text-lg font-bold text-white active:scale-[0.98] dark:text-bg"
        >
          <IconSleep />
          {sleeping ? 'Прокинувся' : 'Заснув'}
        </button>
        {sleeping && f.kind === 'night' && (
          <button onClick={wakeUp} className="min-h-14 rounded-2xl border border-line bg-surface px-4 font-semibold">
            +1 пробудження
          </button>
        )}
      </div>
    </section>
  )
}
