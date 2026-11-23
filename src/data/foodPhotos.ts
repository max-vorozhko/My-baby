/**
 * Продукти, для яких є фото в public/foods/<id>.webp (256×256, кремовий фон; готує scripts/food-photos.py).
 * Решта показується емодзі на мʼякій плитці — додали файл, дописали id сюди.
 */
export const FOOD_PHOTOS = new Set<string>([
  'zucchini', 'broccoli', 'cauliflower', 'pumpkin', 'carrot',
  'sweet_potato', 'potato', 'peas', 'beet', 'cucumber',
])
