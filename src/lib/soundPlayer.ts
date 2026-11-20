import { useSyncExternalStore } from 'react'
import { fadeFactor, soundBlob, type SoundKind } from './noise'

/**
 * Єдиний програвач засинання. Живе поза React, щоб звук не переривався при переході між екранами.
 * Грає через звичайний <audio loop> + Media Session — так звук іде при заблокованому екрані.
 */

export type Source =
  | { id: string; title: string; kind: 'generated'; sound: SoundKind }
  | { id: string; title: string; kind: 'blob'; blob: Blob }

export interface PlayerState {
  source: Source | null
  playing: boolean
  volume: number // 0..1
  /** Обраний таймер у хвилинах; null — грати без обмеження. */
  timerMin: number | null
  /** Коли вимкнути (мс від епохи); відлік іде лише поки звук грає. */
  endsAt: number | null
  error: string | null
}

export const FADE_MS = 30_000
export const TIMER_OPTIONS = [15, 30, 60] as const
const VOLUME_KEY = 'my-baby:sound-volume'
const DEFAULT_VOLUME = 0.35
const DEFAULT_TIMER_MIN = 30

function loadVolume(): number {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '')
    if (v >= 0.05 && v <= 1) return v
  } catch { /* приватний режим */ }
  return DEFAULT_VOLUME
}

let state: PlayerState = { source: null, playing: false, volume: loadVolume(), timerMin: DEFAULT_TIMER_MIN, endsAt: null, error: null }
const listeners = new Set<() => void>()
const set = (patch: Partial<PlayerState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

let audio: HTMLAudioElement | null = null
let url: string | null = null
let tick: ReturnType<typeof setInterval> | null = null
const generated = new Map<SoundKind, Blob>()
let volumeSettable: boolean | null = null

function el(): HTMLAudioElement {
  if (audio) return audio
  audio = new Audio()
  audio.loop = true
  audio.preload = 'auto'
  // Синхронізуємо стан із системою: пауза з навушників, екрана блокування тощо.
  // Перевіряємо реальний стан елемента: зміна src під час гри не має зупиняти плеєр.
  audio.addEventListener('pause', () => { if (state.playing && audio?.paused) halt() })
  return audio
}

/** iOS Safari ігнорує audio.volume (завжди 1) — тоді слайдер і плавне затухання недоступні. */
export function canSetVolume(): boolean {
  if (volumeSettable !== null) return volumeSettable
  const a = el()
  const prev = a.volume
  a.volume = 0.5
  volumeSettable = Math.abs(a.volume - 0.5) < 0.01
  a.volume = prev
  return volumeSettable
}

function applyVolume(factor = 1) {
  if (canSetVolume()) el().volume = Math.max(0, Math.min(1, state.volume * factor))
}

function startTick() {
  if (tick) return
  tick = setInterval(() => {
    if (state.endsAt === null) return
    const remaining = state.endsAt - Date.now()
    if (remaining <= 0) { stop(); return }
    if (canSetVolume()) applyVolume(fadeFactor(remaining, FADE_MS))
    else set({}) // лише щоб оновити лічильник у UI
  }, 1000)
}

function stopTick() {
  if (tick) { clearInterval(tick); tick = null }
}

function setupMediaSession(title: string) {
  if (!('mediaSession' in navigator)) return
  navigator.mediaSession.metadata = new MediaMetadata({ title, artist: 'My Baby', album: 'Засинання' })
  navigator.mediaSession.setActionHandler('play', () => { void resume() })
  navigator.mediaSession.setActionHandler('pause', () => pause())
  navigator.mediaSession.setActionHandler('stop', () => stop())
}

function sourceBlob(src: Source): Blob {
  if (src.kind === 'blob') return src.blob
  let b = generated.get(src.sound)
  if (!b) { b = soundBlob(src.sound); generated.set(src.sound, b) }
  return b
}

/** Зупиняє відлік і мітить стан як «не грає», не чіпаючи вибраний звук. */
function halt() {
  stopTick()
  set({ playing: false, endsAt: null })
}

export async function play(src: Source) {
  const a = el()
  if (state.source?.id !== src.id || !url) {
    if (url) URL.revokeObjectURL(url)
    url = URL.createObjectURL(sourceBlob(src))
    a.src = url
  }
  const wasPlaying = state.playing
  set({ source: src, error: null })
  applyVolume()
  setupMediaSession(src.title)
  try {
    await a.play()
    // Перемикання звуку під час гри не скидає таймер; новий запуск — рахує його заново.
    const endsAt = wasPlaying && state.endsAt !== null
      ? state.endsAt
      : state.timerMin === null ? null : Date.now() + state.timerMin * 60_000
    set({ playing: true, endsAt })
    applyVolume(endsAt === null ? 1 : fadeFactor(endsAt - Date.now(), FADE_MS))
    startTick()
  } catch (e) {
    halt()
    // NotAllowedError — браузер не дав грати без дотику; інше (NotSupportedError тощо) — файл не декодується.
    const notAllowed = e instanceof DOMException && e.name === 'NotAllowedError'
    set({
      error: src.kind === 'blob' && !notAllowed
        ? `Не вдалося відтворити «${src.title}» на цьому телефоні. Спробуйте записати її ще раз у застосунку.`
        : 'Не вдалося увімкнути звук. Спробуйте ще раз.',
    })
  }
}

export async function resume() {
  if (state.source) await play(state.source)
}

export function pause() {
  audio?.pause()
  halt()
}

export function stop() {
  audio?.pause()
  if (audio) audio.currentTime = 0
  halt()
  applyVolume()
}

/** Обирає таймер; якщо звук грає — відлік починається заново від зараз. minutes = null — без таймера. */
export function setTimer(minutes: number | null) {
  set({ timerMin: minutes, endsAt: state.playing && minutes !== null ? Date.now() + minutes * 60_000 : null })
  applyVolume()
}

export function setVolume(v: number) {
  const volume = Math.max(0.05, Math.min(1, v))
  try { localStorage.setItem(VOLUME_KEY, String(volume)) } catch { /* не критично */ }
  set({ volume })
  const remaining = state.endsAt === null ? Infinity : state.endsAt - Date.now()
  applyVolume(fadeFactor(remaining, FADE_MS))
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const usePlayer = () => useSyncExternalStore(subscribe, () => state)
