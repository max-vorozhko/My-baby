/** Єдиний дисклеймер: в онбордингу і в налаштуваннях. */
export const DISCLAIMER_TEXT =
  'My Baby — щоденник спостережень. Він не дає медичних порад і не замінює лікаря. Усі рішення щодо харчування, сну і лікування — разом із педіатром.'

export function Disclaimer({ className = '' }: { className?: string }) {
  return <p role="note" className={`text-xs leading-relaxed text-muted ${className}`}>{DISCLAIMER_TEXT}</p>
}
