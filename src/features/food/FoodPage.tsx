import { useState } from 'react'
import type { Child } from '@/db/types'
import { useFeedingsSince } from '@/db/hooks'
import { startOfDay, useNow } from '@/lib/time'
import { Button, Card, ComingSoon, PageTitle } from '@/ui/kit'
import { ActiveFeeding } from '@/features/feeding/ActiveFeeding'
import { FeedingSheet } from '@/features/feeding/FeedingSheet'
import { DayFeed } from '@/features/today/DayFeed'

export function FoodPage({ child }: { child: Child }) {
  const now = useNow(60_000)
  const today = startOfDay(now)
  const [open, setOpen] = useState(false)
  const feedings = useFeedingsSince(child.id, today)
  const breastCount = feedings.filter((f) => f.kind === 'breast').length
  const bottleMl = feedings.reduce((a, f) => a + (f.kind === 'bottle' ? f.amount_ml ?? 0 : 0), 0)

  return (
    <div className="space-y-4">
      <PageTitle sub="Молоко, прикорм і алергени">Їжа</PageTitle>
      <ActiveFeeding child={child} />

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Груди / пляшечка сьогодні</h2>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div><p className="text-xl font-bold">{breastCount}</p><p className="text-xs text-muted">прикладань</p></div>
          <div><p className="text-xl font-bold">{bottleMl} мл</p><p className="text-xs text-muted">з пляшечки</p></div>
        </div>
        <Button className="mt-3 w-full" onClick={() => setOpen(true)}>Записати годування</Button>
      </Card>

      <DayFeed child={child} dayStart={today} show="feeding" empty="Сьогодні годувань не записано." />

      <ComingSoon stage="Крок 3" title="Прикорм" items={[
        'База продуктів з формою подачі за віком',
        'Новий продукт → 3 дні спостереження',
        'Журнал реакцій і 9 основних алергенів',
        '«Що вже пробували»',
      ]} />

      <FeedingSheet open={open} onClose={() => setOpen(false)} child={child} />
    </div>
  )
}
