import type { SleepKind } from '@/db/types'

/** Фіксовані «випадкові» позиції зірок (x%, y%, розмір px, затримка s). */
const STARS: [number, number, number, number][] = [
  [8, 18, 2, 0], [18, 62, 1.5, 1.2], [27, 30, 2.5, 2.4], [36, 78, 1.5, 0.6], [44, 14, 1.5, 3.1],
  [52, 52, 2, 1.8], [61, 24, 1.5, 0.3], [68, 70, 2, 2.7], [76, 12, 2.5, 1.5], [84, 44, 1.5, 3.6],
  [91, 76, 2, 0.9], [14, 88, 1.5, 2.1], [58, 90, 1.5, 3.3], [33, 8, 1.5, 4.2],
]

/**
 * Тиха анімація фону картки сну: зорі вночі, сонце вдень.
 * Лише декор: aria-hidden, без подій, вимикається при prefers-reduced-motion.
 */
export function SleepScene({ kind }: { kind: SleepKind }) {
  if (kind === 'night') {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" data-scene="night">
        {STARS.map(([x, y, s, d], i) => (
          <span key={i} className="scene-twinkle absolute rounded-full bg-white"
            style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${d}s` }} />
        ))}
        {/* Місяць — тонкий серп через тінь. */}
        <span className="scene-float absolute right-[38%] top-3 h-7 w-7 rounded-full"
          style={{ boxShadow: 'inset -7px 3px 0 0 rgb(255 245 225 / 0.85)' }} />
      </div>
    )
  }
  // Сонце «сходить» з-за нижнього краю картки — під текстом, не перекриваючи кнопку.
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" data-scene="day">
      <div className="absolute -bottom-28 left-[28%] h-48 w-48">
        <span className="scene-glow absolute inset-4 rounded-full bg-[radial-gradient(circle,rgb(255_226_160/0.45),rgb(255_226_160/0)_70%)]" />
        <svg viewBox="0 0 192 192" className="scene-spin absolute inset-0 h-full w-full opacity-30">
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="96" y1="18" x2="96" y2="32" stroke="rgb(255 240 205)" strokeWidth="3" strokeLinecap="round"
              transform={`rotate(${i * 30} 96 96)`} />
          ))}
        </svg>
        <span className="absolute inset-[58px] rounded-full bg-[rgb(255_226_160/0.35)]" />
      </div>
    </div>
  )
}
