import { useEffect, useState } from 'react'

export const MIN = 60_000
export const HOUR = 60 * MIN

/** Поточний час, що оновлюється (для таймерів). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    const vis = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis) }
  }, [intervalMs])
  return now
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / MIN))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} хв`
  return m === 0 ? `${h} год` : `${h} год ${m} хв`
}

/** Секундомір для активних таймерів: 12:05 або 1:02:05. */
export function formatClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`
}

export function formatTime(iso: string | number | Date) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function startOfDay(t: number | Date = Date.now()) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export const DAY_MS = 24 * HOUR

/** ISO (UTC) → значення для <input type="datetime-local"> у локальному часі. */
export function toLocalInput(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function fromLocalInput(v: string) {
  return new Date(v).toISOString()
}

const WEEKDAYS = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
export function formatDayLabel(dayStart: number, now = Date.now()) {
  const today = startOfDay(now)
  if (dayStart === today) return 'Сьогодні'
  if (dayStart === today - DAY_MS) return 'Вчора'
  const d = new Date(dayStart)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Коротка мітка для графіка: «пн», «вт»…, сьогодні — «сьог». */
export function shortDayLabel(dayStart: number, now = Date.now()) {
  if (dayStart === startOfDay(now)) return 'сьог'
  return WEEKDAYS[new Date(dayStart).getDay()]
}

/** «щойно» / «25 хв тому» / «2 год 10 хв тому». */
export function formatAgo(ms: number) {
  return ms < MIN ? 'щойно' : `${formatDuration(ms)} тому`
}
