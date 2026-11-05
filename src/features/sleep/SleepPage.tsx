import { ComingSoon, PageTitle } from '@/ui/kit'

export function SleepPage() {
  return (
    <>
      <PageTitle sub="Журнал снів і вікна неспання">Сон</PageTitle>
      <ComingSoon stage="Крок 2" title="Трекер сну" items={[
        '«Заснув / Прокинувся» — таймер переживає закриття застосунку',
        'Прогноз «наступний сон близько ГГ:ХХ»',
        'Нічні пробудження, підсумок за добу і тиждень',
      ]} />
    </>
  )
}
