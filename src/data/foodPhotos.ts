/**
 * Продукти, для яких є фото в public/foods/<id>.webp (256×256, кремовий фон; готує scripts/food-photos.py).
 * Решта показується емодзі на мʼякій плитці — додали файл, дописали id сюди.
 */
export const FOOD_PHOTOS = new Set<string>([
  'zucchini', 'broccoli', 'cauliflower', 'pumpkin', 'carrot',
  'sweet_potato', 'potato', 'peas', 'beet', 'cucumber',
  'buckwheat', 'oats', 'rice', 'corn_grits', 'wheat',
  'apple', 'pear', 'banana', 'avocado', 'plum',
  'peach', 'blueberry', 'raspberry', 'strawberry', 'grape',
  'melon', 'turkey', 'chicken', 'beef', 'rabbit',
  'lentils', 'beans', 'egg', 'fish', 'tofu',
])
