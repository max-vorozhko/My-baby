import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { useFeedingsSince } from '@/db/hooks'
import { formatAge, getAge } from '@/lib/age'
import { formatAgo, startOfDay, useNow } from '@/lib/time'
import { IconBottle, IconFood } from '@/ui/icons'
import { SleepCard } from '@/features/sleep/SleepCard'
import { ActiveFeeding } from '@/features/feeding/ActiveFeeding'
import { FeedingSheet } from '@/features/feeding/FeedingSheet'
import { feedingTitle } from '@/features/feeding/labels'
import { InstallHint } from './InstallHint'
import { DayFeed } from './DayFeed'

function greeting(h = new Date().getHours()) {
  if (h < 5) return 'Доброї ночі'
  if (h < 12) return 'Доброго ранку'
  if (h < 18) return 'Доброго дня'
  return 'Доброго вечора'
}

export function Today({ child }: { child: Child }) {
  const now = useNow(30_000)
  const [feedOpen, setFeedOpen] = useState(false)
  const age = getAge(child.birth_date)
  const corrected = child.preterm_weeks > 0 ? getAge(child.birth_date, child.preterm_weeks) : null
  const today = startOfDay(now)
  const feedings = useFeedingsSince(child.id, today - 86_400_000)
  const lastFeeding = [...feedings].sort((a, b) => b.start_at.localeCompare(a.start_at))[0]

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-muted">{greeting()}!</p>
          <h1 className="text-2xl font-bold">{child.name}</h1>
        </div>
        <p className="text-right text-sm text-muted">
          <b className="block text-base text-ink">{formatAge(age)}</b>
          {corrected && <>коригований {formatAge(corrected)}</>}
        </p>
      </header>

      <SleepCard child={child} />
      <ActiveFeeding child={child} />

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setFeedOpen(true)} className="flex min-h-24 flex-col items-start justify-between rounded-3xl bg-accent-soft p-4 text-left active:scale-[0.98]">
          <span className="flex items-center gap-2 font-bold text-accent"><IconBottle /> Груди / пляшечка</span>
          <span className="text-xs text-muted">
            {lastFeeding ? `${feedingTitle(lastFeeding)} · ${formatAgo(now - new Date(lastFeeding.start_at).getTime())}` : 'Ще не записували'}
          </span>
        </button>
        <Link to="/food" className="flex min-h-24 flex-col items-start justify-between rounded-3xl bg-food-soft p-4 opacity-70">
          <span className="flex items-center gap-2 font-bold text-food"><IconFood /> Прикорм</span>
          <span className="text-xs text-muted">Крок 3</span>
        </Link>
      </div>

      <InstallHint />

      <section>
        <h2 className="mb-2 font-semibold">Сьогодні</h2>
        <DayFeed child={child} dayStart={today} />
      </section>

      <FeedingSheet open={feedOpen} onClose={() => setFeedOpen(false)} child={child} />
    </div>
  )
}
