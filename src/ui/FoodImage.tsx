import type { Food } from '@/data/foods'
import { FOOD_PHOTOS } from '@/data/foodPhotos'

/** Картинка продукту: фото (якщо є) або великий емодзі на мʼякій плитці. Мінімалістично, без рамок. */
export function FoodImage({ food, size = 48, className = '' }: { food: Food | undefined; size?: number; className?: string }) {
  const photo = !!food && FOOD_PHOTOS.has(food.id)
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[30%] bg-bg ${className}`}
      style={{ width: size, height: size }}>
      {photo
        ? <img src={`${import.meta.env.BASE_URL}foods/${food!.id}.webp`} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        : <span style={{ fontSize: Math.round(size * 0.58), lineHeight: 1 }}>{food?.emoji ?? '🍽️'}</span>}
    </span>
  )
}
