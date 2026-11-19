import { describe, expect, it } from 'vitest'
import { splitForSpeech } from './speech'

describe('splitForSpeech', () => {
  it('ділить за реченнями й тримає фрази в межах ліміту', () => {
    const text = 'Жив-був малюк. Він любив качок! А качки любили його? Так.'
    const parts = splitForSpeech(text, 30)
    expect(parts.every((p) => p.length <= 40)).toBe(true)
    expect(parts.join(' ')).toContain('качок')
  })
  it('не губить текст', () => {
    const text = 'Перший абзац. Ще речення.\n\nДругий абзац без крапки'
    const joined = splitForSpeech(text, 20).join(' ').replace(/\s+/g, ' ')
    for (const w of ['Перший', 'Ще', 'Другий', 'крапки']) expect(joined).toContain(w)
  })
  it('дуже довге речення без розділових знаків не зависає і ріжеться по пробілах/комах', () => {
    const long = Array.from({ length: 60 }, (_, i) => `слово${i},`).join(' ')
    const parts = splitForSpeech(long, 80)
    expect(parts.length).toBeGreaterThan(1)
  })
  it('порожній текст — порожній результат', () => expect(splitForSpeech('  \n ')).toEqual([]))
})
