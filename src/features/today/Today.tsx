import type { Child } from '@/db/types'
import { formatAge, getAge } from '@/lib/age'
import { IconBottle, IconFood, IconSleep } from '@/ui/icons'
import { Card } from '@/ui/kit'
import { InstallHint } from './InstallHint'

function greeting(h = new Date().getHours()) {
  if (h < 5) return 'Доброї ночі'
  if (h < 12) return 'Доброго ранку'
  if (h < 18) return 'Доброго дня'
  return 'Доброго вечора'
}

const quick = [
  { label: 'Заснув', Icon: IconSleep, cls: 'bg-sleep-soft text-sleep' },
  { label: 'Груди / пляшечка', Icon: IconBottle, cls: 'bg-accent-soft text-accent' },
  { label: 'Прикорм', Icon: IconFood, cls: 'bg-food-soft text-food' },
]

export function Today({ child }: { child: Child }) {
  const age = getAge(child.birth_date)
  const corrected = child.preterm_weeks > 0 ? getAge(child.birth_date, child.preterm_weeks) : null

  return (
    <div className="space-y-4">
      <header>
        <p className="text-muted">{greeting()}!</p>
        <h1 className="text-2xl font-bold">{child.name}</h1>
      </header>

      <Card>
        <p className="text-sm text-muted">Вік</p>
        <p className="mt-0.5 text-2xl font-bold">{formatAge(age)}</p>
        {corrected && (
          <p className="mt-1 text-sm text-muted">Коригований вік: <b className="text-ink">{formatAge(corrected)}</b></p>
        )}
      </Card>

      <Card className="bg-sleep-soft border-transparent">
        <p className="text-sm text-muted">Наступний сон</p>
        <p className="mt-0.5 text-lg font-semibold">Прогноз з'явиться на кроці 2</p>
        <p className="mt-1 text-sm text-muted">Рахуватимемо за вікнами неспання для {age.months} міс.</p>
      </Card>

      <section>
        <h2 className="mb-2 font-semibold">Швидкий запис</h2>
        <div className="grid grid-cols-3 gap-2">
          {quick.map(({ label, Icon, cls }) => (
            <button key={label} disabled className={`flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-3xl p-2 text-sm font-semibold ${cls} disabled:opacity-60`}>
              <Icon width={28} height={28} />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Кнопки запрацюють на кроках 2–3.</p>
      </section>

      <InstallHint />

      <section>
        <h2 className="mb-2 font-semibold">Сьогодні</h2>
        <Card className="text-center text-muted">
          Тут буде стрічка дня: сни, годування, прикорм.
        </Card>
      </section>
    </div>
  )
}
