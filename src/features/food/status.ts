import type { FoodStatus } from '@/lib/food'

export const STATUS_LABEL: Record<FoodStatus, string> = {
  new: 'Ще не пробували', observing: 'Спостерігаємо', introduced: 'Введено', reaction: 'Була реакція', postponed: 'Відкладено',
}

/** Класи плитки/бейджа за статусом. */
export const STATUS_CLS: Record<FoodStatus, string> = {
  new: 'bg-surface border-line text-muted',
  observing: 'bg-accent-soft border-accent text-ink',
  introduced: 'bg-food-soft border-food text-ink',
  reaction: 'bg-sos/15 border-sos text-ink',
  postponed: 'bg-surface border-dashed border-line text-muted',
}

export const STATUS_DOT: Record<FoodStatus, string> = {
  new: 'bg-line', observing: 'bg-accent', introduced: 'bg-food', reaction: 'bg-sos', postponed: 'bg-muted',
}
