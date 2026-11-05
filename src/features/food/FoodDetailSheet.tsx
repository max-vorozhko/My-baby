import type { Child } from '@/db/types'
import { CATEGORY_LABEL, CHOKING_LABEL, FOOD_BY_ID, servingFor, ALLERGENS } from '@/data/foods'
import { useIntros } from '@/db/hooks'
import { startIntro } from '@/db/actions'
import { getAge } from '@/lib/age'
import { activeObservation, latestIntros, statusOf } from '@/lib/food'
import { Sheet } from '@/ui/Sheet'
import { Button } from '@/ui/kit'
import { STATUS_CLS, STATUS_LABEL } from './status'
import { Disclaimer } from '@/ui/Disclaimer'

export function FoodDetailSheet({
  child, foodId, onClose, onReaction, onMeal,
}: {
  child: Child; foodId: string | null; onClose: () => void
  onReaction: (foodId: string) => void; onMeal: (foodId: string) => void
}) {
  const intros = useIntros(child.id) ?? []
  const food = foodId ? FOOD_BY_ID.get(foodId) : undefined
  if (!food) return null
  const age = getAge(child.birth_date, child.preterm_weeks).months
  const latest = latestIntros(intros)
  const status = statusOf(food.id, latest)
  const active = activeObservation(intros)
  const tooYoung = age < food.min_age_months
  const blocked = active && active.food_id !== food.id
  const allergen = food.allergen_code ? ALLERGENS.find((a) => a.code === food.allergen_code) : null
  const canStart = (status === 'new' || status === 'postponed') && !tooYoung && !blocked

  const start = async () => { await startIntro(child.id, food.id); onClose() }

  return (
    <Sheet open onClose={onClose} title={`${food.emoji} ${food.name_uk}`}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className={`rounded-full border px-3 py-1 ${STATUS_CLS[status]}`}>{STATUS_LABEL[status]}</span>
          <span className="rounded-full border border-line px-3 py-1 text-muted">{CATEGORY_LABEL[food.category]}</span>
          <span className="rounded-full border border-line px-3 py-1 text-muted">з {food.min_age_months} міс</span>
          {allergen && <span className="rounded-full border border-sos px-3 py-1">Алерген: {allergen.name}</span>}
        </div>

        <div className="rounded-3xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Як подавати у {age} міс</p>
          <p className="mt-1">{servingFor(food, age)}</p>
          <p className={`mt-3 text-sm ${food.choking_risk === 'high' ? 'font-semibold text-sos' : 'text-muted'}`}>
            {CHOKING_LABEL[food.choking_risk]}
          </p>
          {food.note && <p className="mt-2 text-sm text-muted">{food.note}</p>}
        </div>

        {tooYoung && <p className="text-sm text-muted">Рекомендовано з {food.min_age_months} міс.</p>}
        {blocked && (status === 'new' || status === 'postponed') && (
          <p className="text-sm text-muted">Спершу завершіть спостереження за «{FOOD_BY_ID.get(active!.food_id)?.name_uk}». Нові продукти — по одному раз на 3 дні.</p>
        )}

        <div className="space-y-2">
          {canStart && <Button className="w-full" onClick={start}>Почати вводити · 3 дні спостереження</Button>}
          {(status === 'introduced' || status === 'observing') && (
            <Button className="w-full" variant={canStart ? 'secondary' : 'primary'} onClick={() => onMeal(food.id)}>Записати в прийом їжі</Button>
          )}
          {status !== 'new' && (
            <Button className="w-full" variant="secondary" onClick={() => onReaction(food.id)}>Записати реакцію</Button>
          )}
        </div>
        <Disclaimer compact />
      </div>
    </Sheet>
  )
}
