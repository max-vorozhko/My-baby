import { describe, expect, it } from 'vitest'
import {
  NOISE_LOOP_SEC, SAMPLE_RATE, brownNoise, encodeWav, fadeFactor, makeLoopable, normalize, renderSound, rms, rng, whiteNoise, SOUNDS,
} from './noise'

describe('rng', () => {
  it('однакове зерно дає однакову послідовність', () => {
    const a = rng(7), b = rng(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('значення в [0, 1)', () => {
    const r = rng(3)
    for (let i = 0; i < 1000; i++) { const x = r(); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1) }
  })
})

describe('нормалізація', () => {
  it('вирівнює RMS до цілі й не виходить за ±1', () => {
    const x = normalize(brownNoise(20_000, rng(1)), 0.12)
    expect(rms(x)).toBeGreaterThan(0.1)
    expect(rms(x)).toBeLessThan(0.13)
    expect(Math.max(...x)).toBeLessThanOrEqual(1)
    expect(Math.min(...x)).toBeGreaterThanOrEqual(-1)
  })
  it('тиша лишається тишею', () => {
    expect(rms(normalize(new Float32Array(10)))).toBe(0)
  })
})

describe('makeLoopable', () => {
  it('повертає рівно n семплів', () => {
    expect(makeLoopable(whiteNoise(1500, rng(1)), 1000)).toHaveLength(1000)
  })
  it('стик кінця й початку не гірший за звичайний крок між сусідніми семплами (брауновий шум)', () => {
    const n = 20_000, fade = 2_000
    const loop = makeLoopable(brownNoise(n + fade, rng(5)), n)
    let maxStep = 0
    for (let i = 1; i < n; i++) maxStep = Math.max(maxStep, Math.abs(loop[i] - loop[i - 1]))
    const seam = Math.abs(loop[0] - loop[n - 1])
    expect(seam).toBeLessThanOrEqual(maxStep * 1.5)
  })
})

describe('renderSound', () => {
  it.each(SOUNDS.map((s) => s.kind))('%s: не порожній, у межах ±1, не тиша', (kind) => {
    const x = renderSound(kind)
    expect(x.length).toBeGreaterThan(SAMPLE_RATE * 5)
    expect(rms(x)).toBeGreaterThan(0.02)
    for (let i = 0; i < x.length; i += 97) expect(Math.abs(x[i])).toBeLessThanOrEqual(1)
  })
  it('серцебиття — рівно 60 с (ціла кількість ударів)', () => {
    expect(renderSound('heartbeat').length).toBe(SAMPLE_RATE * 60)
  })
  it('шуми — петля 60 с', () => {
    expect(renderSound('pink').length).toBe(SAMPLE_RATE * NOISE_LOOP_SEC)
  })
  it('мелодії тривають 1,5–3 хв і детерміновані', () => {
    for (const k of ['musicbox', 'swing'] as const) {
      const a = renderSound(k)
      expect(a.length / SAMPLE_RATE).toBeGreaterThan(90)
      expect(a.length / SAMPLE_RATE).toBeLessThan(180)
      expect(renderSound(k)[12345]).toBe(a[12345])
    }
  })
})

describe('encodeWav', () => {
  it('має коректний заголовок і розмір', () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), 22_050)
    const txt = (o: number, l: number) => String.fromCharCode(...wav.slice(o, o + l))
    const v = new DataView(wav.buffer)
    expect(txt(0, 4)).toBe('RIFF')
    expect(txt(8, 4)).toBe('WAVE')
    expect(v.getUint32(24, true)).toBe(22_050)
    expect(v.getUint32(40, true)).toBe(8)
    expect(wav.length).toBe(44 + 8)
    expect(v.getInt16(46, true)).toBe(16_383) // 0.5 → 0.5 · 32767, відкинуто дробову частину
    expect(v.getInt16(48, true)).toBe(-16_384) // -0.5 → -0.5 · 32768
    expect(v.getInt16(50, true)).toBe(0x7fff)
  })
})

describe('encodeWav gain', () => {
  it('множить семпли на gain', () => {
    const v = new DataView(encodeWav(new Float32Array([0.5]), 22_050, 0.5).buffer)
    expect(v.getInt16(44, true)).toBe(8191)
  })
})

describe('fadeFactor', () => {
  it('до початку затухання — повна гучність', () => expect(fadeFactor(60_000, 30_000)).toBe(1))
  it('лінійно до нуля', () => {
    expect(fadeFactor(15_000, 30_000)).toBeCloseTo(0.5)
    expect(fadeFactor(0, 30_000)).toBe(0)
    expect(fadeFactor(-5, 30_000)).toBe(0)
  })
  it('нульова тривалість — без затухання', () => expect(fadeFactor(10, 0)).toBe(1))
})
