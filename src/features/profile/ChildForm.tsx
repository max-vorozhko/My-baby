import type { Sex } from '@/db/types'
import { formatAge, getAge, todayISODate } from '@/lib/age'
import { Field, Segmented, inputCls } from '@/ui/kit'

export interface ChildDraft {
  name: string
  birth_date: string
  sex: Sex | null
  preterm: boolean
  preterm_weeks: number
}

export const emptyChildDraft: ChildDraft = { name: '', birth_date: '', sex: null, preterm: false, preterm_weeks: 4 }

export function isDraftValid(d: ChildDraft) {
  return d.name.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(d.birth_date) && d.birth_date <= todayISODate()
}

export function ChildForm({
  value, onChange, autoFocus,
}: { value: ChildDraft; onChange: (d: ChildDraft) => void; autoFocus?: boolean }) {
  const set = <K extends keyof ChildDraft>(k: K, v: ChildDraft[K]) => onChange({ ...value, [k]: v })
  const valid = isDraftValid(value)
  const age = valid ? getAge(value.birth_date) : null
  const corrected = valid && value.preterm ? getAge(value.birth_date, value.preterm_weeks) : null

  return (
    <div className="space-y-5">
      <Field label="Ім'я">
        <input className={inputCls} value={value.name} autoFocus={autoFocus} onChange={(e) => set('name', e.target.value)} placeholder="Наприклад, Марʼянчик" />
      </Field>
      <Field label="Дата народження">
        <input type="date" className={inputCls} max={todayISODate()} value={value.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
      </Field>
      {age && (
        <p className="-mt-2 text-sm text-muted">
          Зараз: <b className="text-ink">{formatAge(age)}</b>
          {corrected && <> · коригований: <b className="text-ink">{formatAge(corrected)}</b></>}
        </p>
      )}
      <Field label="Стать (необов'язково)" group>
        <Segmented<Sex> value={value.sex} onChange={(v) => set('sex', v)} options={[{ value: 'girl', label: 'Дівчинка' }, { value: 'boy', label: 'Хлопчик' }]} />
      </Field>
      <div>
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" checked={value.preterm} onChange={(e) => set('preterm', e.target.checked)} className="h-6 w-6 accent-[var(--color-accent)]" />
          <span>Народився раніше терміну</span>
        </label>
        {value.preterm && (
          <Field label="На скільки тижнів раніше" hint="Підказки будуть за коригованим віком.">
            <input
              type="number" inputMode="numeric" min={1} max={16} className={inputCls}
              value={value.preterm_weeks}
              onChange={(e) => set('preterm_weeks', Math.max(1, Math.min(16, Number(e.target.value) || 1)))}
            />
          </Field>
        )}
      </div>
    </div>
  )
}
