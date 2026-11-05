/**
 * Довідник продуктів для прикорму (ТЗ 3.2, сутність food).
 * ЧЕРНЕТКА ~40 позицій: загальні орієнтири, НЕ перевірено педіатром.
 * Порядок масиву = порядок пропозицій «що спробувати далі».
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

export type ChokingRisk = 'low' | 'medium' | 'high'

export interface Food {
  id: string
  name_uk: string
  emoji: string
  category: FoodCategory
  min_age_months: number
  /** Форма подачі від певного віку; беремо останній запис з from_m <= вік. */
  serving_by_age: { from_m: number; text: string }[]
  choking_risk: ChokingRisk
  allergen_code: AllergenCode | null
  note?: string
}

const f = (x: Food) => x

export const FOODS: Food[] = [
  // --- Перші овочі ---
  f({ id: 'zucchini', name_uk: 'Кабачок', emoji: '🥒', category: 'veg', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Пюре або м’які запечені бруски завбільшки з палець дорослого' }, { from_m: 9, text: 'М’які шматочки' }] }),
  f({ id: 'broccoli', name_uk: 'Броколі', emoji: '🥦', category: 'veg', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Пюре або великі м’які суцвіття «з ніжкою»' }, { from_m: 9, text: 'Дрібні м’які суцвіття' }] }),
  f({ id: 'cauliflower', name_uk: 'Цвітна капуста', emoji: '🥬', category: 'veg', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Пюре або великі м’які суцвіття' }, { from_m: 9, text: 'Дрібні м’які шматочки' }] }),
  f({ id: 'pumpkin', name_uk: 'Гарбуз', emoji: '🎃', category: 'veg', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Пюре або запечені м’які бруски' }, { from_m: 9, text: 'М’які кубики' }] }),
  f({ id: 'carrot', name_uk: 'Морква', emoji: '🥕', category: 'veg', min_age_months: 6, choking_risk: 'high', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Тільки варена до м’якості: пюре або м’які бруски. Сиру не давати' }, { from_m: 9, text: 'Варена, тонкі м’які палички або натерта' }],
    note: 'Сира морква — високий ризик поперхування' }),
  f({ id: 'sweet_potato', name_uk: 'Батат', emoji: '🍠', category: 'veg', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Пюре або запечені бруски' }, { from_m: 9, text: 'М’які кубики' }] }),
  f({ id: 'potato', name_uk: 'Картопля', emoji: '🥔', category: 'veg', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Пюре без солі або м’які бруски' }] }),
  f({ id: 'peas', name_uk: 'Зелений горошок', emoji: '🫛', category: 'veg', min_age_months: 6, choking_risk: 'medium', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Тільки пюре або розчавлений' }, { from_m: 9, text: 'Злегка розчавлений, по одній горошині під наглядом' }] }),
  f({ id: 'beet', name_uk: 'Буряк', emoji: '🟣', category: 'veg', min_age_months: 7, choking_risk: 'medium', allergen_code: null,
    serving_by_age: [{ from_m: 7, text: 'Варений: пюре або натертий' }, { from_m: 9, text: 'Варені м’які шматочки' }],
    note: 'Може забарвлювати сечу і стілець — це не реакція' }),
  f({ id: 'cucumber', name_uk: 'Огірок', emoji: '🥒', category: 'veg', min_age_months: 6, choking_risk: 'medium', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Великі бруски без шкірки для смоктання' }, { from_m: 9, text: 'Тонко натертий або тонкі соломки' }] }),

  // --- Каші ---
  f({ id: 'buckwheat', name_uk: 'Гречка', emoji: '🥣', category: 'grain', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Рідка каша, змелена' }, { from_m: 9, text: 'Густа каша, розварена' }] }),
  f({ id: 'oats', name_uk: 'Вівсянка', emoji: '🥣', category: 'grain', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Рідка каша на воді або грудному молоці' }, { from_m: 9, text: 'Густа каша, вівсяні оладки' }],
    note: 'Може містити сліди глютену' }),
  f({ id: 'rice', name_uk: 'Рис', emoji: '🍚', category: 'grain', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Розварена каша' }, { from_m: 9, text: 'Рисові кульки, розварений рис' }],
    note: 'Не варто давати щодня: чергуйте з іншими злаками' }),
  f({ id: 'corn_grits', name_uk: 'Кукурудзяна крупа', emoji: '🌽', category: 'grain', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Рідка каша' }, { from_m: 9, text: 'Густа каша або шматочки поленти' }] }),

  // --- Фрукти ---
  f({ id: 'apple', name_uk: 'Яблуко', emoji: '🍎', category: 'fruit', min_age_months: 6, choking_risk: 'high', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Запечене або тушковане: пюре чи м’які четвертинки. Сирими шматками не давати' }, { from_m: 9, text: 'Запечене шматочками або сире тонко натерте' }],
    note: 'Сирі тверді шматочки — високий ризик поперхування' }),
  f({ id: 'pear', name_uk: 'Груша', emoji: '🍐', category: 'fruit', min_age_months: 6, choking_risk: 'medium', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Дуже стигла — великі м’які бруски, або пюре' }, { from_m: 9, text: 'Стиглі м’які шматочки' }] }),
  f({ id: 'banana', name_uk: 'Банан', emoji: '🍌', category: 'fruit', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Половинка зі шкіркою знизу як «ручка» або пюре' }, { from_m: 9, text: 'Шматочки' }] }),
  f({ id: 'avocado', name_uk: 'Авокадо', emoji: '🥑', category: 'fruit', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Стиглі скибки (можна обваляти в меленій вівсянці) або пюре' }, { from_m: 9, text: 'Кубики' }] }),
  f({ id: 'plum', name_uk: 'Слива', emoji: '🟣', category: 'fruit', min_age_months: 6, choking_risk: 'medium', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Стигла, без кісточки і шкірки — пюре або половинки' }, { from_m: 9, text: 'Дрібні шматочки без кісточки' }] }),
  f({ id: 'peach', name_uk: 'Персик', emoji: '🍑', category: 'fruit', min_age_months: 6, choking_risk: 'medium', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Стиглий, без кісточки — великі скибки або пюре' }, { from_m: 9, text: 'Дрібні шматочки' }] }),
  f({ id: 'blueberry', name_uk: 'Лохина', emoji: '🫐', category: 'fruit', min_age_months: 6, choking_risk: 'high', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Тільки розчавлена або пюре. Цілою не давати' }, { from_m: 9, text: 'Розчавлена або розрізана навпіл' }] }),
  f({ id: 'raspberry', name_uk: 'Малина', emoji: '🍓', category: 'fruit', min_age_months: 7, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 7, text: 'Розчавлена або ціла м’яка ягода' }] }),
  f({ id: 'strawberry', name_uk: 'Полуниця', emoji: '🍓', category: 'fruit', min_age_months: 7, choking_risk: 'medium', allergen_code: null,
    serving_by_age: [{ from_m: 7, text: 'Велика ціла ягода для смоктання або розчавлена' }, { from_m: 9, text: 'Розрізана на четвертинки' }],
    note: 'Почервоніння навколо рота від кислих ягід буває і без алергії' }),
  f({ id: 'grape', name_uk: 'Виноград', emoji: '🍇', category: 'fruit', min_age_months: 8, choking_risk: 'high', allergen_code: null,
    serving_by_age: [{ from_m: 8, text: 'Тільки розрізаний на четвертинки вздовж, без кісточок. Цілим — ніколи' }],
    note: 'Цілий виноград — одна з найчастіших причин поперхування' }),
  f({ id: 'melon', name_uk: 'Диня', emoji: '🍈', category: 'fruit', min_age_months: 7, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 7, text: 'Стиглі скибки без шкірки' }, { from_m: 9, text: 'Дрібні м’які шматочки' }] }),

  // --- Білок ---
  f({ id: 'turkey', name_uk: 'Індичка', emoji: '🦃', category: 'protein', min_age_months: 6, choking_risk: 'medium', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Пюре або фарш у м’яких котлетках' }, { from_m: 9, text: 'Дрібно порізане м’яке м’ясо' }] }),
  f({ id: 'chicken', name_uk: 'Курка', emoji: '🍗', category: 'protein', min_age_months: 6, choking_risk: 'medium', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Пюре, фрикадельки або волокна стегна' }, { from_m: 9, text: 'Дрібно порізане м’яке м’ясо' }] }),
  f({ id: 'beef', name_uk: 'Яловичина', emoji: '🥩', category: 'protein', min_age_months: 6, choking_risk: 'medium', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Пюре або м’які котлетки з фаршу' }, { from_m: 9, text: 'Фарш, тушковане м’ясо дрібно' }],
    note: 'Добре джерело заліза' }),
  f({ id: 'rabbit', name_uk: 'Кролик', emoji: '🐇', category: 'protein', min_age_months: 6, choking_risk: 'medium', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Пюре або фарш' }, { from_m: 9, text: 'Дрібно порізане, без кісточок' }] }),
  f({ id: 'lentils', name_uk: 'Сочевиця', emoji: '🫘', category: 'protein', min_age_months: 6, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 6, text: 'Розварене пюре (червона сочевиця)' }, { from_m: 9, text: 'Розварена, у котлетках' }] }),
  f({ id: 'beans', name_uk: 'Квасоля', emoji: '🫘', category: 'protein', min_age_months: 7, choking_risk: 'medium', allergen_code: null,
    serving_by_age: [{ from_m: 7, text: 'Розварена і розчавлена' }, { from_m: 9, text: 'Розчавлена, по одній під наглядом' }] }),

  // --- Основні алергени (ТЗ 3.2) ---
  f({ id: 'egg', name_uk: 'Яйце', emoji: '🥚', category: 'protein', min_age_months: 6, choking_risk: 'low', allergen_code: 'egg',
    serving_by_age: [{ from_m: 6, text: 'Повністю зварене: розім’ятий жовток і білок, омлет смужками' }, { from_m: 9, text: 'Омлет або варене яйце шматочками' }],
    note: 'Тільки повністю приготоване' }),
  f({ id: 'peanut', name_uk: 'Арахісова паста', emoji: '🥜', category: 'other', min_age_months: 6, choking_risk: 'high', allergen_code: 'peanut',
    serving_by_age: [{ from_m: 6, text: 'Тонкий шар пасти, розведеної водою або в каші. Цілі горіхи і густу пасту ложкою — ні' }],
    note: 'Цілі горіхи — не раніше 5 років' }),
  f({ id: 'yogurt', name_uk: 'Йогурт натуральний', emoji: '🥛', category: 'dairy', min_age_months: 6, choking_risk: 'low', allergen_code: 'milk',
    serving_by_age: [{ from_m: 6, text: 'Без цукру, з ложки або в каші' }],
    note: 'Коров’яче молоко як напій — після 12 міс' }),
  f({ id: 'cottage_cheese', name_uk: 'Кисломолочний сир', emoji: '🧀', category: 'dairy', min_age_months: 6, choking_risk: 'low', allergen_code: 'milk',
    serving_by_age: [{ from_m: 6, text: 'М’який, розтертий, у невеликій кількості' }] }),
  f({ id: 'wheat', name_uk: 'Пшениця (манка, хліб, макарони)', emoji: '🌾', category: 'grain', min_age_months: 6, choking_risk: 'medium', allergen_code: 'wheat',
    serving_by_age: [{ from_m: 6, text: 'Манна каша або розварені дрібні макарони' }, { from_m: 9, text: 'Підсушений тост смужками, макарони' }] }),
  f({ id: 'fish', name_uk: 'Риба (тріска, лосось)', emoji: '🐟', category: 'protein', min_age_months: 6, choking_risk: 'medium', allergen_code: 'fish',
    serving_by_age: [{ from_m: 6, text: 'Пюре або м’які пластівці. Ретельно перевірити кістки' }, { from_m: 9, text: 'Пластівці, рибні котлетки' }] }),
  f({ id: 'tofu', name_uk: 'Тофу', emoji: '🧈', category: 'protein', min_age_months: 6, choking_risk: 'low', allergen_code: 'soy',
    serving_by_age: [{ from_m: 6, text: 'Твердий тофу брусками, злегка обсмажений, або розім’ятий' }, { from_m: 9, text: 'Кубики' }] }),
  f({ id: 'sesame', name_uk: 'Тахіні (кунжутна паста)', emoji: '⚪', category: 'other', min_age_months: 6, choking_risk: 'medium', allergen_code: 'sesame',
    serving_by_age: [{ from_m: 6, text: 'Тонкий шар або кілька крапель у пюре / каші' }] }),
  f({ id: 'almond', name_uk: 'Мигдалева паста', emoji: '🌰', category: 'other', min_age_months: 6, choking_risk: 'high', allergen_code: 'tree_nuts',
    serving_by_age: [{ from_m: 6, text: 'Розведена паста або мелений мигдаль у каші. Цілі горіхи — ні' }] }),
  f({ id: 'shrimp', name_uk: 'Креветки', emoji: '🦐', category: 'protein', min_age_months: 7, choking_risk: 'high', allergen_code: 'shellfish',
    serving_by_age: [{ from_m: 7, text: 'Добре приготовані, дрібно порубані або в котлетках' }, { from_m: 9, text: 'Дрібні шматочки' }] }),

  // --- Не раніше 12 міс ---
  f({ id: 'honey', name_uk: 'Мед', emoji: '🍯', category: 'other', min_age_months: 12, choking_risk: 'low', allergen_code: null,
    serving_by_age: [{ from_m: 12, text: 'У невеликій кількості' }],
    note: 'До 12 міс не давати навіть у випічці — ризик ботулізму' }),
]

export const FOOD_BY_ID = new Map(FOODS.map((x) => [x.id, x]))

export function servingFor(food: Food, ageMonths: number) {
  const list = food.serving_by_age.filter((s) => s.from_m <= ageMonths)
  return (list[list.length - 1] ?? food.serving_by_age[0]).text
}

export const CHOKING_LABEL: Record<ChokingRisk, string> = {
  low: 'Низький ризик поперхування', medium: 'Середній ризик — подавайте як описано', high: 'Високий ризик — лише правильна форма подачі',
}
