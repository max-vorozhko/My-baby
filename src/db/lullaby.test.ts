import { describe, expect, it } from 'vitest'
import { lullabyBlob } from './actions'

describe('lullabyBlob', () => {
  it('відновлює Blob з ArrayBuffer із правильним MIME', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const b = lullabyBlob({ audio: bytes.buffer, audio_type: 'audio/mp4' })
    expect(b.type).toBe('audio/mp4')
    expect(new Uint8Array(await b.arrayBuffer())).toEqual(bytes)
  })
  it('старі записи (Blob) повертає як є', () => {
    const old = new Blob([new Uint8Array([9])], { type: 'audio/webm' })
    expect(lullabyBlob({ audio: old })).toBe(old)
  })
  it('без MIME — audio/mp4 за замовчуванням (формат iPhone)', () => {
    expect(lullabyBlob({ audio: new ArrayBuffer(2) }).type).toBe('audio/mp4')
  })
})
