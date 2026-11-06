/**
 * Модель даних (ТЗ, розділ 5). Усі записи готові до майбутньої синхронізації
 * з Supabase: UUID генерується на клієнті, час — ISO-рядок в UTC,
 * м'яке видалення через deleted_at.
 */

export type ISODateTime = string // 2026-11-05T18:30:00.000Z
export type ISODate = string // 2026-11-05

export interface BaseRecord {
  id: string
  family_id: string
  created_by: string
  created_at: ISODateTime
  updated_at: ISODateTime
  deleted_at: ISODateTime | null
}

export interface Family {
  id: string
  name: string
  created_at: ISODateTime
}

export type Role = 'parent' | 'caregiver'

export interface Member {
  id: string
  family_id: string
  user_id: string
  display_name: string
  role: Role
}

export type Sex = 'girl' | 'boy'

export interface Child extends BaseRecord {
  name: string
  birth_date: ISODate
  sex: Sex | null
  /** На скільки тижнів раніше народився (0 — вчасно). Для коригованого віку. */
  preterm_weeks: number
  photo: Blob | null
  /** Модуль «Шкіра» (суха шкіра / атопічний дерматит) увімкнено. */
  skin_module?: boolean
}

export type SleepKind = 'nap' | 'night'

export interface Sleep extends BaseRecord {
  child_id: string
  start_at: ISODateTime
  /** null — дитина зараз спить. На дитину допускається лише один активний сон. */
  end_at: ISODateTime | null
  kind: SleepKind
  wake_ups: number
  note: string
}

export type BreastSide = 'left' | 'right' | 'both'
export type BottleContent = 'formula' | 'breast_milk'

/** Груди / пляшечка (додано до MVP). */
export interface Feeding extends BaseRecord {
  child_id: string
  kind: 'breast' | 'bottle'
  start_at: ISODateTime
  end_at: ISODateTime | null
  side: BreastSide | null
  bottle_content: BottleContent | null
  amount_ml: number | null
  note: string
}

export type FoodIntroStatus = 'observing' | 'introduced' | 'reaction' | 'postponed'

export interface FoodIntro extends BaseRecord {
  child_id: string
  food_id: string
  started_at: ISODateTime
  /** started_at + 3 доби. Поки не минуло — новий продукт не пропонуємо. */
  observe_until: ISODateTime
  status: FoodIntroStatus
}

export type ReactionType = 'rash' | 'tummy' | 'stool' | 'vomit' | 'other'

export interface Reaction extends BaseRecord {
  child_id: string
  food_id: string | null
  type: ReactionType
  severity: 1 | 2 | 3
  photo: Blob | null
  at: ISODateTime
  note: string
}

export interface MealItem {
  food_id: string
  amount: number | null
  unit: 'spoon' | 'g' | 'piece' | null
  liked: boolean | null
}

export interface Meal extends BaseRecord {
  child_id: string
  at: ISODateTime
  items: MealItem[]
  note: string
}

export type ItchLevel = 0 | 1 | 2 | 3
export type SkinZone = 'face' | 'neck' | 'elbows' | 'knees' | 'torso' | 'arms' | 'legs' | 'bottom' | 'scalp'
export type SkinSign = 'dry' | 'red' | 'wet' | 'crusts' | 'bumps'
export type SkinTrigger =
  | 'new_food' | 'detergent' | 'cosmetics' | 'overheat' | 'fabric' | 'teeth' | 'illness' | 'pets' | 'dust' | 'weather'

/** Щоденний огляд шкіри: один запис на дитину на календарний день. */
export interface SkinCheck extends BaseRecord {
  child_id: string
  date: ISODate
  itch: ItchLevel
  zones: SkinZone[]
  signs: SkinSign[]
  triggers: SkinTrigger[]
  photo: Blob | null
  note: string
}

export type SkinCareKind = 'emollient' | 'bath' | 'prescribed'

/** Догляд: крем-емолент, купання, засіб, призначений лікарем (лише назва — без доз). */
export interface SkinCare extends BaseRecord {
  child_id: string
  at: ISODateTime
  kind: SkinCareKind
  product: string
  note: string
}

/** Власний продукт сім'ї (доповнює вбудований довідник). */
export interface CustomFood extends BaseRecord {
  name_uk: string
  emoji: string
  category: 'veg' | 'fruit' | 'grain' | 'protein' | 'dairy' | 'other'
  allergen_code: string | null
}

export interface Setting {
  key: string
  value: unknown
}
