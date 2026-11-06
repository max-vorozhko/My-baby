import { useEffect, useMemo, useState } from 'react'
import type { Child, ReactionType } from '@/db/types'
import { getFood } from '@/data/foods'
import { useMealsSince } from '@/db/hooks'
import { addReaction } from '@/db/actions'
import { topFoods } from '@/lib/food'
import { DAY_MS, fromLocalInput, toLocalInput } from '@/lib/time'
import { Sheet } from '@/ui/Sheet'
import { Button, Emergency103, Field, Segmented, inputCls } from '@/ui/kit'

const TYPES: { value: ReactionType; label: string }[] = [
  { value: 'rash', label: 'Висип' }, { value: 'tummy', label: 'Животик' }, { value: 'stool', label: 'Стілець' },
  { value: 'vomit', label: 'Блювання' }, { value: 'other', label: 'Інше' },
]
export const REACTION_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label])) as Record<ReactionType, string>

/** Запис реакції — лише спостереження, без порад. */
export function ReactionSheet({ child, open, foodId, onClose }: { child: Child; open: boolean; foodId: string | null; onClose: () => void }) {
  const [since] = useState(() => Date.now() - 3 * DAY_MS)
  const recent = useMealsSince(child.id, since)
  const recentFoods = useMemo(() => topFoods(recent).sort((a, b) => b.last - a.last), [recent])
  const [food, setFood] = useState('')
  const [type, setType] = useState<ReactionType>('rash')
  const [severity, setSeverity] = useState<'1' | '2' | '3'>('1')
  const [at, setAt] = useState('')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)

  useEffect(() => {
    if (!open) return
    setFood(foodId ?? recentFoods[0]?.foodId ?? '')
    setType('rash'); setSeverity('1'); setNote(''); setPhoto(null)
    setAt(toLocalInput(new Date().toISOString()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, foodId])

  const save = async () => {
    await addReaction({ childId: child.id, foodId: food || null, type, severity: Number(severity) as 1 | 2 | 3, photo, at: new Date(fromLocalInput(at)), note: note.trim() })
    onClose()
  }
  const options = [...new Set([foodId, ...recentFoods.map((r) => r.foodId)].filter(Boolean) as string[])]

  return (
    <Sheet open={open} onClose={onClose} title="Реакція">
      <div className="space-y-4">
        <Field label="Що помітили" group>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button key={t.value} type="button" aria-pressed={type === t.value} onClick={() => setType(t.value)}
                className={`min-h-11 rounded-full border px-4 text-sm ${type === t.value ? 'border-accent bg-accent-soft' : 'border-line bg-surface text-muted'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Наскільки виражено" group>
          <Segmented<'1' | '2' | '3'> value={severity} onChange={setSeverity} options={[
            { value: '1', label: 'Легко' }, { value: '2', label: 'Помірно' }, { value: '3', label: 'Сильно' },
          ]} />
        </Field>
        <Field label="Після якого продукту">
          <select className={inputCls} value={food} onChange={(e) => setFood(e.target.value)}>
            <option value="">Не знаю / інше</option>
            {options.map((id) => <option key={id} value={id}>{getFood(id)?.emoji} {getFood(id)?.name_uk}</option>)}
          </select>
        </Field>
        <Field label="Коли"><input type="datetime-local" className={inputCls} value={at} onChange={(e) => setAt(e.target.value)} /></Field>
        <Field label="Фото">
          <input type="file" accept="image/*" capture="environment" className="block w-full text-sm" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </Field>
        <Field label="Нотатка"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необов'язково" /></Field>
        <Button className="w-full" onClick={save}>Зберегти</Button>
        <Emergency103 />
      </div>
    </Sheet>
  )
}
