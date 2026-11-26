import { useEffect, useMemo, useState } from 'react'
import type { Child, MealItem } from '@/db/types'
import { allFoods, getFood } from '@/data/foods'
import { useMealsSince } from '@/db/hooks'
import { addCustomFood, addMeal } from '@/db/actions'
import { foodStats } from '@/lib/food'
import { Sheet } from '@/ui/Sheet'
import { Button, inputCls } from '@/ui/kit'
import { FoodImage } from '@/ui/FoodImage'

/** Запис прийому їжі: нещодавні продукти зверху, пошук, свій продукт. */
export function MealSheet({ child, open, preselect, onClose }: {
  child: Child; open: boolean; preselect?: string | null; onClose: () => void
}) {
  const meals = useMealsSince(child.id, 0)
  const [items, setItems] = useState<MealItem[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    if (open) { setItems(preselect ? [{ food_id: preselect, amount: 2, unit: 'spoon', liked: null }] : []); setQ('') }
  }, [open, preselect])

  const ever = useMemo(() => foodStats(meals), [meals])
  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    const foods = allFoods().filter((f) => !query || f.name_uk.toLowerCase().includes(query))
    return foods.sort((a, b) => (ever.get(b.id)?.last ?? 0) - (ever.get(a.id)?.last ?? 0))
  }, [q, ever])

  const has = (id: string) => items.some((i) => i.food_id === id)
  const toggle = (id: string) => setItems((p) => has(id) ? p.filter((i) => i.food_id !== id) : [...p, { food_id: id, amount: 2, unit: 'spoon', liked: null }])
  const patch = (id: string, x: Partial<MealItem>) => setItems((p) => p.map((i) => (i.food_id === id ? { ...i, ...x } : i)))
  const addOwn = async () => { const f = await addCustomFood(q); setQ(''); toggle(f.id) }
  const save = async () => { await addMeal(child.id, items); onClose() }
  const exact = list.some((f) => f.name_uk.toLowerCase() === q.trim().toLowerCase())

  return (
    <Sheet open={open} onClose={onClose} title="Прикорм">
      <div className="space-y-3">
        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((it) => {
              const f = getFood(it.food_id)
              return (
                <li key={it.food_id} className="flex items-center gap-2 rounded-3xl bg-surface shadow-soft p-2 pl-3">
                  <FoodImage food={f} size={40} />
                  <span className="flex-1 truncate font-medium">{f?.name_uk}</span>
                  <button aria-label="Менше" onClick={() => patch(it.food_id, { amount: Math.max(0, (it.amount ?? 0) - 1) })} className="h-11 w-11 rounded-xl text-xl text-muted">−</button>
                  <span className="w-12 text-center text-sm tabular-nums">{it.amount ?? 0} лож.</span>
                  <button aria-label="Більше" onClick={() => patch(it.food_id, { amount: (it.amount ?? 0) + 1 })} className="h-11 w-11 rounded-xl text-xl text-muted">+</button>
                  <button aria-label="Сподобалось" aria-pressed={it.liked === true} onClick={() => patch(it.food_id, { liked: it.liked === true ? null : true })}
                    className={`h-11 w-11 rounded-xl ${it.liked === true ? 'bg-food-soft' : 'opacity-40'}`}>👍</button>
                  <button aria-label="Не сподобалось" aria-pressed={it.liked === false} onClick={() => patch(it.food_id, { liked: it.liked === false ? null : false })}
                    className={`h-11 w-11 rounded-xl ${it.liked === false ? 'bg-accent-soft' : 'opacity-40'}`}>👎</button>
                </li>
              )
            })}
          </ul>
        )}

        <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Пошук або свій продукт" />
        {q.trim() && !exact && (
          <button onClick={addOwn} className="min-h-11 w-full rounded-2xl border border-dashed border-line text-sm text-accent">+ Додати «{q.trim()}»</button>
        )}

        {/* Без червоних «нове» на кожній плитці: спершу те, що вже їв, далі — ще не пробував. */}
        <div className="max-h-[46dvh] space-y-3 overflow-y-auto p-0.5">
          {[list.filter((f) => ever.has(f.id)), list.filter((f) => !ever.has(f.id))].map((group, gi) => group.length > 0 && (
            <div key={gi}>
              {(gi === 1 && list.some((f) => ever.has(f.id))) && <p className="mb-2 px-1 text-sm font-semibold text-muted">Ще не пробували</p>}
              <div className="grid grid-cols-3 gap-2">
                {group.map((f) => (
                  <button key={f.id} onClick={() => toggle(f.id)} aria-pressed={has(f.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-3xl p-2 pb-2.5 text-center ${has(f.id) ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface shadow-soft'}`}>
                    <FoodImage food={f} size={64} />
                    <span className="line-clamp-2 text-sm leading-tight font-semibold">{f.name_uk}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full" disabled={items.length === 0} onClick={save}>Записати{items.length > 1 ? ` (${items.length})` : ''}</Button>
      </div>
    </Sheet>
  )
}
