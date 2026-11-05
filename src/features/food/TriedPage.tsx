import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { CATEGORY_LABEL, FOODS, type FoodCategory } from '@/data/foods'
import { useIntros } from '@/db/hooks'
import { latestIntros, statusOf, type FoodStatus } from '@/lib/food'
import { getAge } from '@/lib/age'
import { PageTitle } from '@/ui/kit'
import { STATUS_CLS, STATUS_DOT, STATUS_LABEL } from './status'
import { useFoodSheets } from './FoodSheets'

const CATS = Object.keys(CATEGORY_LABEL) as FoodCategory[]

/** «Що вже пробували»: сітка продуктів з кольоровим статусом (ТЗ 3.2). */
export function TriedPage({ child }: { child: Child }) {
  const intros = useIntros(child.id) ?? []
  const latest = latestIntros(intros)
  const age = getAge(child.birth_date, child.preterm_weeks).months
  const [cat, setCat] = useState<FoodCategory | 'all'>('all')
  const sheets = useFoodSheets(child)
  const tried = FOODS.filter((f) => ['introduced', 'reaction'].includes(statusOf(f.id, latest))).length
  const list = FOODS.filter((f) => cat === 'all' || f.category === cat)

  return (
    <div className="space-y-4">
      <Link to="/food" className="inline-flex min-h-12 items-center text-accent">← Їжа</Link>
      <PageTitle sub={`Спробували ${tried} з ${FOODS.length}`}>Що вже пробували</PageTitle>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(['all', ...CATS] as const).map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium ${cat === c ? 'border-accent bg-accent-soft' : 'border-line bg-surface text-muted'}`}>
            {c === 'all' ? 'Усе' : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {(['introduced', 'observing', 'reaction', 'postponed', 'new'] as FoodStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1"><i className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[s]}`} />{STATUS_LABEL[s]}</span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {list.map((f) => {
          const s = statusOf(f.id, latest)
          const young = age < f.min_age_months && s === 'new'
          return (
            <button key={f.id} onClick={() => sheets.openFood(f.id)}
              className={`relative flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 p-2 text-center text-sm font-medium ${STATUS_CLS[s]} ${young ? 'opacity-50' : ''}`}>
              <span className="text-3xl">{f.emoji}</span>
              <span className="mt-1 leading-tight">{f.name_uk}</span>
              {f.allergen_code && <span className="absolute right-1.5 top-1.5 rounded-full bg-sos px-1.5 text-[10px] font-bold text-white dark:text-bg">А</span>}
              {young && <span className="text-[11px] text-muted">з {f.min_age_months} міс</span>}
            </button>
          )
        })}
      </div>
      {sheets.element}
    </div>
  )
}
