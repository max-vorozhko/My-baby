import { useEffect, useState } from 'react'
import type { Child, ReactionType } from '@/db/types'
import { FOOD_BY_ID } from '@/data/foods'
import { useIntros } from '@/db/hooks'
import { addReaction } from '@/db/actions'
import { latestIntros } from '@/lib/food'
import { fromLocalInput, toLocalInput } from '@/lib/time'
import { IconPhone } from '@/ui/icons'
import { Sheet } from '@/ui/Sheet'
import { Button, Field, Segmented, inputCls } from '@/ui/kit'
import { Disclaimer } from '@/ui/Disclaimer'

const TYPES: { value: ReactionType; label: string }[] = [
  { value: 'rash', label: 'Висип' }, { value: 'tummy', label: 'Животик' }, { value: 'stool', label: 'Стілець' },
  { value: 'vomit', label: 'Блювання' }, { value: 'other', label: 'Інше' },
]
export const REACTION_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label])) as Record<ReactionType, string>

const RED_FLAGS = ['Утруднене дихання або хрипи', 'Набряк обличчя, губ чи язика', 'Млявість, блідість, дитина «в’яла»']

export function ReactionSheet({ child, open, foodId, onClose }: { child: Child; open: boolean; foodId: string | null; onClose: () => void }) {
  const intros = useIntros(child.id) ?? []
  const tried = [...latestIntros(intros).values()].sort((a, b) => b.started_at.localeCompare(a.started_at))
  const [food, setFood] = useState<string>('')
  const [type, setType] = useState<ReactionType>('rash')
  const [severity, setSeverity] = useState<'1' | '2' | '3'>('1')
  const [flags, setFlags] = useState<boolean[]>(RED_FLAGS.map(() => false))
  const [at, setAt] = useState('')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)

  useEffect(() => {
    if (!open) return
    setFood(foodId ?? tried.find((i) => i.status === 'observing')?.food_id ?? tried[0]?.food_id ?? '')
    setType('rash'); setSeverity('1'); setFlags(RED_FLAGS.map(() => false)); setNote(''); setPhoto(null)
    setAt(toLocalInput(new Date().toISOString()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, foodId])

  const danger = flags.some(Boolean)

  const save = async () => {
    await addReaction({
      childId: child.id, foodId: food || null, type, severity: Number(severity) as 1 | 2 | 3,
      photo, at: new Date(fromLocalInput(at)), note: [danger ? `Червоні прапорці: ${RED_FLAGS.filter((_, i) => flags[i]).join('; ')}` : '', note.trim()].filter(Boolean).join('. '),
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Реакція">
      <div className="space-y-4">
        <div className="rounded-3xl border-2 border-sos p-4">
          <p className="font-semibold">Чи є щось із цього?</p>
          {RED_FLAGS.map((f, i) => (
            <label key={f} className="mt-1 flex min-h-12 items-center gap-3">
              <input type="checkbox" className="h-6 w-6 accent-[var(--color-sos)]" checked={flags[i]}
                onChange={(e) => setFlags((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))} />
              <span>{f}</span>
            </label>
          ))}
        </div>

        {danger ? (
          /* ТЗ 8: червоні прапорці → «Негайно телефонуйте 103» замість порад. */
          <div className="rounded-3xl bg-sos p-5 text-white dark:text-bg">
            <p className="text-2xl font-bold">Негайно телефонуйте 103</p>
            <a href="tel:103" className="mt-4 flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-white text-xl font-bold text-sos">
              <IconPhone /> 103
            </a>
            <button onClick={save} className="mt-3 min-h-12 w-full rounded-2xl border border-white/60 font-semibold">Зберегти запис для лікаря</button>
          </div>
        ) : (
          <>
            <Field label="Після якого продукту">
              <select className={inputCls} value={food} onChange={(e) => setFood(e.target.value)}>
                <option value="">Не знаю / інше</option>
                {tried.map((i) => {
                  const fd = FOOD_BY_ID.get(i.food_id)
                  return fd && <option key={i.food_id} value={i.food_id}>{fd.emoji} {fd.name_uk}</option>
                })}
              </select>
            </Field>
            <Field label="Що помітили" group>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setType(t.value)}
                    className={`min-h-12 rounded-2xl border px-4 font-medium ${type === t.value ? 'border-accent bg-accent-soft' : 'border-line bg-surface text-muted'}`}>
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
            {severity === '3' && <p className="text-sm">Якщо реакція сильна або посилюється — зверніться до лікаря сьогодні.</p>}
            <Field label="Коли"><input type="datetime-local" className={inputCls} value={at} onChange={(e) => setAt(e.target.value)} /></Field>
            <Field label="Фото (необов'язково)">
              <input type="file" accept="image/*" capture="environment" className="block w-full text-sm"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </Field>
            <Field label="Нотатка"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необов'язково" /></Field>
            <Button className="w-full" onClick={save}>Зберегти</Button>
            <Disclaimer compact />
          </>
        )}
      </div>
    </Sheet>
  )
}
