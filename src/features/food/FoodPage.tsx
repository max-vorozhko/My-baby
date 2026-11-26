import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { foodName, getFood } from '@/data/foods'
import { useFeedingsSince, useMealsSince, useReactionsSince } from '@/db/hooks'
import { recentlyNew } from '@/lib/food'
import { daysWord } from '@/lib/age'
import { startOfDay, useNow } from '@/lib/time'
import { PageTitle, Section } from '@/ui/kit'
import { ActionRow, Tile } from '@/ui/Tile'
import { ActiveFeeding } from '@/features/feeding/ActiveFeeding'
import { FeedingSheet } from '@/features/feeding/FeedingSheet'
import { DayFeed } from '@/features/today/DayFeed'
import { useFoodSheets } from './FoodSheets'
import { FoodImage } from '@/ui/FoodImage'

const timesWord = (n: number) => {
  const a = n % 10, b = n % 100
  if (a === 1 && b !== 11) return 'раз'
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'рази'
  return 'разів'
}

const LINKS = [
  { to: '/food/calendar', icon: '📅', title: 'Календар їжі' },
  { to: '/food/allergens', icon: '🥚', title: 'Алергени' },
  { to: '/food/all', icon: '🥕', title: 'Усі продукти' },
]

export function FoodPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const today = startOfDay(now)
  const [milkOpen, setMilkOpen] = useState(false)
  const feedings = useFeedingsSince(child.id, today).filter((f) => new Date(f.start_at).getTime() >= today)
  const meals = useMealsSince(child.id, 0)
  const reactions = useReactionsSince(child.id, today)
  const sheets = useFoodSheets(child)

  const ml = feedings.reduce((a, f) => a + (f.kind === 'bottle' ? f.amount_ml ?? 0 : 0), 0)
  const mealsToday = meals.filter((m) => new Date(m.at).getTime() >= today)
  const foodsToday = [...new Set(mealsToday.flatMap((m) => m.items.map((i) => i.food_id)))]
  const fresh = recentlyNew(meals, now)
  const hasToday = mealsToday.length > 0 || reactions.length > 0

  return (
    <div className="space-y-5">
      <PageTitle>Їжа</PageTitle>
      <ActiveFeeding child={child} />

      <div className="grid grid-cols-2 gap-3">
        <Tile tone="feed" title="Годування" onClick={() => setMilkOpen(true)}
          value={feedings.length || undefined} unit={feedings.length ? `${timesWord(feedings.length)} сьогодні` : undefined}
          sub={ml ? `пляшечка ${ml} мл` : undefined} />
        <Tile tone="food" title="Прикорм" onClick={() => sheets.openMeal()}
          value={mealsToday.length || undefined} unit={mealsToday.length ? `${timesWord(mealsToday.length)} сьогодні` : undefined}
          sub={foodsToday.length ? foodsToday.map((id) => foodName(id).toLowerCase()).join(', ') : undefined} />
        <ActionRow title="Реакція" onClick={() => sheets.openReaction()} />
      </div>

      {fresh.length > 0 && (
        <Section title="Нові продукти">
          <ul className="divide-y divide-line rounded-3xl bg-surface shadow-soft">
            {fresh.map((s) => (
              <li key={s.foodId}>
                <button onClick={() => sheets.openFood(s.foodId)} className="flex min-h-14 w-full items-center gap-3 px-3 py-1 text-left">
                  <FoodImage food={getFood(s.foodId)} size={40} />
                  <span className="flex-1 font-semibold">{getFood(s.foodId)?.name_uk}</span>
                  <span className="text-[13px] text-muted">{s.daysSince === 0 ? 'сьогодні' : `${s.daysSince} ${daysWord(s.daysSince)} тому`}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {hasToday && (
        <Section title="Сьогодні">
          <DayFeed child={child} dayStart={today} show="food" empty="" />
        </Section>
      )}

      <nav className="divide-y divide-line overflow-hidden rounded-3xl bg-surface shadow-soft">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="flex min-h-14 items-center gap-3 px-4">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-food-soft text-lg">{l.icon}</span>
            <span className="flex-1 text-[17px] font-semibold">{l.title}</span>
            <span aria-hidden className="text-muted">›</span>
          </Link>
        ))}
      </nav>

      <FeedingSheet open={milkOpen} onClose={() => setMilkOpen(false)} child={child} />
      {sheets.element}
    </div>
  )
}
