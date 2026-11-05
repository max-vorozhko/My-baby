import { useEffect, useState } from 'react'
import type { Sleep, SleepKind } from '@/db/types'
import { deleteSleep, saveSleep } from '@/db/actions'
import { defaultKind } from '@/lib/sleep'
import { formatDuration, fromLocalInput, HOUR, toLocalInput } from '@/lib/time'
import { Sheet } from '@/ui/Sheet'
import { Button, Field, Segmented, inputCls } from '@/ui/kit'

/** Ручне редагування або додавання сну (ТЗ 3.3). sleep=null — новий запис. */
export function SleepEditSheet({
  open, onClose, childId, sleep,
}: { open: boolean; onClose: () => void; childId: string; sleep: Sleep | null }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [kind, setKind] = useState<SleepKind>('nap')
  const [wakeUps, setWakeUps] = useState(0)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (sleep) {
      setStart(toLocalInput(sleep.start_at))
      setEnd(sleep.end_at ? toLocalInput(sleep.end_at) : '')
      setKind(sleep.kind)
      setWakeUps(sleep.wake_ups)
      setNote(sleep.note)
    } else {
      const s = new Date(Date.now() - HOUR)
      setStart(toLocalInput(s.toISOString()))
      setEnd(toLocalInput(new Date().toISOString()))
      setKind(defaultKind(s))
      setWakeUps(0)
      setNote('')
    }
  }, [open, sleep])

  const startMs = start ? new Date(start).getTime() : NaN
  const endMs = end ? new Date(end).getTime() : null
  const error =
    Number.isNaN(startMs) ? 'Вкажіть початок'
    : startMs > Date.now() ? 'Початок у майбутньому'
    : endMs !== null && endMs <= startMs ? 'Кінець має бути пізніше початку'
    : endMs !== null && endMs - startMs > 16 * HOUR ? 'Сон довший за 16 год — перевірте дати'
    : !sleep && endMs === null ? 'Вкажіть кінець'
    : null

  const save = async () => {
    await saveSleep({
      id: sleep?.id, childId, start_at: fromLocalInput(start), end_at: end ? fromLocalInput(end) : null,
      kind, wake_ups: kind === 'night' ? wakeUps : 0, note: note.trim(),
    })
    onClose()
  }

  const remove = async () => {
    if (!sleep || !confirm('Видалити цей сон?')) return
    await deleteSleep(sleep.id)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={sleep ? 'Редагувати сон' : 'Додати сон'}>
      <div className="space-y-4">
        <Field label="Тип" group>
          <Segmented<SleepKind> value={kind} onChange={setKind} options={[{ value: 'nap', label: 'Денний' }, { value: 'night', label: 'Нічний' }]} />
        </Field>
        <Field label="Заснув">
          <input type="datetime-local" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Прокинувся" hint={sleep && !sleep.end_at ? 'Залиште порожнім, якщо ще спить' : undefined}>
          <input type="datetime-local" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        {kind === 'night' && (
          <Field label="Нічні пробудження" group>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => setWakeUps((n) => Math.max(0, n - 1))} aria-label="Менше">−</Button>
              <span className="w-10 text-center text-xl font-bold tabular-nums">{wakeUps}</span>
              <Button variant="secondary" onClick={() => setWakeUps((n) => n + 1)} aria-label="Більше">+</Button>
            </div>
          </Field>
        )}
        <Field label="Нотатка">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необов'язково" />
        </Field>
        {!error && endMs && <p className="text-sm text-muted">Тривалість: {formatDuration(endMs - startMs)}</p>}
        {error && <p className="text-sm text-sos">{error}</p>}
        <div className="flex gap-2">
          {sleep && <Button variant="ghost" className="text-sos" onClick={remove}>Видалити</Button>}
          <Button className="flex-1" disabled={!!error} onClick={save}>Зберегти</Button>
        </div>
      </div>
    </Sheet>
  )
}
