import { useEffect, useState } from 'react'

/** Просимо браузер не стирати IndexedDB (важливо для Safari до встановлення PWA). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function isIOS() {
  const ua = navigator.userAgent
  // iPadOS 13+ представляється як Mac, але має сенсорний екран.
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

export function isAndroid() {
  return /android/i.test(navigator.userAgent)
}

/** iOS, але не Safari (Chrome, Firefox тощо): кнопка «Поділитися» там в адресному рядку. */
export function isIOSOtherBrowser() {
  return isIOS() && /crios|fxios|edgios|opios/i.test(navigator.userAgent)
}

const INSTALLED_KEY = 'my-baby:installed'
window.addEventListener('appinstalled', () => {
  try { localStorage.setItem(INSTALLED_KEY, '1') } catch { /* ignore */ }
  deferred = null
  listeners.forEach((l) => l())
})

/** Уже встановлено (відкрито з іконки) або щойно встановили з цього браузера. */
export function isInstalled() {
  if (isStandalone()) return true
  try { return localStorage.getItem(INSTALLED_KEY) === '1' } catch { return false }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as BeforeInstallPromptEvent
  listeners.forEach((l) => l())
})

/** Android/Chrome: системний діалог встановлення. На iOS — лише інструкція. */
export function useInstallPrompt() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  return {
    canPrompt: deferred !== null,
    /** Показує системне вікно; повертає true, якщо користувач погодився. */
    prompt: async (): Promise<boolean> => {
      if (!deferred) return false
      const ev = deferred
      await ev.prompt()
      const { outcome } = await ev.userChoice.catch(() => ({ outcome: 'dismissed' as const }))
      deferred = null
      force((n) => n + 1)
      return outcome === 'accepted'
    },
  }
}
