import type { Child } from '@/db/types'
import { allFoods } from '@/data/foods'
import { useMarks, useMealsSince } from '@/db/hooks'
import { allergenRows } from '@/lib/food'
import { DAY_MS, useNow } from '@/lib/time'
import { daysWord } from '@/lib/age'
import { STATUS_DOT } from './status'

/** 9 основних алергенів — факти: які давали і коли востаннє. */
export function AllergensCard({ child, onFood }: { child: Child; onFood: (id: string) => void }) {
  const now = useNow(60_000)
  const meals = useMealsSince(child.id, 0)
  const marks = useMarks(child.id) ?? []
  const rows = allergenRows(meals, marks)
  const given = rows.filter((r) => r.status !== 'new')
  const rest = rows.filter((r) => r.status === 'new')
  const open = (code: string) => { const f = allFoods().find((x) => x.allergen_code === code); if (f) onFood(f.id) }

  return (
    <div className="space-y-2 rounded-3xl bg-surface shadow-soft p-4">
      {given.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {given.map((r) => {
            const d = r.last ? Math.max(0, Math.floor((now - r.last) / DAY_MS)) : 0
            return (
              <button key={r.code} onClick={() => open(r.code)} className="flex min-h-10 items-center gap-2 rounded-full bg-line/60 px-3 text-sm">
                <i className={`h-2 w-2 rounded-full ${STATUS_DOT[r.status]}`} />{r.name}
                <span className="text-muted">{d === 0 ? 'сьогодні' : `${d} ${daysWord(d)} тому`}</span>
              </button>
            )
          })}
        </div>
      ) : <p className="text-sm text-muted">Ще не давали жодного з 9.</p>}
      {rest.length > 0 && given.length > 0 && (
        <p className="text-xs text-muted">Ще не давали: {rest.map((r) => r.name.toLowerCase()).join(', ')}</p>
      )}
    </div>
  )
}
