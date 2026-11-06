import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { getFood } from '@/data/foods'
import { useFeedingsSince, useMealsSince } from '@/db/hooks'
import { recentlyNew } from '@/lib/food'
import { daysWord } from '@/lib/age'
import { startOfDay, useNow } from '@/lib/time'
import { Button, PageTitle, Section } from '@/ui/kit'
import { ActiveFeeding } from '@/features/feeding/ActiveFeeding'
import { FeedingSheet } from '@/features/feeding/FeedingSheet'
import { DayFeed } from '@/features/today/DayFeed'
import { AllergensCard } from './AllergensCard'
import { useFoodSheets } from './FoodSheets'

export function FoodPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const today = startOfDay(now)
  const [milkOpen, setMilkOpen] = useState(false)
  const feedings = useFeedingsSince(child.id, today)
  const meals = useMealsSince(child.id, 0)
  const sheets = useFoodSheets(child)
  const breast = feedings.filter((f) => f.kind === 'breast').length
  const ml = feedings.reduce((a, f) => a + (f.kind === 'bottle' ? f.amount_ml ?? 0 : 0), 0)
  const fresh = recentlyNew(meals, now)

  return (
    <div className="space-y-5">
      <PageTitle>Їжа</PageTitle>
      <ActiveFeeding child={child} />

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => sheets.openMeal()}>Прикорм</Button>
        <Button variant="secondary" onClick={() => setMilkOpen(true)}>Груди / пляшечка</Button>
      </div>
      {(breast > 0 || ml > 0) && <p className="-mt-3 px-1 text-sm text-muted">Сьогодні: {breast} прикладань{ml > 0 ? ` · ${ml} мл` : ''}</p>}

      {fresh.length > 0 && (
        <Section title="Нові продукти">
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {fresh.map((s) => (
              <li key={s.foodId}>
                <button onClick={() => sheets.openFood(s.foodId)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left">
                  <span>{getFood(s.foodId)?.emoji}</span>
                  <span className="flex-1">{getFood(s.foodId)?.name_uk}</span>
                  <span className="text-sm text-muted">{s.daysSince === 0 ? 'вперше сьогодні' : `вперше ${s.daysSince} ${daysWord(s.daysSince)} тому`} · {s.count}×</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Сьогодні" action={<button onClick={() => sheets.openReaction()} className="text-sm text-accent">+ Реакція</button>}>
        <DayFeed child={child} dayStart={today} show="food" empty="Прикорму сьогодні ще не було" />
      </Section>

      <Section title="Алергени"><AllergensCard child={child} onFood={sheets.openFood} /></Section>

      <Link to="/food/all" className="flex min-h-12 items-center justify-between rounded-2xl border border-line bg-surface px-4">
        <span>Усі продукти</span><span className="text-muted">→</span>
      </Link>

      <FeedingSheet open={milkOpen} onClose={() => setMilkOpen(false)} child={child} />
      {sheets.element}
    </div>
  )
}
