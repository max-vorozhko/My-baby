import { useState } from 'react'
import type { Child, Feeding, Sleep } from '@/db/types'
import { useFeedingsSince, useSleepsSince } from '@/db/hooks'
import { DAY_MS, formatDuration, formatTime, useNow } from '@/lib/time'
import { IconBottle, IconSleep } from '@/ui/icons'
import { Card } from '@/ui/kit'
import { SleepEditSheet } from '@/features/sleep/SleepEditSheet'
import { FeedingEditSheet } from '@/features/feeding/FeedingEditSheet'
import { feedingTitle } from '@/features/feeding/labels'

type Item = { t: string; sleep?: Sleep; feeding?: Feeding }

/** Стрічка подій доби; тап по запису — редагування. */
export function DayFeed({ child, dayStart, show = 'all', empty }: {
  child: Child; dayStart: number; show?: 'all' | 'sleep' | 'feeding'; empty?: string
}) {
  const now = useNow(30_000)
  const dayEnd = dayStart + DAY_MS
  const sleeps = useSleepsSince(child.id, dayStart)
  const feedings = useFeedingsSince(child.id, dayStart)
  const [editSleep, setEditSleep] = useState<Sleep | null>(null)
  const [editFeeding, setEditFeeding] = useState<Feeding | null>(null)

  const items: Item[] = []
  if (show !== 'feeding') {
    for (const s of sleeps) {
      const end = s.end_at ? new Date(s.end_at).getTime() : now
      if (end > dayStart && new Date(s.start_at).getTime() < dayEnd) items.push({ t: s.start_at, sleep: s })
    }
  }
  if (show !== 'sleep') {
    for (const f of feedings) if (new Date(f.start_at).getTime() < dayEnd) items.push({ t: f.start_at, feeding: f })
  }
  items.sort((a, b) => b.t.localeCompare(a.t))

  if (items.length === 0) {
    return <Card className="text-center text-muted">{empty ?? 'Поки порожньо. Натисніть «Заснув» або «Груди / пляшечка».'}</Card>
  }

  return (
    <>
      <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
        {items.map(({ sleep, feeding }) => {
          if (sleep) {
            const end = sleep.end_at ? new Date(sleep.end_at).getTime() : now
            return (
              <li key={sleep.id}>
                <button onClick={() => setEditSleep(sleep)} className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sleep-soft text-sleep"><IconSleep width={20} height={20} /></span>
                  <span className="flex-1">
                    <span className="block font-semibold">{sleep.kind === 'night' ? 'Нічний сон' : 'Денний сон'}{!sleep.end_at && ' · спить'}</span>
                    <span className="block text-sm text-muted">
                      {formatTime(sleep.start_at)}–{sleep.end_at ? formatTime(sleep.end_at) : 'зараз'}
                      {sleep.kind === 'night' && sleep.wake_ups > 0 && ` · пробуджень: ${sleep.wake_ups}`}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{formatDuration(end - new Date(sleep.start_at).getTime())}</span>
                </button>
              </li>
            )
          }
          const f = feeding!
          const dur = f.kind === 'breast' ? (f.end_at ? new Date(f.end_at).getTime() : now) - new Date(f.start_at).getTime() : null
          return (
            <li key={f.id}>
              <button onClick={() => setEditFeeding(f)} className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><IconBottle width={20} height={20} /></span>
                <span className="flex-1">
                  <span className="block font-semibold">{feedingTitle(f)}{f.kind === 'breast' && !f.end_at && ' · зараз'}</span>
                  <span className="block text-sm text-muted">{formatTime(f.start_at)}</span>
                </span>
                {dur !== null && <span className="text-sm font-semibold tabular-nums">{formatDuration(dur)}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      <SleepEditSheet open={!!editSleep} onClose={() => setEditSleep(null)} childId={child.id} sleep={editSleep} />
      <FeedingEditSheet feeding={editFeeding} onClose={() => setEditFeeding(null)} />
    </>
  )
}
