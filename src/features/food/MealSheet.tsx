import { useEffect, useState } from 'react'
import type { Child, MealItem } from '@/db/types'
import { FOOD_BY_ID } from '@/data/foods'
import { useIntros, useMealsSince } from '@/db/hooks'
import { addMeal } from '@/db/actions'
import { mealCandidates } from '@/lib/food'
import { DAY_MS } from '@/lib/time'
import { Sheet } from '@/ui/Sheet'
import { Button } from '@/ui/kit'

/** Швидкий запис прийому їжі (ТЗ 3.2): що, скільки ложок, сподобалось чи ні. */
export function MealSheet({ child, open, preselect, onClose, onBrowse }: {
  child: Child; open: boolean; preselect?: string | null; onClose: () => void; onBrowse: () => void
}) {
  const intros = useIntros(child.id) ?? []
  const [since] = useState(() => Date.now() - 14 * DAY_MS)
  const meals = useMealsSince(child.id, since)
  const [items, setItems] = useState<MealItem[]>([])

  useEffect(() => {
    if (open) setItems(preselect ? [{ food_id: preselect, amount: 2, unit: 'spoon', liked: null }] : [])
  }, [open, preselect])

  // Нещодавні — першими.
  const recency = new Map<string, string>()
  for (const m of meals) for (const it of m.items) if ((recency.get(it.food_id) ?? '') < m.at) recency.set(it.food_id, m.at)
  const candidates = mealCandidates(intros).sort((a, b) => (recency.get(b.id) ?? '').localeCompare(recency.get(a.id) ?? ''))

  const toggle = (id: string) => setItems((prev) =>
    prev.some((i) => i.food_id === id) ? prev.filter((i) => i.food_id !== id) : [...prev, { food_id: id, amount: 2, unit: 'spoon', liked: null }])
  const patch = (id: string, p: Partial<MealItem>) => setItems((prev) => prev.map((i) => (i.food_id === id ? { ...i, ...p } : i)))

  const save = async () => { await addMeal(child.id, items); onClose() }

  return (
    <Sheet open={open} onClose={onClose} title="Прийом їжі">
      {candidates.length === 0 ? (
        <div className="space-y-3">
          <p className="text-muted">Ще немає введених продуктів. Почніть з одного — і за 3 дні він з'явиться тут.</p>
          <Button className="w-full" onClick={onBrowse}>Обрати перший продукт</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {candidates.map((f) => {
              const on = items.some((i) => i.food_id === f.id)
              return (
                <button key={f.id} onClick={() => toggle(f.id)}
                  className={`min-h-12 rounded-2xl border px-3 font-medium ${on ? 'border-food bg-food-soft' : 'border-line bg-surface'}`}>
                  {f.emoji} {f.name_uk}
                </button>
              )
            })}
          </div>

          {items.length > 0 && (
            <ul className="space-y-2">
              {items.map((it) => {
                const f = FOOD_BY_ID.get(it.food_id)!
                return (
                  <li key={it.food_id} className="rounded-2xl border border-line bg-surface p-3">
                    <p className="font-semibold">{f.emoji} {f.name_uk}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button aria-label="Менше" onClick={() => patch(it.food_id, { amount: Math.max(0, (it.amount ?? 0) - 1) })} className="h-12 w-12 rounded-xl border border-line text-xl">−</button>
                      <span className="w-20 text-center tabular-nums">{it.amount ?? 0} лож.</span>
                      <button aria-label="Більше" onClick={() => patch(it.food_id, { amount: (it.amount ?? 0) + 1 })} className="h-12 w-12 rounded-xl border border-line text-xl">+</button>
                      <span className="flex-1" />
                      <button aria-label="Сподобалось" onClick={() => patch(it.food_id, { liked: it.liked === true ? null : true })}
                        className={`h-12 w-12 rounded-xl border text-xl ${it.liked === true ? 'border-food bg-food-soft' : 'border-line'}`}>👍</button>
                      <button aria-label="Не сподобалось" onClick={() => patch(it.food_id, { liked: it.liked === false ? null : false })}
                        className={`h-12 w-12 rounded-xl border text-xl ${it.liked === false ? 'border-accent bg-accent-soft' : 'border-line'}`}>👎</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <Button className="w-full" disabled={items.length === 0} onClick={save}>Записати</Button>
          <button className="min-h-12 w-full text-sm text-accent" onClick={onBrowse}>Спробувати новий продукт →</button>
        </div>
      )}
    </Sheet>
  )
}
