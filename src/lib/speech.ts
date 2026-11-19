import { useSyncExternalStore } from 'react'

/* ---------- Диктування теми (Web Speech API) ---------- */

interface RecognitionResult { readonly 0: { transcript: string }; readonly isFinal: boolean }
interface RecognitionEvent { results: ArrayLike<RecognitionResult> }
interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
type RecognitionCtor = new () => Recognition

const recognitionCtor = (): RecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const dictationSupported = () => typeof window !== 'undefined' && recognitionCtor() !== null

export interface Dictation { stop(): void }

/** Диктування українською. onText отримує весь розпізнаний текст на цей момент. */
export function startDictation(handlers: { onText: (t: string) => void; onEnd: () => void; onError: (msg: string) => void }): Dictation | null {
  const Ctor = recognitionCtor()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = 'uk-UA'
  rec.interimResults = true
  rec.continuous = true
  rec.onresult = (e) => {
    let t = ''
    for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
    handlers.onText(t.trim())
  }
  rec.onerror = (e) => {
    handlers.onError(e.error === 'not-allowed' || e.error === 'service-not-allowed'
      ? 'Немає доступу до мікрофона. Дозвольте його в налаштуваннях браузера.'
      : e.error === 'no-speech' ? 'Нічого не почув. Спробуйте ще раз.' : 'Диктування не спрацювало. Можна ввести текст.')
  }
  rec.onend = handlers.onEnd
  rec.start()
  return { stop: () => rec.stop() }
}

/* ---------- Озвучка казки (speechSynthesis) ---------- */

export const narrationSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Ділить текст на фрази: довгі репліки Chrome і Android обрізають, тому читаємо по шматках. */
export function splitForSpeech(text: string, max = 180): string[] {
  const out: string[] = []
  for (const para of text.split(/\n+/)) {
    const sentences = para.match(/[^.!?…]+[.!?…]*\s*/g) ?? [para]
    let cur = ''
    for (const s of sentences) {
      if ((cur + s).length > max && cur) { out.push(cur.trim()); cur = '' }
      if (s.length > max) {
        // дуже довге речення ріжемо по комах/пробілах
        const parts = s.split(/(?<=[,;:—-])\s+/)
        for (const p of parts) {
          if ((cur + p).length > max && cur) { out.push(cur.trim()); cur = '' }
          cur += p + ' '
        }
      } else cur += s
    }
    if (cur.trim()) out.push(cur.trim())
  }
  return out.filter(Boolean)
}

function ukVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang.toLowerCase().startsWith('uk')) ?? null
}

/** Чи є в пристрою український голос. Без нього читати краще самим. */
export const hasUkrainianVoice = () => narrationSupported() && ukVoice() !== null

interface NarrationState { speaking: boolean; index: number; total: number }
let narration: NarrationState = { speaking: false, index: 0, total: 0 }
let token = 0
const subs = new Set<() => void>()
const setN = (p: Partial<NarrationState>) => { narration = { ...narration, ...p }; subs.forEach((f) => f()) }

export function stopNarration() {
  token++
  if (narrationSupported()) window.speechSynthesis.cancel()
  setN({ speaking: false, index: 0, total: 0 })
}

/** Повільно й спокійно, з паузами між фразами. */
export function speak(text: string) {
  if (!narrationSupported()) return
  stopNarration()
  const chunks = splitForSpeech(text)
  if (!chunks.length) return
  const my = token
  const voice = ukVoice()
  setN({ speaking: true, index: 0, total: chunks.length })
  const next = (i: number) => {
    if (my !== token) return
    if (i >= chunks.length) { setN({ speaking: false, index: 0, total: 0 }); return }
    const u = new SpeechSynthesisUtterance(chunks[i])
    u.lang = 'uk-UA'
    if (voice) u.voice = voice
    u.rate = 0.85
    u.onend = () => { setN({ index: i + 1 }); setTimeout(() => next(i + 1), 350) }
    u.onerror = () => { if (my === token) setN({ speaking: false }) }
    window.speechSynthesis.speak(u)
  }
  next(0)
}

export const useNarration = () => useSyncExternalStore(
  (f) => { subs.add(f); return () => { subs.delete(f) } },
  () => narration,
)
