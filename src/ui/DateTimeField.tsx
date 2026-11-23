import { toLocalInput } from '@/lib/time'

const p = (n: number) => String(n).padStart(2, '0')
const isoDay = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00`).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })

/**
 * Поле «дата + час», де головне — час: великий годинник, а день — дрібні кнопки «Сьогодні / Вчора / інша дата».
 * value — локальний рядок `YYYY-MM-DDTHH:mm` (як у <input type="datetime-local">); '' — не вказано.
 */
export function DateTimeField({
  label, value, onChange, hint, quick = true, emptyText,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  /** Кнопки «−15 / −5 / +5 хв». */
  quick?: boolean
  /** Якщо задано — поле можна лишити порожнім; показується кнопка з цим текстом. */
  emptyText?: string
}) {
  const now = new Date()
  const today = isoDay(now)
  const yesterday = isoDay(new Date(now.getTime() - 864e5))
  const date = value.slice(0, 10)
  const time = value.slice(11, 16)

  const setDate = (d: string) => d && onChange(`${d}T${time || `${p(now.getHours())}:${p(now.getMinutes())}`}`)
  const setTime = (t: string) => t && onChange(`${date || today}T${t}`)
  const shift = (min: number) => onChange(toLocalInput(new Date(new Date(value).getTime() + min * 60_000).toISOString()))

  const chip = (active: boolean) =>
    `min-h-10 rounded-full px-3 text-sm font-semibold ${active ? 'bg-accent text-white dark:text-bg' : 'bg-line/70 text-ink'}`

  return (
    <div role="group" aria-label={label}>
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {!value && emptyText ? (
        <button type="button" onClick={() => onChange(toLocalInput(new Date().toISOString()))}
          className="flex min-h-16 w-full items-center justify-center rounded-3xl bg-surface text-base font-semibold text-accent shadow-soft">
          {emptyText}
        </button>
      ) : (
        <div className="space-y-2 rounded-3xl bg-surface p-3 shadow-soft">
          <div className="flex items-center gap-2">
            <input type="time" aria-label={`${label}: час`} value={time} onChange={(e) => setTime(e.target.value)}
              className="min-h-16 min-w-0 flex-1 rounded-2xl bg-bg px-3 text-center text-4xl font-extrabold tabular-nums outline-none focus:ring-2 focus:ring-accent" />
            {emptyText && (
              <button type="button" onClick={() => onChange('')} aria-label={`Очистити: ${label}`}
                className="h-11 rounded-full px-3 text-sm text-muted">Очистити</button>
            )}
          </div>
          {quick && value && (
            <div className="flex gap-2">
              {[-15, -5, 5].map((m) => (
                <button key={m} type="button" onClick={() => shift(m)} className="min-h-10 flex-1 rounded-full bg-line/70 text-sm font-semibold tabular-nums">
                  {m > 0 ? `+${m}` : `−${-m}`} хв
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={chip(date === today)} onClick={() => setDate(today)}>Сьогодні</button>
            <button type="button" className={chip(date === yesterday)} onClick={() => setDate(yesterday)}>Вчора</button>
            <label className={`relative ${chip(!!date && date !== today && date !== yesterday)} inline-flex items-center`}>
              {date && date !== today && date !== yesterday ? dayLabel(date) : 'Інша дата'}
              <input type="date" aria-label={`${label}: дата`} value={date} max={today} onChange={(e) => setDate(e.target.value)}
                className="absolute inset-0 opacity-0" />
            </label>
          </div>
        </div>
      )}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </div>
  )
}
