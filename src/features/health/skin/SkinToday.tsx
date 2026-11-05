import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { useSkinChecksSince } from '@/db/hooks'
import { ITCH_LABEL } from '@/data/skin'
import { isoDate } from '@/lib/skin'
import { startOfDay, useNow } from '@/lib/time'
import { SkinCareButtons } from './SkinCareButtons'
import { SkinCheckSheet } from './SkinCheckSheet'

/** Блок шкіри на «Сьогодні»: крем у 1 тап і огляд дня. */
export function SkinToday({ child }: { child: Child }) {
  const now = useNow(60_000)
  const date = isoDate(startOfDay(now))
  const check = useSkinChecksSince(child.id, date)[0]
  const [open, setOpen] = useState(false)

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Шкіра</h2>
        <Link to="/health/skin" className="text-sm text-accent">Детальніше →</Link>
      </div>
      <SkinCareButtons child={child} compact />
      <button onClick={() => setOpen(true)} className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 text-left">
        <span className="font-semibold">{check ? `Свербіж: ${ITCH_LABEL[check.itch].toLowerCase()}` : 'Огляд шкіри за сьогодні'}</span>
        <span className="text-sm text-accent">{check ? 'змінити' : 'зробити'}</span>
      </button>
      <SkinCheckSheet child={child} date={date} open={open} onClose={() => setOpen(false)} />
    </section>
  )
}
