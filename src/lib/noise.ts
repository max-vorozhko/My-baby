/**
 * Генерація звуків для засинання без аудіофайлів: шуми, «серцебиття» і музична скринька.
 * Усе рахується в коді й віддається як зациклений WAV — його програє звичайний <audio>,
 * тож звук не обривається при заблокованому екрані (на відміну від чистого Web Audio на iOS).
 */

export const SAMPLE_RATE = 22_050

export type SoundKind = 'white' | 'pink' | 'brown' | 'heartbeat' | 'musicbox'

export interface SoundInfo {
  kind: SoundKind
  title: string
  hint: string
}

export const SOUNDS: SoundInfo[] = [
  { kind: 'white', title: 'Білий шум', hint: 'Рівний, «шиплячий»' },
  { kind: 'pink', title: "М'який шум", hint: 'Схожий на дощ і вітер' },
  { kind: 'brown', title: 'Глибокий шум', hint: 'Низький, як гул' },
  { kind: 'heartbeat', title: 'Серцебиття', hint: 'Гул і ритм «як у мами»' },
  { kind: 'musicbox', title: 'Музична скринька', hint: 'Оригінальна мелодія' },
]

/** Детермінований генератор (mulberry32): однакове зерно — однаковий звук, тести стабільні. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function whiteNoise(n: number, rand: () => number): Float32Array {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = rand() * 2 - 1
  return out
}

/** Рожевий шум — фільтр Пола Келета (економна апроксимація 1/f). */
export function pinkNoise(n: number, rand: () => number): Float32Array {
  const out = new Float32Array(n)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < n; i++) {
    const w = rand() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.969 * b2 + w * 0.153852
    b3 = 0.8665 * b3 + w * 0.3104856
    b4 = 0.55 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.016898
    out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362
    b6 = w * 0.115926
  }
  return out
}

/** Коричневий шум: «дірявий» інтегратор білого, щоб не дрейфував. */
export function brownNoise(n: number, rand: () => number, leak = 0.02): Float32Array {
  const out = new Float32Array(n)
  let last = 0
  for (let i = 0; i < n; i++) {
    const w = rand() * 2 - 1
    last = (last + leak * w) / (1 + leak)
    out[i] = last * 3.5
  }
  return out
}

export function rms(x: Float32Array): number {
  if (!x.length) return 0
  let s = 0
  for (let i = 0; i < x.length; i++) s += x[i] * x[i]
  return Math.sqrt(s / x.length)
}

/** Вирівнює гучність за RMS, щоб різні звуки звучали однаково гучно; обрізає піки на ±1. */
export function normalize(x: Float32Array, targetRms = 0.12): Float32Array {
  const r = rms(x)
  if (r === 0) return x
  const k = targetRms / r
  for (let i = 0; i < x.length; i++) x[i] = Math.max(-1, Math.min(1, x[i] * k))
  return x
}

/**
 * Робить звук зациклюваним без «клацання»: на початку підмішує хвіст, що виходить за межі петлі.
 * Приймає n + fade семплів, повертає рівно n.
 */
export function makeLoopable(x: Float32Array, n: number): Float32Array {
  const fade = x.length - n
  const out = x.slice(0, n)
  for (let i = 0; i < fade; i++) {
    const t = (i / fade) * (Math.PI / 2)
    out[i] = x[i] * Math.sin(t) + x[n + i] * Math.cos(t)
  }
  return out
}

/** Шум для петлі: генеруємо з запасом і зшиваємо кінець із початком. */
function loopedNoise(kind: 'white' | 'pink' | 'brown', seconds: number, rand: () => number): Float32Array {
  const n = Math.round(seconds * SAMPLE_RATE)
  const fade = Math.round(0.5 * SAMPLE_RATE)
  const gen = kind === 'white' ? whiteNoise : kind === 'pink' ? pinkNoise : brownNoise
  return makeLoopable(gen(n + fade, rand), n)
}

/** Серцебиття 72 уд/хв поверх низького гулу. 12 ударів = рівно 10 с, тож петля ритмічна. */
export function heartbeat(rand: () => number): Float32Array {
  const beatLen = Math.round(SAMPLE_RATE * (60 / 72)) // 18 375 семплів
  const beats = 12
  const n = beatLen * beats
  const out = brownNoise(n, rand, 0.01)
  normalize(out, 0.05) // гул тихий, ритм — на передньому плані
  const thump = (start: number, gain: number, freq: number) => {
    const len = Math.round(SAMPLE_RATE * 0.22)
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE
      const env = Math.exp(-t * 22) * Math.min(1, t * 400)
      const idx = (start + i) % n // оберт: хвіст останнього удару лягає на початок петлі
      out[idx] += Math.sin(2 * Math.PI * freq * t) * env * gain
    }
  }
  for (let b = 0; b < beats; b++) {
    const s = b * beatLen
    thump(s, 0.5, 52) // «туп»
    thump(s + Math.round(SAMPLE_RATE * 0.26), 0.32, 44) // «тук»
  }
  return out
}

/** Оригінальна мелодія для музичної скриньки (пентатоніка до мажор, 3/4). */
const MUSICBOX_NOTES = [
  659.25, 783.99, 880.0, 783.99, 659.25, 587.33,
  523.25, 587.33, 659.25, 587.33, 523.25, 440.0,
  523.25, 659.25, 783.99, 659.25, 587.33, 523.25,
  587.33, 659.25, 587.33, 523.25, 440.0, 392.0,
]

export function musicBox(): Float32Array {
  const step = 0.55
  const n = Math.round(MUSICBOX_NOTES.length * step * SAMPLE_RATE)
  const out = new Float32Array(n)
  MUSICBOX_NOTES.forEach((f, k) => {
    const start = Math.round(k * step * SAMPLE_RATE)
    const len = Math.round(2.4 * SAMPLE_RATE)
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE
      const env = Math.exp(-t * 2.6) * Math.min(1, t * 200)
      const v = (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t)) * env * 0.5
      out[(start + i) % n] += v // хвіст останніх нот переходить на початок — петля без шва
    }
  })
  return normalize(out, 0.1)
}

export function renderSound(kind: SoundKind, seed = 1): Float32Array {
  const rand = rng(seed)
  switch (kind) {
    case 'white':
    case 'pink':
    case 'brown':
      return normalize(loopedNoise(kind, 10, rand))
    case 'heartbeat':
      return heartbeat(rand)
    case 'musicbox':
      return musicBox()
  }
}

/** 16-бітний моно WAV. */
export function encodeWav(samples: Float32Array, rate = SAMPLE_RATE): Uint8Array<ArrayBuffer> {
  const dataLen = samples.length * 2
  const buf = new ArrayBuffer(44 + dataLen)
  const v = new DataView(buf)
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); str(8, 'WAVE')
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, dataLen, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Uint8Array(buf)
}

export function soundBlob(kind: SoundKind): Blob {
  return new Blob([encodeWav(renderSound(kind))], { type: 'audio/wav' })
}

/** Гучність під час затухання: лінійно до 0 на останніх fadeMs перед кінцем таймера. */
export function fadeFactor(remainingMs: number, fadeMs: number): number {
  if (fadeMs <= 0 || remainingMs >= fadeMs) return 1
  return Math.max(0, remainingMs / fadeMs)
}
