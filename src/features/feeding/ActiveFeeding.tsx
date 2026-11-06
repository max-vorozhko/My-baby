import type { Child } from '@/db/types'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { startBreast, stopFeeding } from '@/db/actions'
import { formatClock, useNow } from '@/lib/time'
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
    <section className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-surface p-3 pl-4">
      <div className="flex-1">
        <p className="text-lg font-semibold tabular-nums">{formatClock(now - new Date(active.start_at).getTime())}</p>
        <p className="text-sm text-muted">{sideLabel[active.side]}</p>
      </div>
      <button onClick={() => startBreast(child.id, other)} className="min-h-11 rounded-full border border-line px-4 text-sm">
        На {other === 'left' ? 'ліву' : 'праву'}
      </button>
      <button onClick={() => stopFeeding(child.id)} className="min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-white dark:text-bg">
        Стоп
      </button>
    </section>
  )
}
