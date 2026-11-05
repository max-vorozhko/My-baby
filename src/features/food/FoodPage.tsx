import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { FOODS } from '@/data/foods'
import { useFeedingsSince, useIntros } from '@/db/hooks'
import { latestIntros } from '@/lib/food'
import { startOfDay, useNow } from '@/lib/time'
import { Button, Card, PageTitle } from '@/ui/kit'
import { ActiveFeeding } from '@/features/feeding/ActiveFeeding'
import { FeedingSheet } from '@/features/feeding/FeedingSheet'
import { DayFeed } from '@/features/today/DayFeed'
import { ObservationCard } from './ObservationCard'
import { AllergensCard } from './AllergensCard'
import { useFoodSheets } from './FoodSheets'

export function FoodPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const today = startOfDay(now)
  const [milkOpen, setMilkOpen] = useState(false)
  const feedings = useFeedingsSince(child.id, today)
  const intros = useIntros(child.id) ?? []
  const sheets = useFoodSheets(child)
  const breastCount = feedings.filter((f) => f.kind === 'breast').length
  const bottleMl = feedings.reduce((a, f) => a + (f.kind === 'bottle' ? f.amount_ml ?? 0 : 0), 0)
  const triedCount = [...latestIntros(intros).values()].filter((i) => i.status !== 'postponed').length

  return (
    <div className="space-y-4">
      <PageTitle sub="Прикорм, алергени і молоко">Їжа</PageTitle>
      <ActiveFeeding child={child} />

      <ObservationCard child={child} onReaction={(id) => sheets.openReaction(id)} onFood={sheets.openFood} />

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => sheets.openMeal()} className="min-h-14 bg-food">Записати прикорм</Button>
        <Button variant="secondary" onClick={() => sheets.openReaction()} className="min-h-14">Реакція</Button>
      </div>

      <Link to="/food/tried" className="flex min-h-16 items-center justify-between rounded-3xl border border-line bg-surface px-4">
        <span>
          <span className="block font-semibold">Що вже пробували</span>
          <span className="block text-sm text-muted">{triedCount} з {FOODS.length} продуктів</span>
        </span>
        <span className="text-accent">→</span>
      </Link>

      <section>
        <h2 className="mb-2 font-semibold">Сьогодні</h2>
        <DayFeed child={child} dayStart={today} show="food" empty="Сьогодні їжі не записано." />
      </section>

      <Card>
        <h2 className="font-semibold">Груди / пляшечка сьогодні</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div><p className="text-xl font-bold">{breastCount}</p><p className="text-xs text-muted">прикладань</p></div>
          <div><p className="text-xl font-bold">{bottleMl} мл</p><p className="text-xs text-muted">з пляшечки</p></div>
        </div>
        <Button variant="secondary" className="mt-3 w-full" onClick={() => setMilkOpen(true)}>Записати годування</Button>
      </Card>

      <AllergensCard child={child} onFood={sheets.openFood} />

      <FeedingSheet open={milkOpen} onClose={() => setMilkOpen(false)} child={child} />
      {sheets.element}
    </div>
  )
}
