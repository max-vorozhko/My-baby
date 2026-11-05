import type { Child } from '@/db/types'
import { useIntros, useMealsSince } from '@/db/hooks'
import { allergenStates, ALLERGEN_REMIND_DAYS } from '@/lib/food'
import { DAY_MS, useNow } from '@/lib/time'
import { daysWord } from '@/lib/age'
import { Card } from '@/ui/kit'
import { STATUS_DOT, STATUS_LABEL } from './status'
import { useState } from 'react'

/** Трекер 9 основних алергенів (ТЗ 3.2). */
export function AllergensCard({ child, onFood }: { child: Child; onFood: (id: string) => void }) {
  const now = useNow(60_000)
  const [since] = useState(() => Date.now() - 60 * DAY_MS)
  const intros = useIntros(child.id) ?? []
  const meals = useMealsSince(child.id, since)
  const states = allergenStates(intros, meals, now)
  const done = states.filter((s) => s.status === 'introduced').length
  const reminders = states.filter((s) => s.remind)

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Алергени</h2>
        <span className="text-sm text-muted">введено {done} з 9</span>
      </div>
      {reminders.length > 0 && (
        <p className="mt-2 rounded-2xl bg-accent-soft p-3 text-sm">
          Давно не давали: <b>{reminders.map((r) => r.name).join(', ')}</b>. Після введення алергени варто підтримувати в раціоні регулярно.
        </p>
      )}
      <ul className="mt-2 divide-y divide-line">
        {states.map((s) => {
          const days = s.lastGiven ? Math.max(0, Math.floor((now - s.lastGiven) / DAY_MS)) : null
          return (
            <li key={s.code}>
              <button onClick={() => onFood(s.foods[0].id)} className="flex min-h-12 w-full items-center gap-3 py-1 text-left">
                <span className="text-xl">{s.emoji}</span>
                <span className="flex-1">
                  <span className="block font-medium">{s.name}</span>
                  <span className="block text-xs text-muted">
                    {STATUS_LABEL[s.status]}
                    {days !== null && s.status !== 'new' && ` · ${days === 0 ? 'сьогодні' : `${days} ${daysWord(days)} тому`}`}
                  </span>
                </span>
                <span className={`h-3 w-3 rounded-full ${s.remind ? 'bg-accent ring-4 ring-accent-soft' : STATUS_DOT[s.status]}`} />
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">Нагадування — якщо введений алерген не давали понад {ALLERGEN_REMIND_DAYS} днів. Чернетка, чекає перевірки педіатром.</p>
    </Card>
  )
}
