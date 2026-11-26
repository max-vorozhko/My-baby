import type { ReactNode } from 'react'

export type Tone = 'feed' | 'food' | 'skin' | 'plain'
const TONE: Record<Tone, string> = {
  feed: 'bg-feed-soft text-feed-ink', food: 'bg-food-soft text-food-ink', skin: 'bg-skin-soft text-skin-ink', plain: 'bg-surface text-ink shadow-soft',
}

/**
 * Плитка-кнопка: велика назва («що це»), одне головне число, максимум один короткий рядок.
 * Без даних — лише назва; уся плитка — кнопка запису.
 */
export function Tile({ tone, title, value, unit, sub, onClick, children }: {
  tone: Tone; title: string; value?: ReactNode; unit?: string; sub?: string; onClick: () => void; children?: ReactNode
}) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`relative flex ${value === undefined ? 'min-h-24' : 'min-h-36'} cursor-pointer flex-col rounded-3xl p-4 text-left active:scale-[0.98] ${TONE[tone]}`}>
      <span className="text-[clamp(21px,6.4vw,27px)] font-extrabold leading-[1.1] tracking-tight">{title}</span>
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


/** Тонкий рядок для рідкісної дії: «+ Реакція». */
export function ActionRow({ title, meta, onClick, wide = true }: { title: string; meta?: string; onClick: () => void; wide?: boolean }) {
  return (
    <button onClick={onClick}
      className={`flex min-h-14 items-center gap-3 rounded-3xl bg-surface px-4 text-left shadow-soft active:scale-[0.98] ${wide ? 'col-span-2' : ''}`}>
      <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-sos/10 text-xl font-bold leading-none text-sos">+</span>
      <span className="flex-1 text-[17px] font-bold">{title}</span>
      {meta && <span className="text-[13px] text-muted">{meta}</span>}
    </button>
  )
}
