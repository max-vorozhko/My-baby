import type { Child } from '@/db/types'
import { ALLERGENS, CATEGORY_LABEL, getFood } from '@/data/foods'
import { useMarks, useMealsSince } from '@/db/hooks'
import { setFoodMark } from '@/db/actions'
import { foodStats, latestMarks, statusOf, type FoodStatus } from '@/lib/food'
import { daysWord } from '@/lib/age'
import { DAY_MS } from '@/lib/time'
import { Sheet } from '@/ui/Sheet'
import { Button, Segmented, Stat } from '@/ui/kit'
import { STATUS_DOT, STATUS_LABEL } from './status'

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })

/** Картка продукту: лише факти з записів + позначка батьків. */
export function FoodDetailSheet({ child, foodId, onClose, onReaction, onMeal }: {
  child: Child; foodId: string | null; onClose: () => void
  onReaction: (foodId: string) => void; onMeal: (foodId: string) => void
}) {
  const meals = useMealsSince(child.id, 0)
  const marks = useMarks(child.id) ?? []
  const food = foodId ? getFood(foodId) : undefined
  if (!food) return null
  const ever = foodStats(meals)
  const st = ever.get(food.id)
  const status = statusOf(food.id, latestMarks(marks), ever)
  const allergen = food.allergen_code ? ALLERGENS.find((a) => a.code === food.allergen_code) : null
  const days = st ? Math.floor((Date.now() - st.first) / DAY_MS) : 0

  const mark = (s: FoodStatus) => {
    if (s === 'tried') return setFoodMark(child.id, food.id, 'introduced')
    if (s === 'reaction') return setFoodMark(child.id, food.id, 'reaction')
    if (s === 'disliked') return setFoodMark(child.id, food.id, 'postponed')
  }

  return (
    <Sheet open onClose={onClose} title={`${food.emoji} ${food.name_uk}`}>
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm text-muted">
          <i className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} /> {STATUS_LABEL[status]}
          <span>· {CATEGORY_LABEL[food.category]}</span>
          {allergen && <span>· алерген: {allergen.name.toLowerCase()}</span>}
        </p>

        {st ? (
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-line bg-surface p-4">
            <Stat value={st.count} label={st.count === 1 ? 'раз давали' : st.count % 10 >= 2 && st.count % 10 <= 4 && (st.count % 100 < 12 || st.count % 100 > 14) ? 'рази давали' : 'разів давали'} />
            <Stat value={fmtDate(st.first)} label={`перша проба · ${days} ${daysWord(days)}`} />
            <Stat value={st.liked || st.disliked ? `${st.liked}/${st.disliked}` : '—'} label="👍 / 👎" />
          </div>
        ) : (
          <p className="text-sm text-muted">Ще не записували.</p>
        )}

        {status !== 'new' && (
          <div>
            <p className="mb-1.5 text-sm text-muted">Ваша позначка</p>
            <Segmented<FoodStatus> value={status} onChange={mark} options={[
              { value: 'tried', label: 'Ок' }, { value: 'disliked', label: 'Не підійшло' }, { value: 'reaction', label: 'Реакція' },
            ]} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => onMeal(food.id)}>Записати</Button>
          <Button variant="secondary" onClick={() => onReaction(food.id)}>Реакція</Button>
        </div>
      </div>
    </Sheet>
  )
}
