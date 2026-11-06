import type { ItchLevel, SkinSign, SkinTrigger, SkinZone } from '@/db/types'

/**
 * Довідник модуля «Шкіра»: лише варіанти для запису спостережень.
 * Без порад, ліків, доз і діагностики.
 */

export const ITCH_LABEL: Record<ItchLevel, string> = { 0: 'Немає', 1: 'Легкий', 2: 'Сильний', 3: 'Дуже' }
export const ITCH_LONG: Record<ItchLevel, string> = { 0: 'немає', 1: 'легкий', 2: 'сильний', 3: 'дуже сильний' }

export const ZONES: { value: SkinZone; label: string }[] = [
  { value: 'face', label: 'Обличчя' }, { value: 'scalp', label: 'Голова' }, { value: 'neck', label: 'Шия' },
  { value: 'elbows', label: 'Згини ліктів' }, { value: 'knees', label: 'Під колінами' }, { value: 'torso', label: 'Тулуб' },
  { value: 'arms', label: 'Руки' }, { value: 'legs', label: 'Ноги' }, { value: 'bottom', label: 'Сідниці' },
]

export const SIGNS: { value: SkinSign; label: string }[] = [
  { value: 'dry', label: 'Сухість, лущення' }, { value: 'red', label: 'Почервоніння' },
  { value: 'bumps', label: 'Висипання, горбики' }, { value: 'wet', label: 'Мокнуття' }, { value: 'crusts', label: 'Кірочки' },
]

export const TRIGGERS: { value: SkinTrigger; label: string }[] = [
  { value: 'new_food', label: 'Новий продукт' }, { value: 'detergent', label: 'Новий пральний засіб' },
  { value: 'cosmetics', label: 'Нова косметика' }, { value: 'overheat', label: 'Перегрів, пітливість' },
  { value: 'fabric', label: 'Вовна, синтетика' }, { value: 'teeth', label: 'Зуби, слина' },
  { value: 'illness', label: 'Хворіє' }, { value: 'pets', label: 'Тварини' }, { value: 'dust', label: 'Пил' },
  { value: 'weather', label: 'Мороз, вітер, сухе повітря' },
]

export const labelOf = <T extends string>(list: { value: T; label: string }[], v: T) => list.find((x) => x.value === v)?.label ?? v
