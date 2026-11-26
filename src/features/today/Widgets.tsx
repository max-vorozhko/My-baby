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

/**
 * Плитка-кнопка: велика назва («що це»), одне головне число, максимум один короткий рядок.
 * Без даних — лише назва і «+»: зрозуміло, що тап додає запис.
 */
function Widget({ tone, title, value, unit, sub, onClick, children }: {
  tone: Tone; title: string; value?: ReactNode; unit?: string; sub?: string; onClick: () => void; children?: ReactNode
}) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`relative flex ${value === undefined ? 'min-h-24' : 'min-h-36'} cursor-pointer flex-col rounded-3xl p-4 text-left active:scale-[0.98] ${TONE[tone]}`}>
      <span className="flex items-start justify-between gap-2">
        <span className="text-[21px] font-extrabold leading-tight">{title}</span>
        <span aria-hidden className="-mr-1 -mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-current/10 text-xl font-bold leading-none">+</span>
      </span>
      {value !== undefined && (
        <span className="mt-3 text-[32px] font-extrabold leading-none tabular-nums">
          {value}{unit && <span className="ml-1 text-base font-bold">{unit}</span>}
        </span>
      )}
      {sub && <span className="mt-1.5 truncate text-[13px] font-semibold opacity-70">{sub}</span>}
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
      <button onClick={onReaction}
        className={`flex min-h-14 items-center gap-3 rounded-3xl bg-surface px-4 text-left shadow-soft active:scale-[0.98] ${child.skin_module ? '' : 'col-span-2'}`}>
        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-sos/10 text-xl font-bold leading-none text-sos">+</span>
        <span className="flex-1 text-[17px] font-bold">Реакція</span>
        {lastReaction && <span className="text-[13px] text-muted">{agoParts(now - new Date(lastReaction.at).getTime()).join(' ')}</span>}
      </button>
    </div>
  )
}
