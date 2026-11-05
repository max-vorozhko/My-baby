import type { Child } from '@/db/types'
import { FOOD_BY_ID } from '@/data/foods'
import { useIntros } from '@/db/hooks'
import { resolveIntro } from '@/db/actions'
import { activeObservation, observationProgress, OBSERVE_DAYS, suggestNext } from '@/lib/food'
import { getAge } from '@/lib/age'
import { formatDuration, useNow } from '@/lib/time'
import { Card } from '@/ui/kit'

/** Активне спостереження або пропозиції «що спробувати далі». */
export function ObservationCard({ child, onReaction, onFood }: {
  child: Child; onReaction: (foodId: string) => void; onFood: (foodId: string) => void
}) {
  const now = useNow(60_000)
  const intros = useIntros(child.id)
  if (!intros) return null
  const active = activeObservation(intros)

  if (active) {
    const food = FOOD_BY_ID.get(active.food_id)
    const p = observationProgress(active, now)
    return (
      <section className="rounded-3xl border-2 border-accent bg-accent-soft p-4">
        <p className="text-sm text-muted">Вводимо новий продукт</p>
        <p className="mt-0.5 text-xl font-bold">{food?.emoji} {food?.name_uk}</p>
        <div className="mt-3 flex gap-1.5" aria-label={`День ${p.day} з ${OBSERVE_DAYS}`}>
          {Array.from({ length: OBSERVE_DAYS }, (_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i < p.day ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
        {p.done ? (
          <>
            <p className="mt-3 font-semibold">3 дні минули. Як пройшло?</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button onClick={() => resolveIntro(active.id, 'introduced')} className="min-h-12 rounded-2xl bg-food font-bold text-white dark:text-bg">Введено</button>
              <button onClick={() => onReaction(active.food_id)} className="min-h-12 rounded-2xl border border-sos bg-surface font-semibold">Реакція</button>
              <button onClick={() => resolveIntro(active.id, 'postponed')} className="min-h-12 rounded-2xl border border-line bg-surface font-semibold">Відкласти</button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm">
              День {p.day} з {OBSERVE_DAYS}. Давайте цей продукт і слідкуйте за шкірою, животиком і стільцем. Залишилось {formatDuration(p.leftMs)}.
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => onReaction(active.food_id)} className="min-h-12 flex-1 rounded-2xl border border-sos bg-surface font-semibold">Помітили реакцію</button>
              <button onClick={() => resolveIntro(active.id, 'postponed')} className="min-h-12 rounded-2xl border border-line bg-surface px-4 font-semibold">Відкласти</button>
            </div>
          </>
        )}
      </section>
    )
  }

  const age = getAge(child.birth_date, child.preterm_weeks).months
  const next = suggestNext(intros, age)
  if (next.length === 0) return null
  return (
    <Card>
      <p className="font-semibold">Що спробувати далі</p>
      <p className="mt-0.5 text-sm text-muted">Один новий продукт раз на 3 дні.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {next.map((f) => (
          <button key={f.id} onClick={() => onFood(f.id)} className="flex min-h-20 flex-col items-center justify-center rounded-2xl border border-line bg-bg p-2 text-sm font-semibold">
            <span className="text-2xl">{f.emoji}</span>{f.name_uk}
          </button>
        ))}
      </div>
    </Card>
  )
}
