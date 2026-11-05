const DAY = 24 * 60 * 60 * 1000

export interface Age {
  months: number
  weeks: number
  days: number
  totalDays: number
}

function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Вік у повних місяцях + тижнях. preterm_weeks зсуває дату (коригований вік). */
export function getAge(birthDate: string, pretermWeeks = 0, now = new Date()): Age {
  const birth = parseDate(birthDate)
  birth.setDate(birth.getDate() + pretermWeeks * 7)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const totalDays = Math.max(0, Math.round((today.getTime() - birth.getTime()) / DAY))

  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())
  if (today.getDate() < birth.getDate()) months -= 1
  months = Math.max(0, months)

  const anchor = new Date(birth)
  anchor.setMonth(anchor.getMonth() + months)
  const rest = Math.max(0, Math.round((today.getTime() - anchor.getTime()) / DAY))
  return { months, weeks: Math.floor(rest / 7), days: rest % 7, totalDays }
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export const monthsWord = (n: number) => plural(n, 'місяць', 'місяці', 'місяців')
export const weeksWord = (n: number) => plural(n, 'тиждень', 'тижні', 'тижнів')
export const daysWord = (n: number) => plural(n, 'день', 'дні', 'днів')

export function formatAge(age: Age) {
  const parts: string[] = []
  if (age.months > 0) parts.push(`${age.months} ${monthsWord(age.months)}`)
  if (age.weeks > 0) parts.push(`${age.weeks} ${weeksWord(age.weeks)}`)
  if (parts.length === 0) parts.push(`${age.totalDays} ${daysWord(age.totalDays)}`)
  return parts.join(' ')
}

export function todayISODate() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
