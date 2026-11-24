/**
 * Анонімний «пульс» використання: раз на добу пристрій надсилає випадковий ID
 * (згенерований на телефоні) і чи встановлено застосунок на головний екран.
 * Без імен, записів і даних про дитину. Вимикається тим самим перемикачем,
 * що й статистика відвідувань (lib/analytics).
 */
import { analyticsEnabled } from './analytics'
import { uuid } from '@/db'
import { isSignedIn } from './account'

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
const ID_KEY = 'my-baby:device-id'
const DAY_KEY = 'my-baby:ping-day'

/** Встановлено на головний екран (без імпорту lib/storage, що чіпає window при завантаженні). */
function installed() {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export const usageAvailable = () => Boolean(URL_ && KEY)

export function localDay(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function deviceId(): string | null {
  try {
    let id = localStorage.getItem(ID_KEY)
    if (!id) { id = uuid(); localStorage.setItem(ID_KEY, id) }
    return id
  } catch { return null }
}

/** Мітка останнього пінгу: день + чи був вхід (щоб у день входу пінг повторився вже з позначкою). */
export const pingMark = (day: string, signedIn: boolean) => (signedIn ? `${day}|g` : day)

/** Чи треба слати пінг зараз: раз на локальну добу або коли за цю добу людина увійшла через Google. */
export function shouldPing(last: string | null, today = localDay(), signedIn = false) {
  if (last === pingMark(today, true)) return false // сьогодні вже позначено і пристрій, і вхід
  return last !== pingMark(today, signedIn)
}

export async function pingUsage() {
  if (!URL_ || !KEY || !analyticsEnabled() || !navigator.onLine) return
  const host = location.hostname
  if (host === 'localhost' || host === '127.0.0.1') return
  let last: string | null = null
  try { last = localStorage.getItem(DAY_KEY) } catch { /* ignore */ }
  const today = localDay()
  const signedIn = isSignedIn()
  if (!shouldPing(last, today, signedIn)) return
  const id = deviceId()
  if (!id) return
  try {
    const res = await fetch(`${URL_}/rest/v1/rpc/ping`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_device: id, p_installed: installed(), p_signed_in: signedIn }),
      keepalive: true,
    })
    if (res.ok) localStorage.setItem(DAY_KEY, pingMark(today, signedIn))
  } catch { /* офлайн або сервер недоступний — спробуємо при наступному відкритті */ }
}
