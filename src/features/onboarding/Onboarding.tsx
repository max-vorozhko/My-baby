import { useState } from 'react'
import { createFamilyWithChild } from '@/db'
import { ChildForm, emptyChildDraft, isDraftValid, type ChildDraft } from '@/features/profile/ChildForm'
import { Button, Field, inputCls } from '@/ui/kit'
import { Disclaimer } from '@/ui/Disclaimer'

export function Onboarding() {
  const [step, setStep] = useState<0 | 1>(0)
  const [agreed, setAgreed] = useState(false)
  const [draft, setDraft] = useState<ChildDraft>(emptyChildDraft)
  const [parentName, setParentName] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await createFamilyWithChild({
        parentName: parentName.trim(),
        child: {
          name: draft.name.trim(),
          birth_date: draft.birth_date,
          sex: draft.sex,
          preterm_weeks: draft.preterm ? draft.preterm_weeks : 0,
        },
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-[max(env(safe-area-inset-top),24px)] pb-[max(env(safe-area-inset-bottom),16px)]">
      {step === 0 ? (
        <>
          <div className="flex-1">
            <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-20 w-20" />
            <h1 className="mt-6 text-3xl font-bold">Вітаємо в My Baby</h1>
            <p className="mt-3 text-lg text-muted">
              Сон, годування, прикорм і шкіра малюка — записи в 1–2 тапи і статистика. Працює без інтернету.
            </p>
            <div className="mt-8 space-y-3 rounded-3xl bg-surface shadow-soft p-4">
              <Disclaimer className="text-sm" />
              <label className="flex min-h-12 items-center gap-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="h-6 w-6 accent-[var(--color-accent)]"
                />
                <span className="text-sm">Зрозуміло. Дані зберігаються на цьому телефоні.</span>
              </label>
            </div>
          </div>
          <Button disabled={!agreed} onClick={() => setStep(1)} className="w-full">Почати</Button>
        </>
      ) : (
        <>
          <div className="flex-1 space-y-5">
            <h1 className="text-2xl font-bold">Розкажіть про малюка</h1>
            <ChildForm value={draft} onChange={setDraft} autoFocus />
            <Field label="Як вас називати" hint="Буде видно на записах, коли додасте партнера чи бабусю.">
              <input className={inputCls} value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Мама, Тато, Оля…" />
            </Field>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={() => setStep(0)}>Назад</Button>
            <Button className="flex-1" disabled={!isDraftValid(draft) || saving} onClick={submit}>Готово</Button>
          </div>
        </>
      )}
    </main>
  )
}
