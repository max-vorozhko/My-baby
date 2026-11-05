import { useState } from 'react'
import type { Child } from '@/db/types'
import { addSkinCare } from '@/db/actions'
import { useSkinCareSince } from '@/db/hooks'
import { EMOLLIENT_TARGET_DEFAULT } from '@/data/skin'
import { formatAgo, startOfDay, useNow } from '@/lib/time'
import { IconDrop } from '@/ui/icons'
import { PrescribedSheet } from './PrescribedSheet'

/** Догляд за шкірою в 1 тап: крем, купання, призначений засіб. */
export function SkinCareButtons({ child, compact = false }: { child: Child; compact?: boolean }) {
  const now = useNow(30_000)
  const care = useSkinCareSince(child.id, startOfDay(now))
  const [rx, setRx] = useState(false)
  const creams = care.filter((c) => c.kind === 'emollient')
  const last = [...creams].sort((a, b) => b.at.localeCompare(a.at))[0]
  const target = EMOLLIENT_TARGET_DEFAULT
  const baths = care.filter((c) => c.kind === 'bath').length

  return (
    <>
      <div className={`grid gap-2 ${compact ? 'grid-cols-[1fr_auto]' : 'grid-cols-3'}`}>
        <button
          onClick={() => addSkinCare(child.id, 'emollient')}
          className={`flex min-h-14 items-center gap-2 rounded-2xl bg-sleep-soft px-4 text-left active:scale-[0.98] ${compact ? '' : 'col-span-3'}`}
        >
          <IconDrop className="text-sleep" />
          <span className="flex-1">
            <span className="block font-bold">Нанесли крем</span>
            <span className="block text-xs text-muted">
              {creams.length} з {target} сьогодні{last ? ` · ${formatAgo(now - new Date(last.at).getTime())}` : ''}
            </span>
          </span>
          {creams.length >= target && <span className="text-sleep">✓</span>}
        </button>
        {compact ? (
          <button onClick={() => addSkinCare(child.id, 'bath')} className="min-h-14 rounded-2xl border border-line bg-surface px-4 font-semibold">
            Купання{baths ? ` ✓` : ''}
          </button>
        ) : (
          <>
            <button onClick={() => addSkinCare(child.id, 'bath')} className="col-span-1 min-h-12 rounded-2xl border border-line bg-surface font-semibold">
              Купання{baths ? ` · ${baths}` : ''}
            </button>
            <button onClick={() => setRx(true)} className="col-span-2 min-h-12 rounded-2xl border border-line bg-surface font-semibold">
              Засіб від лікаря
            </button>
          </>
        )}
      </div>
      <PrescribedSheet child={child} open={rx} onClose={() => setRx(false)} />
    </>
  )
}
