import { useEffect, useState } from 'react'
import type { Child, ItchLevel, SkinSign, SkinTrigger, SkinZone } from '@/db/types'
import { getSkinCheck, saveSkinCheck } from '@/db/actions'
import { useIntros } from '@/db/hooks'
import { activeObservation } from '@/lib/food'
import { ITCH_LABEL, SIGNS, SKIN_RED_FLAGS, TRIGGERS, ZONES } from '@/data/skin'
import { IconPhone } from '@/ui/icons'
import { Sheet } from '@/ui/Sheet'
import { Button, Field } from '@/ui/kit'
import { Disclaimer } from '@/ui/Disclaimer'

function Chips<T extends string>({ options, value, onChange, tone = 'accent' }: {
  options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; tone?: 'accent' | 'sos'
}) {
  const on = tone === 'sos' ? 'border-sos bg-sos/15' : 'border-accent bg-accent-soft'
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const sel = value.includes(o.value)
        return (
          <button key={o.value} type="button" aria-pressed={sel}
            onClick={() => onChange(sel ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={`min-h-11 rounded-2xl border px-3 text-sm font-medium ${sel ? on : 'border-line bg-surface text-muted'}`}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Щоденний огляд шкіри: 10–15 секунд. */
export function SkinCheckSheet({ child, date, open, onClose }: { child: Child; date: string; open: boolean; onClose: () => void }) {
  const intros = useIntros(child.id) ?? []
  const [itch, setItch] = useState<ItchLevel>(0)
  const [zones, setZones] = useState<SkinZone[]>([])
  const [signs, setSigns] = useState<SkinSign[]>([])
  const [triggers, setTriggers] = useState<SkinTrigger[]>([])
  const [flags, setFlags] = useState<string[]>([])
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    getSkinCheck(child.id, date).then((c) => {
      setItch(c?.itch ?? 0); setZones(c?.zones ?? []); setSigns(c?.signs ?? []); setPhoto(c?.photo ?? null); setNote(c?.note ?? '')
      setTriggers(c?.triggers ?? (activeObservation(intros) ? ['new_food'] : []))
      setFlags([])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, child.id, date])

  const urgent = SKIN_RED_FLAGS.some((f) => f.urgent && flags.includes(f.id))
  const doctor = SKIN_RED_FLAGS.some((f) => !f.urgent && flags.includes(f.id))

  const save = async () => {
    const flagText = SKIN_RED_FLAGS.filter((f) => flags.includes(f.id)).map((f) => f.label).join('; ')
    await saveSkinCheck(child.id, date, {
      itch, zones, signs, triggers, photo,
      note: [flagText && `Червоні прапорці: ${flagText}`, note.trim()].filter(Boolean).join('. '),
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Огляд шкіри">
      <div className="space-y-5">
        <Field label="Свербіж сьогодні" group>
          <div className="grid grid-cols-4 gap-2">
            {([0, 1, 2, 3] as ItchLevel[]).map((l) => (
              <button key={l} type="button" onClick={() => setItch(l)} aria-pressed={itch === l}
                className={`min-h-12 rounded-2xl border text-sm font-semibold ${itch === l ? 'border-accent bg-accent-soft' : 'border-line bg-surface text-muted'}`}>
                {ITCH_LABEL[l]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Де" group><Chips options={ZONES} value={zones} onChange={setZones} /></Field>
        <Field label="Як виглядає" group><Chips options={SIGNS} value={signs} onChange={setSigns} /></Field>
        <Field label="Що могло вплинути" hint="Збіг у часі — привід обговорити з лікарем, не доказ причини." group>
          <Chips options={TRIGGERS} value={triggers} onChange={setTriggers} />
        </Field>

        <div className="rounded-3xl border-2 border-sos p-4">
          <p className="mb-2 font-semibold">Чи є щось із цього?</p>
          <Chips tone="sos" options={SKIN_RED_FLAGS.map((f) => ({ value: f.id, label: f.label }))} value={flags} onChange={setFlags} />
        </div>
        {urgent && (
          <div className="rounded-3xl bg-sos p-5 text-white dark:text-bg">
            <p className="text-xl font-bold">Негайно зверніться по допомогу</p>
            <p className="mt-1">Це може бути небезпечна інфекція шкіри.</p>
            <a href="tel:103" className="mt-3 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white text-xl font-bold text-sos"><IconPhone /> 103</a>
          </div>
        )}
        {!urgent && doctor && (
          <p className="rounded-2xl bg-accent-soft p-4 font-semibold">Покажіть малюка лікарю найближчим часом — сьогодні або завтра.</p>
        )}

        <Field label="Фото для порівняння">
          <input type="file" accept="image/*" capture="environment" className="block w-full text-sm" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          {photo && <span className="mt-1 block text-xs text-food">Фото додано</span>}
        </Field>
        <Field label="Нотатка">
          <input className="w-full min-h-12 rounded-2xl border border-line bg-surface px-4 outline-none focus:border-accent" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необов'язково" />
        </Field>
        <Button className="w-full" onClick={save}>Зберегти огляд</Button>
        <Disclaimer compact />
      </div>
    </Sheet>
  )
}
