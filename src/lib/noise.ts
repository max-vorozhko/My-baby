/**
 * Генерація звуків для засинання без аудіофайлів: шуми, «серцебиття» і музична скринька.
 * Усе рахується в коді й віддається як зациклений WAV — його програє звичайний <audio>,
 * тож звук не обривається при заблокованому екрані (на відміну від чистого Web Audio на iOS).
 */

export const SAMPLE_RATE = 22_050

export type SoundKind = 'white' | 'pink' | 'brown' | 'heartbeat' | 'musicbox' | 'swing'

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
  { kind: 'musicbox', title: 'Музична скринька', hint: 'Оригінальна мелодія · ~2 хв' },
  { kind: 'swing', title: 'Тиха гойдалка', hint: 'Повільна арфа з басом · ~2,5 хв' },
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

/** Довжина петлі шумів: 60 с — повтор уже не впізнається на слух. */
export const NOISE_LOOP_SEC = 60

/**
 * Ледь чутне «дихання» гучності (±6 %), щоб шум не звучав механічно.
 * Цілі кількості періодів на петлю — тож на стику модуляція збігається.
 */
function breathe(x: Float32Array, depth = 0.06): Float32Array {
  const n = x.length
  for (let i = 0; i < n; i++) {
    const p = i / n
    x[i] *= 1 + depth * (0.6 * Math.sin(2 * Math.PI * 3 * p) + 0.4 * Math.sin(2 * Math.PI * 7 * p + 1.3))
  }
  return x
}

/** Шум для петлі: генеруємо з запасом і зшиваємо кінець із початком плавним 2-секундним переходом. */
function loopedNoise(kind: 'white' | 'pink' | 'brown', seconds: number, rand: () => number): Float32Array {
  const n = Math.round(seconds * SAMPLE_RATE)
  const fade = Math.round(2 * SAMPLE_RATE)
  const gen = kind === 'white' ? whiteNoise : kind === 'pink' ? pinkNoise : brownNoise
  return breathe(makeLoopable(gen(n + fade, rand), n))
}

/** Серцебиття 72 уд/хв поверх низького гулу. 72 удари = рівно 60 с, тож петля ритмічна. */
export function heartbeat(rand: () => number): Float32Array {
  const beatLen = Math.round(SAMPLE_RATE * (60 / 72)) // 18 375 семплів
  const beats = 72
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
    // ледь «живий» удар: сила трохи гуляє, як у справжнього серця
    const g = 0.92 + 0.08 * Math.sin((2 * Math.PI * b) / 9)
    thump(s, 0.5 * g, 52) // «туп»
    thump(s + Math.round(SAMPLE_RATE * 0.26), 0.32 * g, 44) // «тук»
  }
  return out
}

// ---------- Оригінальні мелодії ----------
// Мелодію складає код за простими правилами гармонії (без чужих творів):
// акорди I–vi–IV–V, на сильну долю — звук акорду, далі плавний рух ступенями.
// Форма A A' B A' × 4 з варіаціями: ~2–2,5 хв без повторів, що впадають у вухо.

const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12)
/** Ступінь гами (може бути від'ємним або > 6) → MIDI. */
const degMidi = (tonic: number, deg: number) => tonic + 12 * Math.floor(deg / 7) + MAJOR[((deg % 7) + 7) % 7]

interface Note { deg: number; beats: number; at: number }
type Voice = 'musicbox' | 'harp'

export interface TuneSpec {
  seed: number
  tonic: number // MIDI тоніки мелодії
  beat: number // секунд на долю
  voice: Voice
}

export const TUNES: Record<'musicbox' | 'swing', TuneSpec> = {
  musicbox: { seed: 7, tonic: 72, beat: 0.6, voice: 'musicbox' },
  swing: { seed: 21, tonic: 67, beat: 0.78, voice: 'harp' },
}

const PROG_A = [0, 5, 3, 4] // I vi IV V (напівкаденція)
const PROG_A2 = [0, 5, 4, 0] // I vi V I (повна каденція)
const PROG_B = [3, 0, 1, 4] // IV I ii V

/** Фраза з 4 тактів по 3 долі; останній такт — довга нота на звуку акорду. */
function phrase(prog: number[], rand: () => number, start: number, ornament: number): { notes: Note[]; last: number } {
  const notes: Note[] = []
  let cur = start
  prog.forEach((root, bar) => {
    const chord = [root, root + 2, root + 4]
    // найближчий звук акорду (у межах 1–9 ступенів)
    const cands = chord.flatMap((c) => [c - 7, c, c + 7]).filter((d) => d >= 1 && d <= 9)
    const target = cands.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) || (Math.abs(b - cur) === Math.abs(a - cur) && rand() < 0.5) ? b : a))
    if (bar === prog.length - 1) {
      notes.push({ deg: target, beats: 3, at: 0 })
      cur = target
      return
    }
    notes.push({ deg: target, beats: 1, at: 0 })
    cur = target
    for (let k = 0; k < 2; k++) {
      const r = rand()
      const step = r < 0.35 ? 1 : r < 0.7 ? -1 : r < 0.82 ? 2 : r < 0.92 ? -2 : 0
      let next = Math.max(1, Math.min(9, cur + step))
      if (next === cur && step !== 0) next = cur - Math.sign(step)
      if (rand() < ornament) {
        // прикраса: дві восьмі замість чверті
        notes.push({ deg: next, beats: 0.5, at: 0 }, { deg: Math.max(1, Math.min(9, next + (rand() < 0.5 ? 1 : -1))), beats: 0.5, at: 0 })
      } else notes.push({ deg: next, beats: 1, at: 0 })
      cur = next
    }
  })
  return { notes, last: cur }
}

/** Повна мелодія з акомпанементом. Повертає семпли довжиною рівно на одне «коло». */
export function lullabyTune(spec: TuneSpec): Float32Array {
  const rand = rng(spec.seed)
  const melody: Note[] = []
  const bass: { root: number; at: number; bar: number }[] = []
  let t = 0 // у долях
  let cur = 4

  for (let section = 0; section < 4; section++) {
    // A та A' мають спільний «мотив» (те саме зерно), B щоразу трохи інший
    const ornament = [0.05, 0.15, 0.1, 0.02][section]
    const plan: [number[], () => number][] = [
      [PROG_A, rng(spec.seed + 100 + (section % 2))],
      [PROG_A2, rng(spec.seed + 100 + (section % 2))],
      [PROG_B, rng(spec.seed + 200 + section)],
      [PROG_A2, rng(spec.seed + 100 + (section % 2))],
    ]
    for (const [prog, r] of plan) {
      const ph = phrase(prog, r, cur, ornament)
      prog.forEach((root, bar) => bass.push({ root, at: t + bar * 3, bar }))
      for (const n of ph.notes) { melody.push({ ...n, at: t }); t += n.beats }
      cur = ph.last
    }
  }

  // Живий темп: кінець кожної фрази (кожні 12 доль) трохи сповільнюється.
  const timeOf = (beatPos: number) => {
    const phraseIdx = Math.floor(beatPos / 12)
    const inPhrase = beatPos - phraseIdx * 12
    const slow = 0.12 // +12 % на останньому такті фрази
    const extra = Math.max(0, inPhrase - 9) * slow
    return (phraseIdx * (12 + 3 * slow) + inPhrase + extra) * spec.beat
  }
  const totalSec = timeOf(t)
  const n = Math.round(totalSec * SAMPLE_RATE)
  const out = new Float32Array(n)

  // Синтез «щипка» без Math.sin/Math.exp на кожен семпл: синус — рекурентним осцилятором,
  // загасання — множенням. У ~10 разів швидше, тож мелодія готова за долі секунди.
  const pluck = (startSec: number, hz: number, gain: number, decay: number, len: number, harm: number[]) => {
    const start = Math.round(startSec * SAMPLE_RATE)
    const L = Math.round(len * SAMPLE_RATE)
    const attack = Math.round(SAMPLE_RATE / 180)
    const partials = [1, ...harm]
      .map((amp, h) => ({ amp, f: hz * (h + 1), h }))
      .filter((p) => p.f < SAMPLE_RATE / 2) // лише гармоніки нижче частоти Найквіста
      .map(({ amp, f, h }) => {
        const w = (2 * Math.PI * f) / SAMPLE_RATE
        return { amp, k: 2 * Math.cos(w), s1: Math.sin(-w), s2: Math.sin(-2 * w), e: 1, d: Math.exp(-(decay * (h + 1)) / SAMPLE_RATE) }
      })
    let idx = start % n
    for (let i = 0; i < L; i++) {
      let v = 0
      for (const p of partials) {
        const s0 = p.k * p.s1 - p.s2
        p.s2 = p.s1; p.s1 = s0
        v += p.amp * p.e * s0
        p.e *= p.d
      }
      out[idx] += v * gain * (i < attack ? i / attack : 1)
      if (++idx === n) idx = 0 // хвости останніх нот лягають на початок — коло без шва
    }
  }

  const mb = spec.voice === 'musicbox'
  for (const note of melody) {
    const vel = 0.85 + 0.15 * rand()
    pluck(timeOf(note.at), midiHz(degMidi(spec.tonic, note.deg)), 0.5 * vel, mb ? 2.6 : 1.6, mb ? 2.4 : 3.2, mb ? [0.25] : [0.35, 0.12])
  }
  // Бас на першу долю й тихі звуки акорду на другу/третю — м'який «вальсовий» супровід.
  for (const b of bass) {
    const low = spec.tonic - 24
    pluck(timeOf(b.at), midiHz(degMidi(low, b.root)), 0.32, 1.2, 3.5, [0.15])
    if (b.bar < 3) {
      pluck(timeOf(b.at + 1), midiHz(degMidi(low + 12, b.root + 2)), 0.12, 2.2, 2, [])
      pluck(timeOf(b.at + 2), midiHz(degMidi(low + 12, b.root + 4)), 0.12, 2.2, 2, [])
    }
  }
  return normalize(out, 0.1)
}

export function renderSound(kind: SoundKind, seed = 1): Float32Array {
  const rand = rng(seed)
  switch (kind) {
    case 'white':
    case 'pink':
    case 'brown':
      return normalize(loopedNoise(kind, NOISE_LOOP_SEC, rand))
    case 'heartbeat':
      return heartbeat(rand)
    case 'musicbox':
      return lullabyTune(TUNES.musicbox)
    case 'swing':
      return lullabyTune(TUNES.swing)
  }
}

/** 16-бітний моно WAV; gain — множник гучності (так на iPhone регулюємо гучність без audio.volume). */
export function encodeWav(samples: Float32Array, rate = SAMPLE_RATE, gain = 1): Uint8Array<ArrayBuffer> {
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
    const s = Math.max(-1, Math.min(1, samples[i] * gain))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Uint8Array(buf)
}

export function soundBlob(kind: SoundKind, gain = 1): Blob {
  return new Blob([encodeWav(renderSound(kind), SAMPLE_RATE, gain)], { type: 'audio/wav' })
}

/** Гучність під час затухання: лінійно до 0 на останніх fadeMs перед кінцем таймера. */
export function fadeFactor(remainingMs: number, fadeMs: number): number {
  if (fadeMs <= 0 || remainingMs >= fadeMs) return 1
  return Math.max(0, remainingMs / fadeMs)
}
