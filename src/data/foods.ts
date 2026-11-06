/**
 * Довідник продуктів — лише назви для швидкого запису (без вікових рамок,
 * способів подачі і порад: застосунок — щоденник, а не порадник).
 * Батьки можуть додавати власні продукти (таблиця customFoods).
 */

export type AllergenCode =
  | 'egg' | 'peanut' | 'milk' | 'wheat' | 'fish' | 'shellfish' | 'soy' | 'tree_nuts' | 'sesame'

export const ALLERGENS: { code: AllergenCode; name: string; emoji: string }[] = [
  { code: 'egg', name: 'Яйце', emoji: '🥚' },
  { code: 'peanut', name: 'Арахіс', emoji: '🥜' },
  { code: 'milk', name: 'Молоко', emoji: '🥛' },
  { code: 'wheat', name: 'Пшениця', emoji: '🌾' },
  { code: 'fish', name: 'Риба', emoji: '🐟' },
  { code: 'shellfish', name: 'Ракоподібні', emoji: '🦐' },
  { code: 'soy', name: 'Соя', emoji: '🫘' },
  { code: 'tree_nuts', name: 'Горіхи', emoji: '🌰' },
  { code: 'sesame', name: 'Кунжут', emoji: '⚪' },
]

export type FoodCategory = 'veg' | 'fruit' | 'grain' | 'protein' | 'dairy' | 'other'

export const CATEGORY_LABEL: Record<FoodCategory, string> = {
  veg: 'Овочі', fruit: 'Фрукти і ягоди', grain: 'Каші і злаки', protein: "М'ясо, риба, бобові", dairy: 'Молочне', other: 'Інше',
}

export interface Food {
  id: string
  name_uk: string
  emoji: string
  category: FoodCategory
  allergen_code: AllergenCode | null
  custom?: boolean
}

type Row = [id: string, name: string, emoji: string, allergen?: AllergenCode]
const group = (category: FoodCategory, rows: Row[]): Food[] =>
  rows.map(([id, name_uk, emoji, allergen]) => ({ id, name_uk, emoji, category, allergen_code: allergen ?? null }))

export const BUILTIN_FOODS: Food[] = [
  ...group('veg', [
    ['zucchini', 'Кабачок', '🥒'], ['broccoli', 'Броколі', '🥦'], ['cauliflower', 'Цвітна капуста', '🥬'],
    ['pumpkin', 'Гарбуз', '🎃'], ['carrot', 'Морква', '🥕'], ['sweet_potato', 'Батат', '🍠'], ['potato', 'Картопля', '🥔'],
    ['peas', 'Зелений горошок', '🫛'], ['beet', 'Буряк', '🟣'], ['cucumber', 'Огірок', '🥒'],
  ]),
  ...group('grain', [
    ['buckwheat', 'Гречка', '🥣'], ['oats', 'Вівсянка', '🥣'], ['rice', 'Рис', '🍚'], ['corn_grits', 'Кукурудзяна крупа', '🌽'],
    ['wheat', 'Пшениця (манка, хліб, макарони)', '🌾', 'wheat'],
  ]),
  ...group('fruit', [
    ['apple', 'Яблуко', '🍎'], ['pear', 'Груша', '🍐'], ['banana', 'Банан', '🍌'], ['avocado', 'Авокадо', '🥑'],
    ['plum', 'Слива', '🫐'], ['peach', 'Персик', '🍑'], ['blueberry', 'Лохина', '🫐'], ['raspberry', 'Малина', '🍓'],
    ['strawberry', 'Полуниця', '🍓'], ['grape', 'Виноград', '🍇'], ['melon', 'Диня', '🍈'],
  ]),
  ...group('protein', [
    ['turkey', 'Індичка', '🦃'], ['chicken', 'Курка', '🍗'], ['beef', 'Яловичина', '🥩'], ['rabbit', 'Кролик', '🐇'],
    ['lentils', 'Сочевиця', '🫘'], ['beans', 'Квасоля', '🫘'], ['egg', 'Яйце', '🥚', 'egg'],
    ['fish', 'Риба', '🐟', 'fish'], ['tofu', 'Тофу', '🧈', 'soy'], ['shrimp', 'Креветки', '🦐', 'shellfish'],
  ]),
  ...group('dairy', [
    ['yogurt', 'Йогурт', '🥛', 'milk'], ['cottage_cheese', 'Кисломолочний сир', '🧀', 'milk'],
  ]),
  ...group('other', [
    ['peanut', 'Арахісова паста', '🥜', 'peanut'], ['sesame', 'Тахіні (кунжут)', '⚪', 'sesame'],
    ['almond', 'Мигдалева паста', '🌰', 'tree_nuts'],
  ]),
]

// ---- Реєстр: вбудовані + власні продукти сім'ї ----
let custom: Food[] = []
let byId = new Map(BUILTIN_FOODS.map((f) => [f.id, f]))

/** Викликається з App, коли змінюється таблиця customFoods. */
export function setCustomFoods(list: Food[]) {
  custom = list
  byId = new Map([...BUILTIN_FOODS, ...custom].map((f) => [f.id, f]))
}

export const allFoods = () => [...BUILTIN_FOODS, ...custom]
export const getFood = (id: string) => byId.get(id)
export const foodName = (id: string) => byId.get(id)?.name_uk ?? 'Продукт'
