import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { setSkinModule } from '@/db/actions'
import { useSkinChecksSince } from '@/db/hooks'
import { ITCH_LONG } from '@/data/skin'
import { isoDate } from '@/lib/skin'
import { startOfDay } from '@/lib/time'
import { Button, Card, PageTitle } from '@/ui/kit'

export function HealthPage({ child }: { child: Child }) {
  const checks = useSkinChecksSince(child.id, isoDate(startOfDay()))
  const today = checks[0]

  return (
    <div className="space-y-4">
      <PageTitle>Здоров'я</PageTitle>
      {child.skin_module ? (
        <Link to="/health/skin" className="flex min-h-16 items-center justify-between rounded-2xl border border-line bg-surface px-4">
          <span>
            <span className="block font-semibold">Шкіра</span>
            <span className="block text-sm text-muted">{today ? `Сьогодні: свербіж ${ITCH_LONG[today.itch]}` : 'Огляду сьогодні ще немає'}</span>
          </span>
          <span className="text-muted">→</span>
        </Link>
      ) : (
        <Card>
          <p className="font-semibold">Шкіра</p>
          <p className="mt-1 text-sm text-muted">Щоденник для сухої шкіри чи дерматиту: свербіж, зони, крем, фото.</p>
          <Button className="mt-3 w-full" onClick={() => setSkinModule(child.id, true)}>Увімкнути</Button>
        </Card>
      )}
      <p className="px-1 text-sm text-muted">Ріст, вага і віхи з'являться пізніше.</p>
    </div>
  )
}
