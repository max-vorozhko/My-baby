import { useState, type ReactNode } from 'react'
import type { Child } from '@/db/types'
import { useFeedingsSince, useMealsSince } from '@/db/hooks'
import { foodName } from '@/data/foods'
import { formatAge, getAge } from '@/lib/age'
import { formatAgo, startOfDay, useNow } from '@/lib/time'
import { IconAlert, IconBottle, IconFood } from '@/ui/icons'
import { Dot, Section } from '@/ui/kit'
import { SleepCard } from '@/features/sleep/SleepCard'
import { ActiveFeeding } from '@/features/feeding/ActiveFeeding'
import { FeedingSheet } from '@/features/feeding/FeedingSheet'
import { feedingTitle } from '@/features/feeding/labels'
import { useFoodSheets } from '@/features/food/FoodSheets'
import { SkinToday } from '@/features/health/skin/SkinToday'
import { InstallHint } from './InstallHint'
import { DayFeed } from './DayFeed'

function Tile({ icon, label, sub, onClick }: { icon: ReactNode; label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left active:scale-[0.98]">
      {icon}
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted">{sub}</span>
      </span>
    </button>
  )
}

export function Today({ child }: { child: Child }) {
  const now = useNow(30_000)
  const [feedOpen, setFeedOpen] = useState(false)
  const today = startOfDay(now)
  const age = getAge(child.birth_date)
  const feedings = useFeedingsSince(child.id, today - 86_400_000)
  const meals = useMealsSince(child.id, today - 7 * 86_400_000)
  const sheets = useFoodSheets(child)
  const lastFeeding = [...feedings].sort((a, b) => b.start_at.localeCompare(a.start_at))[0]
  const lastMeal = [...meals].sort((a, b) => b.at.localeCompare(a.at))[0]

  return (
    <div className="space-y-5">
      <header className="px-1">
        <h1 className="text-2xl font-bold">{child.name}</h1>
        <p className="text-sm text-muted">{formatAge(age)}</p>
      </header>

      <SleepCard child={child} />
      <ActiveFeeding child={child} />

      <div className="grid grid-cols-2 gap-2">
        <Tile icon={<Dot tone="accent"><IconBottle width={20} height={20} /></Dot>} label="Годування" onClick={() => setFeedOpen(true)}
          sub={lastFeeding ? `${feedingTitle(lastFeeding)} · ${formatAgo(now - new Date(lastFeeding.start_at).getTime())}` : 'Ще не записували'} />
        <Tile icon={<Dot tone="food"><IconFood width={20} height={20} /></Dot>} label="Прикорм" onClick={() => sheets.openMeal()}
          sub={lastMeal ? `${lastMeal.items.map((i) => foodName(i.food_id)).join(', ')} · ${formatAgo(now - new Date(lastMeal.at).getTime())}` : 'Ще не записували'} />
      </div>
      <button onClick={() => sheets.openReaction()} className="-mt-3 flex min-h-11 w-full items-center gap-2 px-1 text-sm text-muted">
        <IconAlert width={16} height={16} /> Записати реакцію
      </button>

      {child.skin_module && <Section title="Шкіра"><SkinToday child={child} /></Section>}

      <InstallHint />

      <Section title="Сьогодні">
        <DayFeed child={child} dayStart={today} />
      </Section>

      <FeedingSheet open={feedOpen} onClose={() => setFeedOpen(false)} child={child} />
      {sheets.element}
    </div>
  )
}
