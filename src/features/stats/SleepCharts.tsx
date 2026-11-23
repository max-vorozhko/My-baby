import { useState } from 'react'
import { dayTimeline, daySummary, fmtClockMin, MIN_SAMPLES, type SleepLike, type SleepPatterns, type Spread } from '@/lib/sleep'
import { DAY_MS, formatDayLabel, formatDuration, formatTime, HOUR, MIN, shortDayLabel, startOfDay } from '@/lib/time'
import { Card } from '@/ui/kit'

/**
 * Графіки сну за власними записами. Кольори — токени chart-night / chart-nap (перевірені на дальтонізм).
 * Тап по рядку чи стовпчику показує деталі під графіком — підказка для мобільного замість hover.
 */

const DAY_MIN = 24 * 60
const pct = (m: number) => `${(Math.max(0, Math.min(DAY_MIN, m)) / DAY_MIN) * 100}%`
const fillOf = (kind: 'night' | 'nap') => (kind === 'night' ? 'bg-chart-night' : 'bg-chart-nap')

function Legend() {
  return (
    <div className="flex gap-4 text-xs text-muted">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-chart-night" />Нічний сон</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-chart-nap" />Денний сон</span>
    </div>
  )
}

/** Вісь 0–24 год під смугами. */
function HourAxis({ inset = 0 }: { inset?: number }) {
  return (
    <div className="relative mt-1 h-4 text-[10px] tabular-nums text-muted" style={{ marginLeft: inset }}>
      {[0, 6, 12, 18, 24].map((h) => (
        <span key={h} className="absolute -translate-x-1/2" style={{ left: pct(h * 60) }}>{String(h).padStart(2, '0')}</span>
      ))}
    </div>
  )
}

/** Тонкі вертикальні лінії сітки на 6/12/18 год. */
function Grid() {
  return <>{[6, 12, 18].map((h) => <span key={h} aria-hidden className="absolute inset-y-0 w-px bg-line" style={{ left: pct(h * 60) }} />)}</>
}

const range = (s: Spread) => `${fmtClockMin(s.p25)}–${fmtClockMin(s.p75)}`

/** «Модель» типового дня: медіани часу пробудження, денних снів і засинання + розкид (половина днів). */
export function TypicalDay({ p }: { p: SleepPatterns }) {
  if (p.days < MIN_SAMPLES) {
    return <Card><p className="text-sm text-muted">Потрібно щонайменше {MIN_SAMPLES} повних дні записів (від ранкового пробудження до нічного сну). Зараз: {p.days}.</p></Card>
  }
  const naps = Math.round(p.napsPerDay.median)
  const napBlocks = Array.from({ length: naps }, (_, k) => p.napStart[k] && p.napDuration[k] && p.napStart[k].n >= MIN_SAMPLES
    ? { from: p.napStart[k].median, to: p.napStart[k].median + p.napDuration[k].median, k } : null).filter((x) => x !== null)
  const wake = p.wakeTime
  const bed = { ...p.bedtime, median: p.bedtime.median % DAY_MIN, p25: p.bedtime.p25 % DAY_MIN, p75: p.bedtime.p75 % DAY_MIN }
  const napTotal = napBlocks.reduce((a, b) => a + (b.to - b.from), 0)
  const total = (p.nightDuration.median || 0) + napTotal

  return (
    <Card className="space-y-3">
      <Legend />
      <div>
        <div className="relative h-9 overflow-hidden rounded-xl bg-line/50" role="img"
          aria-label={`Типовий день: прокидається ~${fmtClockMin(wake.median)}, засинає на ніч ~${fmtClockMin(bed.median)}, денних снів ${naps}`}>
          <Grid />
          <span className={`absolute inset-y-1 left-0 rounded-r-[4px] ${fillOf('night')}`} style={{ width: pct(wake.median) }} />
          {napBlocks.map((b) => (
            <span key={b.k} className={`absolute inset-y-1 rounded-[4px] ${fillOf('nap')}`} style={{ left: pct(b.from), width: `calc(${pct(b.to - b.from)} - 2px)` }} />
          ))}
          <span className={`absolute inset-y-1 right-0 rounded-l-[4px] ${fillOf('night')}`} style={{ left: pct(bed.median) }} />
          {/* розкид: у половині днів прокидається / засинає в цих межах */}
          <span aria-hidden className="absolute bottom-0 h-1 rounded-full bg-ink/40" style={{ left: pct(wake.p25), width: pct(wake.p75 - wake.p25) }} />
          <span aria-hidden className="absolute bottom-0 h-1 rounded-full bg-ink/40" style={{ left: pct(bed.p25), width: pct(Math.max(0, bed.p75 - bed.p25)) }} />
        </div>
        <HourAxis />
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div><dt className="text-xs text-muted">Прокидається</dt><dd><b className="tabular-nums">~{fmtClockMin(wake.median)}</b> <span className="text-xs text-muted">({range(wake)})</span></dd></div>
        <div><dt className="text-xs text-muted">Засинає на ніч</dt><dd><b className="tabular-nums">~{fmtClockMin(bed.median)}</b> <span className="text-xs text-muted">({range(p.bedtime)})</span></dd></div>
        <div><dt className="text-xs text-muted">Нічний сон</dt><dd><b>{formatDuration((p.nightDuration.median || 0) * MIN)}</b></dd></div>
        <div><dt className="text-xs text-muted">Денні сни</dt><dd><b>{naps}</b> · {formatDuration(napTotal * MIN)}</dd></div>
        {napBlocks.map((b) => (
          <div key={b.k}>
            <dt className="text-xs text-muted">{b.k + 1}-й денний</dt>
            <dd><b className="tabular-nums">~{fmtClockMin(b.from)}</b> · {formatDuration((b.to - b.from) * MIN)}</dd>
          </div>
        ))}
        <div><dt className="text-xs text-muted">Неспання перед ніччю</dt><dd><b>{formatDuration(p.windowBeforeNight.median * MIN)}</b></dd></div>
      </dl>
      <p className="text-xs text-muted">
        Разом ~{formatDuration(total * MIN)} на добу. Медіани за {p.days} повних днів; у дужках — межі, в які вкладається половина днів. Лише ваші записи, не норма.
      </p>
    </Card>
  )
}

/** Кожен день — смуга 00–24 з відрізками сну. Найновіший день зверху. */
export function DaysTimeline({ sleeps, days, now }: { sleeps: SleepLike[]; days: number; now: number }) {
  const today = startOfDay(now)
  const rows = Array.from({ length: days }, (_, i) => today - i * DAY_MS).map((ds) => ({ ds, segs: dayTimeline(sleeps, ds, now) }))
  const [sel, setSel] = useState<number | null>(null)
  const selected = rows.find((r) => r.ds === sel)
  const thin = days > 14
  const LABEL = 44

  return (
    <Card className="space-y-3">
      <Legend />
      <div>
        <ul className={thin ? 'space-y-1' : 'space-y-1.5'}>
          {rows.map((r) => (
            <li key={r.ds}>
              <button onClick={() => setSel(sel === r.ds ? null : r.ds)} aria-pressed={sel === r.ds}
                aria-label={`${formatDayLabel(r.ds, now)}: ${r.segs.length ? `сон ${formatDuration(r.segs.reduce((a, s) => a + (s.to - s.from), 0) * MIN)}` : 'немає записів'}`}
                className={`flex w-full items-center rounded-lg ${sel === r.ds ? 'bg-accent-soft' : ''}`}>
                <span className="shrink-0 pr-1 text-left text-[11px] tabular-nums text-muted" style={{ width: LABEL }}>
                  {shortDayLabel(r.ds, now)} {new Date(r.ds).getDate()}
                </span>
                <span className={`relative block flex-1 overflow-hidden rounded-md bg-line/40 ${thin ? 'h-2.5' : 'h-4'}`}>
                  <Grid />
                  {r.segs.map((s, i) => (
                    <span key={i} className={`absolute inset-y-0 rounded-[3px] ${fillOf(s.kind)}`}
                      style={{ left: pct(s.from), width: `max(2px, calc(${pct(s.to - s.from)} - 2px))` }} />
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <HourAxis inset={LABEL} />
      </div>
      <p className="min-h-10 text-sm" aria-live="polite">
        {selected ? (
          selected.segs.length ? (
            <>
              <b>{formatDayLabel(selected.ds, now)}:</b>{' '}
              {selected.segs.map((s) => `${s.kind === 'night' ? 'ніч' : 'день'} ${formatTime(s.startAt)}–${s.endAt ? formatTime(s.endAt) : 'триває'}`).join(', ')}
            </>
          ) : <><b>{formatDayLabel(selected.ds, now)}:</b> записів сну немає</>
        ) : <span className="text-muted">Торкніться дня, щоб побачити час.</span>}
      </p>
    </Card>
  )
}

/** Сон за добу: стовпчики «ніч + день», пунктир — медіана за період. */
export function DailyTotals({ sleeps, days, now }: { sleeps: SleepLike[]; days: number; now: number }) {
  const today = startOfDay(now)
  const cols = Array.from({ length: days }, (_, i) => today - (days - 1 - i) * DAY_MS).map((ds) => ({ ds, ...daySummary(sleeps, ds, now) }))
  const withData = cols.filter((c) => c.totalMs > 0 && c.ds < today)
  const sorted = withData.map((c) => c.totalMs).sort((a, b) => a - b)
  const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] / 2 + sorted[Math.ceil((sorted.length - 1) / 2)] / 2 : null
  const maxH = Math.max(12, Math.ceil(Math.max(...cols.map((c) => c.totalMs), 0) / HOUR / 2) * 2)
  const [sel, setSel] = useState<number | null>(null)
  const selected = cols.find((c) => c.ds === sel)
  const H = 140
  const y = (ms: number) => (ms / HOUR / maxH) * H
  const ticks = [0, maxH / 2, maxH]

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legend />
        {median !== null && (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span aria-hidden className="w-4 border-t-2 border-dashed border-ink/60" />медіана <b className="text-ink">{formatDuration(median)}</b>
          </span>
        )}
      </div>
      <div className="flex gap-1.5">
        <div className="relative w-7 shrink-0 text-right text-[10px] tabular-nums text-muted" style={{ height: H }}>
          {ticks.map((h) => <span key={h} className="absolute right-0 -translate-y-1/2" style={{ bottom: y(h * HOUR) - 6 }}>{h} г</span>)}
        </div>
        <div className="relative flex-1" style={{ height: H }}>
          {ticks.slice(1).map((h) => <span key={h} aria-hidden className="absolute inset-x-0 h-px bg-line" style={{ bottom: y(h * HOUR) }} />)}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-muted/40" />
          {median !== null && (
            <span aria-hidden className="absolute inset-x-0 z-10 border-t-2 border-dashed border-ink/60" style={{ bottom: y(median) }} />
          )}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {cols.map((c) => (
              <button key={c.ds} onClick={() => setSel(sel === c.ds ? null : c.ds)} aria-pressed={sel === c.ds}
                aria-label={`${formatDayLabel(c.ds, now)}: ${c.totalMs ? formatDuration(c.totalMs) : 'немає записів'}`}
                className={`flex h-full min-w-0 flex-1 flex-col justify-end rounded-t-[4px] ${sel === c.ds ? 'bg-accent-soft' : ''}`}>
                {c.dayMs > 0 && <span className={`mx-auto block w-full max-w-6 rounded-t-[4px] ${fillOf('nap')}`} style={{ height: y(c.dayMs) }} />}
                {c.dayMs > 0 && c.nightMs > 0 && <span className="block h-[2px]" />}
                {c.nightMs > 0 && <span className={`mx-auto block w-full max-w-6 ${c.dayMs > 0 ? '' : 'rounded-t-[4px]'} ${fillOf('night')}`} style={{ height: y(c.nightMs) }} />}
              </button>
            ))}
          </div>
        </div>
      </div>
      {days <= 14 && (
        <div className="ml-[34px] flex gap-[2px] text-center text-[10px] text-muted">
          {cols.map((c) => <span key={c.ds} className="min-w-0 flex-1">{shortDayLabel(c.ds, now)}</span>)}
        </div>
      )}
      <p className="min-h-10 text-sm" aria-live="polite">
        {selected ? (
          selected.totalMs ? (
            <><b>{formatDayLabel(selected.ds, now)}:</b> {formatDuration(selected.totalMs)} (ніч {formatDuration(selected.nightMs)}, день {formatDuration(selected.dayMs)}{selected.naps ? `, снів удень: ${selected.naps}` : ''})</>
          ) : <><b>{formatDayLabel(selected.ds, now)}:</b> записів сну немає</>
        ) : <span className="text-muted">Торкніться стовпчика, щоб побачити цифри. Сьогоднішній день ще не завершено.</span>}
      </p>
    </Card>
  )
}
