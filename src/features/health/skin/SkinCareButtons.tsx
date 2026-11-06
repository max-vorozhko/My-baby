import { useState } from 'react'
import type { Child } from '@/db/types'
import { addSkinCare } from '@/db/actions'
import { useSkinCareSince } from '@/db/hooks'
import { formatAgo, startOfDay, useNow } from '@/lib/time'
import { PrescribedSheet } from './PrescribedSheet'

/** Відмітки догляду в 1 тап: крем, купання, засіб від лікаря. */
export function SkinCareButtons({ child }: { child: Child }) {
  const now = useNow(30_000)
  const care = useSkinCareSince(child.id, startOfDay(now))
  const [rx, setRx] = useState(false)
  const creams = care.filter((c) => c.kind === 'emollient')
  const last = [...creams].sort((a, b) => b.at.localeCompare(a.at))[0]
  const baths = care.filter((c) => c.kind === 'bath').length
  const meds = care.filter((c) => c.kind === 'prescribed').length

  const btn = 'flex min-h-16 flex-col items-center justify-center rounded-3xl bg-surface shadow-soft px-2 text-center active:scale-[0.98]'
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => addSkinCare(child.id, 'emollient')} className={btn}>
          <span className="font-semibold">Крем</span>
          <span className="text-xs text-muted">{creams.length ? `${creams.length} · ${formatAgo(now - new Date(last.at).getTime())}` : 'сьогодні 0'}</span>
        </button>
        <button onClick={() => addSkinCare(child.id, 'bath')} className={btn}>
          <span className="font-semibold">Купання</span>
          <span className="text-xs text-muted">сьогодні {baths}</span>
        </button>
        <button onClick={() => setRx(true)} className={btn}>
          <span className="font-semibold">Засіб</span>
          <span className="text-xs text-muted">сьогодні {meds}</span>
        </button>
      </div>
      <PrescribedSheet child={child} open={rx} onClose={() => setRx(false)} />
    </>
  )
}
