import { useSyncExternalStore } from 'react'
import { encodeWav, fadeFactor, renderSound, SAMPLE_RATE, type SoundKind } from './noise'

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
const generated = new Map<SoundKind, Float32Array>()
/** Декодовані власні колискові (лише для iPhone, де гучність «запікаємо» в сам файл). */
const decoded = new Map<string, Float32Array | null>()
let volumeSettable: boolean | null = null
let loadedId: string | null = null

function el(): HTMLAudioElement {
  if (audio) return audio
  audio = new Audio()
  audio.loop = true
  audio.preload = 'auto'
  // Синхронізуємо стан із системою: пауза з навушників, екрана блокування тощо.
  // Перевіряємо реальний стан елемента: зміна src під час гри не має зупиняти плеєр.
  audio.addEventListener('pause', () => { if (state.playing && audio?.paused) halt() })
  // Запасна перевірка таймера: у фоні iPhone пригальмовує setInterval, а timeupdate приходить від самого плеєра.
  audio.addEventListener('timeupdate', checkTimer)
  document.addEventListener('visibilitychange', checkTimer)
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

/** Якщо час таймера вже минув (наприклад, телефон «спав») — зупиняємо. */
function checkTimer() {
  if (state.playing && state.endsAt !== null && Date.now() >= state.endsAt) stop()
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

function samplesOf(kind: SoundKind): Float32Array {
  let x = generated.get(kind)
  if (!x) { x = renderSound(kind); generated.set(kind, x) }
  return x
}

/** Колискову з файлу перетворюємо на моно 22 кГц (щоб змінювати гучність на iPhone). null — не вдалося/задовга. */
async function decodeLullaby(src: Extract<Source, { kind: 'blob' }>): Promise<Float32Array | null> {
  if (decoded.has(src.id)) return decoded.get(src.id)!
  let res: Float32Array | null = null
  try {
    const Ctx = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
    if (Ctx) {
      const probe = new Ctx(1, 1, SAMPLE_RATE)
      const buf = await probe.decodeAudioData(await src.blob.arrayBuffer())
      if (buf.duration <= MAX_BAKE_SEC) {
        const ctx = new Ctx(1, Math.ceil(buf.duration * SAMPLE_RATE), SAMPLE_RATE)
        const node = ctx.createBufferSource()
        node.buffer = buf
        node.connect(ctx.destination)
        node.start()
        res = (await ctx.startRendering()).getChannelData(0)
      }
    }
  } catch { res = null }
  decoded.set(src.id, res)
  return res
}

/** Аудіо для відтворення. На iPhone (де audio.volume не працює) гучність уже «запечена» в WAV. */
async function sourceBlob(src: Source): Promise<Blob> {
  const bake = !canSetVolume()
  if (src.kind === 'blob') {
    if (!bake) return src.blob
    if (!decoded.has(src.id)) {
      // Декодування може тривати секунду-дві, а iPhone дозволяє play() лише одразу після дотику.
      // Тож спершу граємо оригінал, а файл із потрібною гучністю підміняємо, щойно він готовий.
      void decodeLullaby(src).then((pcm) => { if (pcm && state.source?.id === src.id) scheduleRebake(0) })
      return src.blob
    }
    const pcm = decoded.get(src.id)
    return pcm ? new Blob([encodeWav(pcm, SAMPLE_RATE, bakedGain())], { type: 'audio/wav' }) : src.blob
  }
  return new Blob([encodeWav(samplesOf(src.sound), SAMPLE_RATE, bake ? bakedGain() : 1)], { type: 'audio/wav' })
}

/** Повзунок 0.05..1 → множник для семплів; ×2 бо власні мелодії нормалізовані тихо, а за замовчуванням гучність 0.35. */
const bakedGain = () => Math.min(1.5, state.volume * 2)
const MAX_BAKE_SEC = 15 * 60

/** Зупиняє відлік і мітить стан як «не грає», не чіпаючи вибраний звук. */
function halt() {
  stopTick()
  set({ playing: false, endsAt: null })
}

async function load(src: Source, keepPosition = false) {
  const a = el()
  const pos = keepPosition ? a.currentTime : 0
  const blob = await sourceBlob(src)
  if (url) URL.revokeObjectURL(url)
  url = URL.createObjectURL(blob)
  loadedId = src.id
  a.src = url
  if (pos) {
    const seek = () => { try { a.currentTime = pos } catch { /* ще не готовий */ } }
    if (a.readyState >= 1) seek(); else a.addEventListener('loadedmetadata', seek, { once: true })
  }
}


export async function play(src: Source) {
  const a = el()
  if (loadedId !== src.id || !url) await load(src)
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
  if (!canSetVolume() && state.source) scheduleRebake()
}

let rebakeTimer: ReturnType<typeof setTimeout> | null = null
/** iPhone: перезбираємо файл з новою гучністю, коли повзунок відпустили (з тієї ж позиції). */
function scheduleRebake(delay = 350) {
  if (rebakeTimer) clearTimeout(rebakeTimer)
  rebakeTimer = setTimeout(async () => {
    rebakeTimer = null
    const src = state.source
    if (!src) return
    const wasPlaying = state.playing
    const endsAt = state.endsAt
    await load(src, true)
    if (wasPlaying) {
      try { await el().play(); set({ playing: true, endsAt }); startTick() } catch { halt() }
    }
  }, delay)
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const usePlayer = () => useSyncExternalStore(subscribe, () => state)
