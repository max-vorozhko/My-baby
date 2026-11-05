import { ComingSoon, PageTitle } from '@/ui/kit'

export function FoodPage() {
  return (
    <>
      <PageTitle sub="Прикорм, алергени і молоко">Їжа</PageTitle>
      <div className="space-y-3">
        <ComingSoon stage="Крок 2" title="Груди / пляшечка" items={['Таймер грудей (ліва / права)', 'Пляшечка: суміш або зціджене, мл']} />
        <ComingSoon stage="Крок 3" title="Прикорм" items={[
          'База продуктів з формою подачі за віком',
          'Новий продукт → 3 дні спостереження',
          'Журнал реакцій і 9 основних алергенів',
          '«Що вже пробували»',
        ]} />
      </div>
    </>
  )
}
