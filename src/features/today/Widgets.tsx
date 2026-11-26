import { ActionRow, Tile as Widget } from '@/ui/Tile'
import type { Child } from '@/db/types'
import { useFeedingsSince, useMealsSince, useReactionsSince, useSkinCareSince, useSkinChecksSince } from '@/db/hooks'
import { addSkinCare } from '@/db/actions'
import { foodName } from '@/data/foods'
import { ITCH_LONG } from '@/data/skin'
import { topFoods } from '@/lib/food'
import { isoDate } from '@/lib/skin'
import { DAY_MS, formatDuration, startOfDay } from '@/lib/time'
import { daysWord } from '@/lib/age'
import { sideShort } from '@/features/feeding/labels'

/** «Ago» у вигляді числа + одиниці для віджета. */
function agoParts(ms: number): [string, string] {
  const m = Math.max(0, Math.round(ms / 60_000))
  if (m < 1) return ['щойно', '']
  if (m < 60) return [String(m), 'хв тому']
  const h = Math.floor(m / 60)
  if (h < 24) return [String(h), 'год тому']
  const d = Math.floor(h / 24)
  return [String(d), `${daysWord(d)} тому`]
}

export function Widgets({ child, now, onFeeding, onMeal, onReaction, onSkin }: {
  child: Child; now: number; onFeeding: () => void; onMeal: () => void; onReaction: () => void; onSkin: () => void
}) {
  const today = startOfDay(now)
  const weekFrom = today - 6 * DAY_MS
  const feedings = useFeedingsSince(child.id, today - DAY_MS)
  const meals = useMealsSince(child.id, weekFrom)
  const reactions = useReactionsSince(child.id, today - 30 * DAY_MS)
  const care = useSkinCareSince(child.id, today)
  const checks = useSkinChecksSince(child.id, isoDate(today))

  const lastFeed = [...feedings].sort((a, b) => b.start_at.localeCompare(a.start_at))[0]
  const [fv, fu] = lastFeed ? agoParts(now - new Date(lastFeed.start_at).getTime()) : [undefined, undefined]
  // Один рядок: яка сторона / скільки мл і як довго. Кількість за день — у стрічці нижче.
  const feedSub = lastFeed
    ? [lastFeed.kind === 'breast' && lastFeed.side ? sideShort[lastFeed.side] : lastFeed.amount_ml ? `${lastFeed.amount_ml} мл` : '',
       lastFeed.kind === 'breast' && lastFeed.end_at ? formatDuration(new Date(lastFeed.end_at).getTime() - new Date(lastFeed.start_at).getTime()) : '',
      ].filter(Boolean).join(' · ') || undefined
    : undefined

  const top = topFoods(meals, weekFrom)[0]
  const perDay = Array.from({ length: 7 }, (_, i) => {
    const ds = weekFrom + i * DAY_MS
    return meals.filter((m) => { const t = new Date(m.at).getTime(); return t >= ds && t < ds + DAY_MS }).length
  })
  const maxDay = Math.max(1, ...perDay)

  const creams = care.filter((c) => c.kind === 'emollient').length
  const lastReaction = [...reactions].sort((a, b) => b.at.localeCompare(a.at))[0]

  return (
    <div className="grid grid-cols-2 gap-3">
      <Widget tone="feed" title="Годування" value={fv} unit={fu} sub={feedSub} onClick={onFeeding} />
      <Widget tone="food" title="Прикорм" value={top ? top.count : undefined} unit="×" onClick={onMeal}
        sub={top ? `${foodName(top.foodId).toLowerCase()} за тиждень` : undefined}>
        {top && (
          <span className="flex h-6 items-end gap-1" aria-hidden>
            {perDay.map((n, i) => <i key={i} className="flex-1 rounded-sm bg-food-ink" style={{ height: n ? `${Math.max(25, (n / maxDay) * 100)}%` : '3px', opacity: n ? 0.55 : 0.15 }} />)}
          </span>
        )}
      </Widget>
      {child.skin_module ? (
        <Widget tone="skin" title="Шкіра" value={creams || undefined} unit={creams === 1 ? 'крем' : 'крему'} onClick={onSkin}
          sub={checks[0] ? `Свербіж: ${ITCH_LONG[checks[0].itch]}` : undefined}>
          <button onClick={(e) => { e.stopPropagation(); void addSkinCare(child.id, 'emollient') }}
            className="min-h-10 rounded-full bg-skin-ink/10 px-4 text-base font-bold">+ крем</button>
        </Widget>
      ) : null}
      {/* Реакцію записують рідко — тонкий рядок замість великої плитки. */}
      <ActionRow title="Реакція" onClick={onReaction} wide={!child.skin_module}
        meta={lastReaction ? agoParts(now - new Date(lastReaction.at).getTime()).join(' ') : undefined} />
    </div>
  )
}
