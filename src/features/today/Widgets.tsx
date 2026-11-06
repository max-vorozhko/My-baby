import type { ReactNode } from 'react'
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

type Tone = 'feed' | 'food' | 'skin' | 'plain'
const TONE: Record<Tone, string> = {
  feed: 'bg-feed-soft text-feed-ink', food: 'bg-food-soft text-food-ink', skin: 'bg-skin-soft text-skin-ink', plain: 'bg-surface text-ink shadow-soft',
}

function Widget({ tone, title, value, unit, sub, onClick, children, wide }: {
  tone: Tone; title: string; value: ReactNode; unit?: string; sub: string; onClick: () => void; children?: ReactNode; wide?: boolean
}) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`flex cursor-pointer flex-col rounded-3xl p-4 text-left active:scale-[0.98] ${wide ? 'col-span-2' : 'min-h-32'} ${TONE[tone]}`}>
      <span className="text-sm font-bold">{title}</span>
      <span className="mt-2 text-[28px] font-extrabold leading-none tabular-nums">{value}{unit && <span className="ml-1 text-base font-bold">{unit}</span>}</span>
      <span className="mt-1.5 text-xs font-semibold opacity-75">{sub}</span>
      {children && <span className="mt-auto pt-2">{children}</span>}
    </div>
  )
}

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
  const feedsToday = feedings.filter((f) => new Date(f.start_at).getTime() >= today).length
  const [fv, fu] = lastFeed ? agoParts(now - new Date(lastFeed.start_at).getTime()) : ['—', '']
  const feedSub = lastFeed
    ? [lastFeed.kind === 'breast' && lastFeed.side ? sideShort[lastFeed.side] : lastFeed.amount_ml ? `${lastFeed.amount_ml} мл` : '',
       lastFeed.kind === 'breast' && lastFeed.end_at ? formatDuration(new Date(lastFeed.end_at).getTime() - new Date(lastFeed.start_at).getTime()) : '',
       `${feedsToday} за сьогодні`].filter(Boolean).join(' · ')
    : 'Ще не записували'

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
      <Widget tone="food" title="Прикорм" value={top ? top.count : 0} unit="×" onClick={onMeal}
        sub={top ? `${foodName(top.foodId).toLowerCase()} за тиждень` : 'Записати прийом їжі'}>
        <span className="flex h-7 items-end gap-1" aria-hidden>
          {perDay.map((n, i) => <i key={i} className="flex-1 rounded-sm bg-food-ink/70" style={{ height: `${Math.max(8, (n / maxDay) * 100)}%`, opacity: n ? 0.8 : 0.2 }} />)}
        </span>
      </Widget>
      {child.skin_module ? (
        <Widget tone="skin" title="Шкіра" value={creams} unit={creams === 1 ? 'крем' : 'крему'} onClick={onSkin}
          sub={checks[0] ? `Свербіж: ${ITCH_LONG[checks[0].itch]}` : 'Огляду сьогодні немає'}>
          <button onClick={(e) => { e.stopPropagation(); void addSkinCare(child.id, 'emollient') }}
            className="min-h-9 rounded-full bg-skin-ink/10 px-3 text-sm font-bold">+ крем</button>
        </Widget>
      ) : null}
      <Widget tone="plain" wide={!child.skin_module} title="Реакція" value={<span className="text-[22px]">Записати</span>} onClick={onReaction}
        sub={lastReaction ? `остання ${agoParts(now - new Date(lastReaction.at).getTime()).join(' ')}` : 'Поки не було'} />
    </div>
  )
}
