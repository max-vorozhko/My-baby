import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Child } from '@/db/types'
import { formatAge, getAge } from '@/lib/age'
import { startOfDay, useNow } from '@/lib/time'
import { Section } from '@/ui/kit'
import { SleepCard } from '@/features/sleep/SleepCard'
import { ActiveFeeding } from '@/features/feeding/ActiveFeeding'
import { FeedingSheet } from '@/features/feeding/FeedingSheet'
import { useFoodSheets } from '@/features/food/FoodSheets'
import { InstallHint } from './InstallHint'
import { DayFeed } from './DayFeed'
import { Widgets } from './Widgets'

export function Today({ child }: { child: Child }) {
  const now = useNow(30_000)
  const navigate = useNavigate()
  const [feedOpen, setFeedOpen] = useState(false)
  const today = startOfDay(now)
  const age = getAge(child.birth_date)
  const sheets = useFoodSheets(child)

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3 px-1">
        <span className="flex h-13 w-13 items-center justify-center rounded-full bg-linear-to-br from-feed-soft to-accent-soft text-2xl" aria-hidden>👶</span>
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight">{child.name}</h1>
          <p className="text-sm font-semibold text-muted">{formatAge(age)}</p>
        </div>
      </header>

      <SleepCard child={child} />
      <ActiveFeeding child={child} />

      <Widgets child={child} now={now} onFeeding={() => setFeedOpen(true)} onMeal={() => sheets.openMeal()}
        onReaction={() => sheets.openReaction()} onSkin={() => navigate('/health/skin')} />

      <InstallHint />

      <Section title="Сьогодні">
        <DayFeed child={child} dayStart={today} />
      </Section>

      <FeedingSheet open={feedOpen} onClose={() => setFeedOpen(false)} child={child} />
      {sheets.element}
    </div>
  )
}
