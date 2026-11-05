/**
 * Медичний дисклеймер. Показується скрізь, де є поради щодо здоров'я,
 * харчування, сну чи першої допомоги.
 */
export const DISCLAIMER_TEXT =
  'Застосунок не надає медичних рекомендацій і не замінює лікаря. Інформація — лише для орієнтиру. Обов’язково порадьтеся з педіатром.'

export function Disclaimer({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return (
    <p role="note" className={`rounded-2xl border border-line bg-surface p-3 text-xs leading-relaxed text-muted ${className}`}>
      <b className="text-ink">ⓘ {compact ? 'Лише для орієнтиру.' : 'Важливо.'}</b>{' '}
      {compact ? 'Не є медичною рекомендацією — порадьтеся з лікарем.' : DISCLAIMER_TEXT}
    </p>
  )
}
