import { describe, expect, it } from 'vitest'
import { uuid } from './index'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('uuid', () => {
  it('uses randomUUID when available', () => {
    expect(uuid()).toMatch(V4)
  })
  it('falls back to getRandomValues when randomUUID is missing (http, iOS < 15.4)', () => {
    const c = crypto as Crypto & { randomUUID?: unknown }
    const orig = c.randomUUID
    Object.defineProperty(c, 'randomUUID', { value: undefined, configurable: true })
    try {
      const ids = new Set(Array.from({ length: 50 }, uuid))
      expect(ids.size).toBe(50)
      for (const id of ids) expect(id).toMatch(V4)
    } finally {
      Object.defineProperty(c, 'randomUUID', { value: orig, configurable: true })
    }
  })
})
