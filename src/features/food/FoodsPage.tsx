import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { allFoods, CATEGORY_LABEL, type FoodCategory } from '@/data/foods'
import { useMarks, useMealsSince } from '@/db/hooks'
import { foodStats, latestMarks, statusOf } from '@/lib/food'
import { PageTitle, inputCls } from '@/ui/kit'
import { STATUS_DOT } from './status'
import { useFoodSheets } from './FoodSheets'

const CATS = Object.keys(CATEGORY_LABEL) as FoodCategory[]

/** Усі продукти: статус і скільки разів давали. */
export function FoodsPage({ child }: { child: Child }) {
  const meals = useMealsSince(child.id, 0)
  const marks = latestMarks(useMarks(child.id) ?? [])
  const ever = foodStats(meals)
  const [cat, setCat] = useState<FoodCategory | 'all'>('all')
  const [q, setQ] = useState('')
  const sheets = useFoodSheets(child)
  const list = allFoods().filter((f) => (cat === 'all' || f.category === cat) && f.name_uk.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div className="space-y-3">
      <Link to="/food" className="inline-flex min-h-11 items-center px-1 text-sm text-accent">← Їжа</Link>
      <PageTitle sub={`Давали ${ever.size} з ${allFoods().length}`}>Продукти</PageTitle>
      <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Пошук" />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(['all', ...CATS] as const).map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm ${cat === c ? 'bg-ink text-bg' : 'bg-surface text-muted border border-line'}`}>
            {c === 'all' ? 'Усе' : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface shadow-soft">
        {list.map((f) => {
          const s = statusOf(f.id, marks, ever)
          const n = ever.get(f.id)?.count ?? 0
          return (
            <li key={f.id}>
              <button onClick={() => sheets.openFood(f.id)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left">
                <span className="w-6 text-center">{f.emoji}</span>
                <span className="flex-1">{f.name_uk}{f.allergen_code && <span className="ml-1.5 text-xs text-muted">алерген</span>}</span>
                {n > 0 && <span className="text-sm tabular-nums text-muted">{n}×</span>}
                <i className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
              </button>
            </li>
          )
        })}
      </ul>
      {sheets.element}
    </div>
  )
}
