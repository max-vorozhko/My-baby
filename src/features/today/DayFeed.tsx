import { useEffect, useState } from 'react'
import type { Child, Feeding, Meal, Reaction, Sleep } from '@/db/types'
import { useFeedingsSince, useMealsSince, useReactionsSince, useSleepsSince } from '@/db/hooks'
import { FOOD_BY_ID } from '@/data/foods'
import { deleteMeal, deleteReaction } from '@/db/actions'
import { REACTION_LABEL } from '@/features/food/ReactionSheet'
import { Sheet } from '@/ui/Sheet'
import { Button } from '@/ui/kit'
import { DAY_MS, formatDuration, formatTime, useNow } from '@/lib/time'
import { IconBottle, IconFood, IconSleep } from '@/ui/icons'
import { Card } from '@/ui/kit'
import { SleepEditSheet } from '@/features/sleep/SleepEditSheet'
import { FeedingEditSheet } from '@/features/feeding/FeedingEditSheet'
import { feedingTitle } from '@/features/feeding/labels'

type Item = { t: string; sleep?: Sleep; feeding?: Feeding; meal?: Meal; reaction?: Reaction }

const mealTitle = (m: Meal) => m.items.map((i) => FOOD_BY_ID.get(i.food_id)?.name_uk ?? '?').join(', ')

/** Стрічка подій доби; тап по запису — редагування. */
export function DayFeed({ child, dayStart, show = 'all', empty }: {
  child: Child; dayStart: number; show?: 'all' | 'sleep' | 'feeding' | 'food'; empty?: string
}) {
  const now = useNow(30_000)
  const dayEnd = dayStart + DAY_MS
  const sleeps = useSleepsSince(child.id, dayStart)
  const feedings = useFeedingsSince(child.id, dayStart)
  const [editSleep, setEditSleep] = useState<Sleep | null>(null)
  const [editFeeding, setEditFeeding] = useState<Feeding | null>(null)
  const meals = useMealsSince(child.id, dayStart)
  const reactions = useReactionsSince(child.id, dayStart)
  const [view, setView] = useState<{ meal?: Meal; reaction?: Reaction } | null>(null)

  const items: Item[] = []
  if (show !== 'feeding') {
    for (const s of sleeps) {
      const end = s.end_at ? new Date(s.end_at).getTime() : now
      if (end > dayStart && new Date(s.start_at).getTime() < dayEnd) items.push({ t: s.start_at, sleep: s })
    }
  }
  const inDay = (iso: string) => new Date(iso).getTime() < dayEnd
  if (show === 'all' || show === 'feeding') {
    for (const f of feedings) if (inDay(f.start_at)) items.push({ t: f.start_at, feeding: f })
  }
  if (show === 'all' || show === 'food') {
    for (const m of meals) if (inDay(m.at)) items.push({ t: m.at, meal: m })
    for (const r of reactions) if (inDay(r.at)) items.push({ t: r.at, reaction: r })
  }
  items.sort((a, b) => b.t.localeCompare(a.t))

  if (items.length === 0) {
    return <Card className="text-center text-muted">{empty ?? 'Поки порожньо. Натисніть «Заснув» або «Груди / пляшечка».'}</Card>
  }

  return (
    <>
      <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
        {items.map(({ sleep, feeding, meal, reaction }) => {
          if (meal) {
            return (
              <li key={meal.id}>
                <button onClick={() => setView({ meal })} className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-food-soft text-food"><IconFood width={20} height={20} /></span>
                  <span className="flex-1">
                    <span className="block font-semibold">{mealTitle(meal)}</span>
                    <span className="block text-sm text-muted">{formatTime(meal.at)}{meal.note && ` · ${meal.note}`}</span>
                  </span>
                </button>
              </li>
            )
          }
          if (reaction) {
            const fd = reaction.food_id ? FOOD_BY_ID.get(reaction.food_id) : null
            return (
              <li key={reaction.id}>
                <button onClick={() => setView({ reaction })} className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sos/15 font-bold text-sos">!</span>
                  <span className="flex-1">
                    <span className="block font-semibold">Реакція: {REACTION_LABEL[reaction.type].toLowerCase()}</span>
                    <span className="block text-sm text-muted">{formatTime(reaction.at)}{fd && ` · ${fd.name_uk}`}</span>
                  </span>
                </button>
              </li>
            )
          }
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
      <RecordView view={view} onClose={() => setView(null)} />
    </>
  )
}

const SEVERITY = ['', 'легко', 'помірно', 'сильно']

function RecordView({ view, onClose }: { view: { meal?: Meal; reaction?: Reaction } | null; onClose: () => void }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const r = view?.reaction
  const m = view?.meal
  useEffect(() => {
    if (!r?.photo) return
    const url = URL.createObjectURL(r.photo)
    setPhotoUrl(url)
    return () => { URL.revokeObjectURL(url); setPhotoUrl(null) }
  }, [r])
  if (!view) return null
  const close = onClose
  const remove = async () => {
    if (!confirm('Видалити запис?')) return
    if (m) await deleteMeal(m.id)
    if (r) await deleteReaction(r.id)
    close()
  }
  return (
    <Sheet open onClose={close} title={m ? `Прийом їжі · ${formatTime(m.at)}` : `Реакція · ${formatTime(r!.at)}`}>
      <div className="space-y-3">
        {m && (
          <ul className="space-y-1">
            {m.items.map((it) => {
              const f = FOOD_BY_ID.get(it.food_id)
              return (
                <li key={it.food_id} className="flex justify-between rounded-2xl border border-line bg-surface px-4 py-3">
                  <span>{f?.emoji} {f?.name_uk}</span>
                  <span className="text-muted">{it.amount ? `${it.amount} лож.` : ''} {it.liked === true ? '👍' : it.liked === false ? '👎' : ''}</span>
                </li>
              )
            })}
          </ul>
        )}
        {r && (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="font-semibold">{REACTION_LABEL[r.type]} · {SEVERITY[r.severity]}</p>
            {r.food_id && <p className="text-sm text-muted">Після: {FOOD_BY_ID.get(r.food_id)?.name_uk}</p>}
            {r.note && <p className="mt-2 text-sm">{r.note}</p>}
            {photoUrl && <img src={photoUrl} alt="Фото реакції" className="mt-3 max-h-64 rounded-xl" />}
          </div>
        )}
        <Button variant="ghost" className="w-full text-sos" onClick={remove}>Видалити</Button>
      </div>
    </Sheet>
  )
}
