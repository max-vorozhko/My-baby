import type { FoodStatus } from '@/lib/food'

export const STATUS_LABEL: Record<FoodStatus, string> = {
  new: 'Ще не давали', tried: 'Пробували', reaction: 'Була реакція', disliked: 'Не підійшло',
}

export const STATUS_DOT: Record<FoodStatus, string> = {
  new: 'bg-line', tried: 'bg-food', reaction: 'bg-sos', disliked: 'bg-muted',
}
