import { useEffect, useRef, useState } from 'react'
import type { BreastSide, Child } from '@/db/types'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { startBreast, stopFeeding } from '@/db/actions'
import { formatClock, useNow } from '@/lib/time'
import { sideLabel } from './labels'

/**
 * Активний таймер грудей: зміна сторони і «Стоп» — по 1 тапу.
 * Реакція на тап миттєва (оптимістично), повторні тапи під час збереження ігноруються.
 */
export function ActiveFeeding({ child }: { child: Child }) {
  const now = useNow(1000)
  const active = useLiveQuery(
    () => db.feedings.where('[child_id+start_at]')
      .between([child.id, new Date(Date.now() - 24 * 3600_000).toISOString()], [child.id, '\uffff'])
      .filter((f) => !f.end_at && !f.deleted_at).last(),
    [child.id],
  )
  const [stoppedId, setStoppedId] = useState<string | null>(null)
  const [switched, setSwitched] = useState<{ side: BreastSide; since: number } | null>(null)
  const busy = useRef(false)

  // Скидаємо оптимістичний стан, коли база наздогнала.
  useEffect(() => { setSwitched(null) }, [active?.id])

  if (!active || active.kind !== 'breast' || !active.side || active.id === stoppedId) return null
  const side = switched?.side ?? active.side
  const since = switched?.since ?? new Date(active.start_at).getTime()
  const other: BreastSide = side === 'left' ? 'right' : 'left'

  const run = async (fn: () => Promise<unknown>) => {
    if (busy.current) return
    busy.current = true
    try { await fn() } finally { busy.current = false }
  }
  const stop = () => { setStoppedId(active.id); void run(() => stopFeeding(child.id)).catch(() => setStoppedId(null)) }
  const swap = () => { setSwitched({ side: other, since: Date.now() }); void run(() => startBreast(child.id, other)).catch(() => setSwitched(null)) }

  return (
    <section className="flex items-center gap-3 rounded-3xl bg-surface p-3 pl-4 shadow-soft">
      <div className="flex-1">
        <p className="text-lg font-semibold tabular-nums">{formatClock(now - since)}</p>
        <p className="text-sm text-muted">{sideLabel[side]}</p>
      </div>
      <button onClick={swap} className="min-h-12 rounded-full border border-line px-4 text-sm">
        На {other === 'left' ? 'ліву' : 'праву'}
      </button>
      <button onClick={stop} className="min-h-12 rounded-full bg-accent px-5 text-sm font-semibold text-white dark:text-bg">
        Стоп
      </button>
    </section>
  )
}
