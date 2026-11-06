import type { Child } from '@/db/types'
import { addWakeUp, endSleep, getActiveSleep, startSleep } from '@/db/actions'
import { useRecentSleeps } from '@/db/hooks'
import { MIN_SAMPLES, sleepForecast, sleepPatterns } from '@/lib/sleep'
import { formatClock, formatDuration, formatTime, MIN, startOfDay, useNow } from '@/lib/time'
import { IconSleep } from '@/ui/icons'

/** Кільце прогресу навколо кнопки. */
function Ring({ progress, children }: { progress: number | null; children: React.ReactNode }) {
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-[92px] w-[92px] shrink-0">
      <svg viewBox="0 0 92 92" className="absolute inset-0" aria-hidden>
        <circle cx="46" cy="46" r={r} fill="none" stroke="rgb(255 255 255 / 0.28)" strokeWidth="6" />
        {progress !== null && (
          <circle cx="46" cy="46" r={r} fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, progress))} transform="rotate(-90 46 46)"
            style={{ transition: 'stroke-dashoffset .6s' }} />
        )}
      </svg>
      {children}
    </div>
  )
}

/** Головна картка сну: стан, прогноз з власних записів і кнопка в кільці. */
export function SleepCard({ child }: { child: Child }) {
  const now = useNow(1000)
  const sleeps = useRecentSleeps(child.id, startOfDay(now))
  const patterns = sleepPatterns(sleeps, now)
  const f = sleepForecast(sleeps, now, patterns)
  const sleeping = f.state === 'sleeping'
  const active = sleeping ? sleeps.find((s) => !s.end_at) : undefined

  const toggle = () => (sleeping ? endSleep(child.id) : startSleep(child.id))
  const wakeUp = async () => { const a = await getActiveSleep(child.id); if (a) await addWakeUp(a.id) }

  let label = 'Сон'
  let value = '—'
  let sub = 'Відмітьте, коли малюк засне'
  let progress: number | null = null

  if (f.state === 'sleeping') {
    label = f.kind === 'night' ? `Нічний сон з ${formatTime(f.since)}` : `Спить з ${formatTime(f.since)}`
    value = formatClock(now - f.since)
    const typical = f.kind === 'night' ? patterns.nightDuration : patterns.napDuration[0]
    if (typical && typical.n >= MIN_SAMPLES) {
      progress = (now - f.since) / (typical.median * MIN)
      sub = `Зазвичай спить ${formatDuration(typical.median * MIN)}`
    } else sub = ''
    if (active && f.kind === 'night' && active.wake_ups) sub = `${sub ? sub + ' · ' : ''}пробуджень: ${active.wake_ups}`
  } else if (f.state === 'learning') {
    label = 'Не спить'
    value = formatDuration(f.awakeMs)
    sub = `Прогноз — після ${MIN_SAMPLES} днів записів`
  } else if (f.state === 'awake' || f.state === 'past') {
    label = 'Не спить'
    value = formatDuration(f.awakeMs)
    progress = f.awakeMs / (f.typical.median * MIN)
    sub = f.state === 'past' ? `Зазвичай засинав до ${formatTime(f.hi)}` : `Зазвичай засинає ~${formatTime(f.target)}`
  }

  return (
    <section className="rounded-[28px] bg-linear-to-br from-dusk-1 via-dusk-2 to-dusk-3 p-5 text-white shadow-lift">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold opacity-85">{label}</p>
          <p className="mt-0.5 text-[30px] font-extrabold leading-tight tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-sm opacity-95">{sub}</p>}
        </div>
        <Ring progress={progress}>
          <button
            onClick={toggle}
            aria-label={sleeping ? 'Прокинувся' : 'Заснув'}
            className="absolute inset-[10px] flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/15 text-xs font-bold backdrop-blur active:scale-95"
          >
            <IconSleep width={22} height={22} />
            {sleeping ? 'Прокинувся' : 'Заснув'}
          </button>
        </Ring>
      </div>
      {sleeping && f.kind === 'night' && (
        <button onClick={wakeUp} className="mt-3 min-h-10 rounded-full bg-white/20 px-4 text-sm font-semibold">+1 пробудження</button>
      )}
    </section>
  )
}
