/**
 * Анонімний лічильник відвідувань GoatCounter (goatcounter.com).
 *
 * Без стороннього скрипта і без cookies: надсилаємо лише назву екрана
 * (наприклад «/sleep»), розмір екрана і реферер. Жодних імен, дат чи записів.
 * Код сайту задається при збірці: VITE_GOATCOUNTER_CODE=<code> → <code>.goatcounter.com.
 * Не працює без коду, офлайн, на localhost або якщо користувач вимкнув у налаштуваннях.
 */

const KEY = 'my-baby:analytics-off'
const CODE = (import.meta.env.VITE_GOATCOUNTER_CODE as string | undefined)?.trim()

/** Відомі екрани застосунку; усе інше рахуємо як «/інше», щоб випадково не передати дані з URL. */
const SCREENS: Record<string, string> = {
  '/': 'Сьогодні', '/food': 'Їжа', '/food/all': 'Продукти', '/sleep': 'Сон',
  '/health': "Здоров'я", '/health/skin': 'Шкіра', '/stats': 'Статистика', '/more': 'Налаштування',
}

export const analyticsAvailable = () => !!CODE

export function analyticsEnabled() {
  try { return localStorage.getItem(KEY) !== '1' } catch { return true }
}

export function setAnalyticsEnabled(on: boolean) {
  try { on ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, '1') } catch { /* ignore */ }
}

/** Шлях без базового префікса (/My-baby/) і без query/hash. */
export function screenPath(pathname: string, base = import.meta.env.BASE_URL) {
  const b = base.replace(/\/$/, '')
  let p = pathname.startsWith(b) ? pathname.slice(b.length) : pathname
  p = (p.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/'
  return p in SCREENS ? p : '/інше'
}

export function buildCountUrl(code: string, path: string, opts: { screen?: string; firstVisit?: boolean } = {}) {
  const q = new URLSearchParams({ p: path, t: SCREENS[path] ?? 'Інше' })
  if (opts.screen) q.set('s', opts.screen)
  // Реферер — лише для першого перегляду сесії і лише домен.
  if (opts.firstVisit && document.referrer) {
    try { q.set('r', new URL(document.referrer).origin) } catch { /* ignore */ }
  }
  q.set('rnd', Math.random().toString(36).slice(2, 8))
  return `https://${code}.goatcounter.com/count?${q.toString()}`
}

let last = ''
let first = true

/** Викликається при зміні екрана. */
export function trackScreen(pathname: string) {
  if (!CODE || !analyticsEnabled() || !navigator.onLine) return
  const host = location.hostname
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return
  const path = screenPath(pathname)
  if (path === last) return
  last = path
  const url = buildCountUrl(CODE, path, { screen: `${screen.width},${screen.height},${devicePixelRatio || 1}`, firstVisit: first })
  first = false
  // Піксель-запит: не блокує, без cookies, помилки ігноруємо.
  const img = new Image()
  img.referrerPolicy = 'no-referrer'
  img.src = url
}
