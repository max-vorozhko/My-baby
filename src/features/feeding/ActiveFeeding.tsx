import type { Child } from '@/db/types'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { startBreast, stopFeeding } from '@/db/actions'
import { formatClock, formatTime, useNow } from '@/lib/time'
import { sideLabel } from './labels'

/** Активний таймер грудей: зміна сторони і завершення — по 1 тапу. */
export function ActiveFeeding({ child }: { child: Child }) {
  const now = useNow(1000)
  const active = useLiveQuery(
    () => db.feedings.where('child_id').equals(child.id).filter((f) => !f.end_at && !f.deleted_at).first(),
    [child.id],
  )
  if (!active || active.kind !== 'breast' || !active.side) return null
  const other = active.side === 'left' ? 'right' : 'left'

  return (
    <section className="rounded-3xl bg-accent-soft p-4">
      <p className="text-sm text-muted">{sideLabel[active.side]} з {formatTime(active.start_at)}</p>
      <p className="mt-0.5 text-3xl font-bold tabular-nums">{formatClock(now - new Date(active.start_at).getTime())}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => startBreast(child.id, other)} className="min-h-12 flex-1 rounded-2xl border border-line bg-surface font-semibold">
          На {other === 'left' ? 'ліву' : 'праву'}
        </button>
        <button onClick={() => stopFeeding(child.id)} className="min-h-12 flex-1 rounded-2xl bg-accent font-bold text-white dark:text-bg">
          Завершити
        </button>
      </div>
    </section>
  )
}
