import { useEffect, useState } from 'react'
import type { Child, ItchLevel, SkinSign, SkinTrigger, SkinZone } from '@/db/types'
import { getSkinCheck, saveSkinCheck } from '@/db/actions'
import { useMealsSince } from '@/db/hooks'
import { recentlyNew } from '@/lib/food'
import { ITCH_LABEL, SIGNS, TRIGGERS, ZONES } from '@/data/skin'
import { Sheet } from '@/ui/Sheet'
import { Button, Chips, Emergency103, Field, Segmented, inputCls } from '@/ui/kit'

/** Щоденний огляд шкіри — лише спостереження. */
export function SkinCheckSheet({ child, date, open, onClose }: { child: Child; date: string; open: boolean; onClose: () => void }) {
  const meals = useMealsSince(child.id, Date.now() - 3 * 86_400_000)
  const [itch, setItch] = useState<ItchLevel>(0)
  const [zones, setZones] = useState<SkinZone[]>([])
  const [signs, setSigns] = useState<SkinSign[]>([])
  const [triggers, setTriggers] = useState<SkinTrigger[]>([])
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    getSkinCheck(child.id, date).then((c) => {
      setItch(c?.itch ?? 0); setZones(c?.zones ?? []); setSigns(c?.signs ?? []); setPhoto(c?.photo ?? null); setNote(c?.note ?? '')
      // Якщо за 2 доби з'явився новий продукт — відмічаємо як можливий чинник (батьки можуть зняти).
      setTriggers(c?.triggers ?? (recentlyNew(meals, Date.now(), 2).length ? ['new_food'] : []))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, child.id, date])

  const save = async () => { await saveSkinCheck(child.id, date, { itch, zones, signs, triggers, photo, note: note.trim() }); onClose() }

  return (
    <Sheet open={open} onClose={onClose} title="Огляд шкіри">
      <div className="space-y-5">
        <Field label="Свербіж" group>
          <Segmented<`${ItchLevel}`> value={`${itch}`} onChange={(v) => setItch(Number(v) as ItchLevel)}
            options={([0, 1, 2, 3] as ItchLevel[]).map((l) => ({ value: `${l}` as `${ItchLevel}`, label: ITCH_LABEL[l] }))} />
        </Field>
        <Field label="Де" group><Chips options={ZONES} value={zones} onChange={setZones} /></Field>
        <Field label="Як виглядає" group><Chips options={SIGNS} value={signs} onChange={setSigns} /></Field>
        <Field label="Що змінилося" group><Chips options={TRIGGERS} value={triggers} onChange={setTriggers} /></Field>
        <Field label="Фото">
          <input type="file" accept="image/*" capture="environment" className="block w-full text-sm" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          {photo && <span className="mt-1 block text-xs text-muted">Фото додано</span>}
        </Field>
        <Field label="Нотатка"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необов'язково" /></Field>
        <Button className="w-full" onClick={save}>Зберегти</Button>
        <Emergency103 />
      </div>
    </Sheet>
  )
}
