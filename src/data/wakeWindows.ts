/**
 * Вікна неспання за віком (ТЗ 3.3, сутність wake_window).
 * ЧЕРНЕТКА: загальновідомі орієнтовні діапазони, потребують перевірки педіатром.
 * Хвилини.
 */
export interface WakeWindow {
  age_from_m: number
  age_to_m: number // не включно
  min_min: number
  max_min: number
  naps_per_day: number
}

export const WAKE_WINDOWS: WakeWindow[] = [
  { age_from_m: 0, age_to_m: 4, min_min: 75, max_min: 120, naps_per_day: 4 },
  { age_from_m: 4, age_to_m: 6, min_min: 105, max_min: 150, naps_per_day: 3 },
  { age_from_m: 6, age_to_m: 8, min_min: 120, max_min: 180, naps_per_day: 3 },
  { age_from_m: 8, age_to_m: 10, min_min: 150, max_min: 210, naps_per_day: 2 },
  { age_from_m: 10, age_to_m: 13, min_min: 180, max_min: 240, naps_per_day: 2 },
  { age_from_m: 13, age_to_m: 19, min_min: 210, max_min: 300, naps_per_day: 1 },
  { age_from_m: 19, age_to_m: 99, min_min: 300, max_min: 360, naps_per_day: 1 },
]

export function wakeWindowFor(ageMonths: number): WakeWindow {
  return WAKE_WINDOWS.find((w) => ageMonths >= w.age_from_m && ageMonths < w.age_to_m) ?? WAKE_WINDOWS[WAKE_WINDOWS.length - 1]
}
