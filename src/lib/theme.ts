import { useEffect, useState } from 'react'

export type ThemePref = 'auto' | 'light' | 'dark'
const KEY = 'my-baby:theme'

/** Нічний час за ТЗ: 21:00–7:00. */
export function isNightHour(d = new Date()) {
  const h = d.getHours()
  return h >= 21 || h < 7
}

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'auto') return v
  } catch { /* приватний режим */ }
  return 'auto'
}

function apply(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#17141f' : '#fdf8f3')
}

export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(readPref)
  const [night, setNight] = useState(isNightHour)

  useEffect(() => {
    const t = setInterval(() => setNight(isNightHour()), 60_000)
    return () => clearInterval(t)
  }, [])

  const dark = pref === 'dark' || (pref === 'auto' && night)
  useEffect(() => apply(dark), [dark])

  const setPref = (p: ThemePref) => {
    setPrefState(p)
    try { localStorage.setItem(KEY, p) } catch { /* ignore */ }
  }
  return { pref, setPref, dark }
}
