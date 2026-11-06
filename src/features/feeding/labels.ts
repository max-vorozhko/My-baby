import type { BottleContent, BreastSide, Feeding } from '@/db/types'

export const sideLabel: Record<BreastSide, string> = { left: 'Ліві груди', right: 'Праві груди', both: 'Обидві' }
export const sideShort: Record<BreastSide, string> = { left: 'ліва', right: 'права', both: 'обидві' }
export const contentLabel: Record<BottleContent, string> = { formula: 'Суміш', breast_milk: 'Зціджене молоко' }

export function feedingTitle(f: Feeding) {
  if (f.kind === 'breast') return f.side ? sideLabel[f.side] : 'Груди'
  const what = f.bottle_content ? contentLabel[f.bottle_content] : 'Пляшечка'
  return `${what}${f.amount_ml ? ` · ${f.amount_ml} мл` : ''}`
}

/** Сторона останнього годування грудьми (факт, без «пропонуємо»). */
export function lastSide(feedings: Feeding[]): BreastSide | null {
  const last = feedings.filter((f) => f.kind === 'breast' && f.side)
    .sort((a, b) => b.start_at.localeCompare(a.start_at))[0]
  return last?.side ?? null
}
