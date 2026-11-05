import { useEffect, useState } from 'react'
import type { BottleContent, BreastSide, Feeding } from '@/db/types'
import { deleteFeeding, saveFeeding } from '@/db/actions'
import { fromLocalInput, HOUR, toLocalInput } from '@/lib/time'
import { Sheet } from '@/ui/Sheet'
import { Button, Field, Segmented, inputCls } from '@/ui/kit'

export function FeedingEditSheet({ feeding, onClose }: { feeding: Feeding | null; onClose: () => void }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [side, setSide] = useState<BreastSide>('left')
  const [content, setContent] = useState<BottleContent>('formula')
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    if (!feeding) return
    setStart(toLocalInput(feeding.start_at))
    setEnd(feeding.end_at ? toLocalInput(feeding.end_at) : '')
    setSide(feeding.side ?? 'left')
    setContent(feeding.bottle_content ?? 'formula')
    setAmount(feeding.amount_ml ?? 0)
  }, [feeding])

  if (!feeding) return null
  const breast = feeding.kind === 'breast'
  const s = start ? new Date(start).getTime() : NaN
  const e = end ? new Date(end).getTime() : null
  const error = Number.isNaN(s) ? 'Вкажіть час'
    : breast && e !== null && e < s ? 'Кінець раніше початку'
    : breast && e !== null && e - s > 2 * HOUR ? 'Довше 2 год — перевірте час'
    : !breast && amount < 5 ? 'Вкажіть кількість'
    : null

  const save = async () => {
    const at = fromLocalInput(start)
    await saveFeeding(feeding.id, breast
      ? { start_at: at, end_at: end ? fromLocalInput(end) : null, side }
      : { start_at: at, end_at: at, bottle_content: content, amount_ml: amount })
    onClose()
  }
  const remove = async () => {
    if (!confirm('Видалити запис?')) return
    await deleteFeeding(feeding.id)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={breast ? 'Груди' : 'Пляшечка'}>
      <div className="space-y-4">
        {breast ? (
          <>
            <Field label="Сторона" group>
              <Segmented<BreastSide> value={side} onChange={setSide} options={[{ value: 'left', label: 'Ліва' }, { value: 'right', label: 'Права' }]} />
            </Field>
            <Field label="Початок"><input type="datetime-local" className={inputCls} value={start} onChange={(ev) => setStart(ev.target.value)} /></Field>
            <Field label="Кінець"><input type="datetime-local" className={inputCls} value={end} onChange={(ev) => setEnd(ev.target.value)} /></Field>
          </>
        ) : (
          <>
            <Field label="Що" group>
              <Segmented<BottleContent> value={content} onChange={setContent} options={[{ value: 'formula', label: 'Суміш' }, { value: 'breast_milk', label: 'Зціджене' }]} />
            </Field>
            <Field label="Кількість, мл">
              <input type="number" inputMode="numeric" className={inputCls} value={amount} onChange={(ev) => setAmount(Number(ev.target.value) || 0)} />
            </Field>
            <Field label="Час"><input type="datetime-local" className={inputCls} value={start} onChange={(ev) => setStart(ev.target.value)} /></Field>
          </>
        )}
        {error && <p className="text-sm text-sos">{error}</p>}
        <div className="flex gap-2">
          <Button variant="ghost" className="text-sos" onClick={remove}>Видалити</Button>
          <Button className="flex-1" disabled={!!error} onClick={save}>Зберегти</Button>
        </div>
      </div>
    </Sheet>
  )
}
