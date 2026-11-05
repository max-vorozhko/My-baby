import { useEffect, useState } from 'react'
import { exportAll, updateChild, wipeAll } from '@/db'
import type { Child } from '@/db/types'
import type { ThemePref } from '@/lib/theme'
import { isStandalone, requestPersistence, useInstallPrompt } from '@/lib/storage'
import { ChildForm, isDraftValid, type ChildDraft } from '@/features/profile/ChildForm'
import { Button, Card, PageTitle, Segmented } from '@/ui/kit'
import { Disclaimer } from '@/ui/Disclaimer'

function toDraft(c: Child): ChildDraft {
  return {
    name: c.name, birth_date: c.birth_date, sex: c.sex,
    preterm: c.preterm_weeks > 0, preterm_weeks: c.preterm_weeks || 4,
  }
}

export function MorePage({ child, theme }: { child: Child; theme: { pref: ThemePref; setPref: (p: ThemePref) => void } }) {
  const [draft, setDraft] = useState(() => toDraft(child))
  const [saved, setSaved] = useState(false)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const { canPrompt, prompt } = useInstallPrompt()

  useEffect(() => { requestPersistence().then(setPersisted) }, [])

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(child))

  const save = async () => {
    await updateChild(child.id, {
      name: draft.name.trim(), birth_date: draft.birth_date, sex: draft.sex,
      preterm_weeks: draft.preterm ? draft.preterm_weeks : 0,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const download = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `my-baby-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const wipe = async () => {
    if (!confirm('Видалити всі дані з цього телефона? Це не можна скасувати.')) return
    await wipeAll()
    location.replace(import.meta.env.BASE_URL)
  }

  return (
    <div className="space-y-4">
      <PageTitle>Ще</PageTitle>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Профіль дитини</h2>
        <ChildForm value={draft} onChange={setDraft} />
        <Button className="mt-5 w-full" disabled={!dirty || !isDraftValid(draft)} onClick={save}>
          {saved ? 'Збережено ✓' : 'Зберегти'}
        </Button>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Тема</h2>
        <p className="mb-3 text-sm text-muted">«Авто» вмикає нічну тему з 21:00 до 7:00.</p>
        <Segmented<ThemePref> value={theme.pref} onChange={theme.setPref} options={[
          { value: 'auto', label: 'Авто' }, { value: 'light', label: 'Світла' }, { value: 'dark', label: 'Нічна' },
        ]} />
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Сім'я</h2>
        <p className="text-sm text-muted">Запрошення партнера, няні чи бабусі з'явиться після підключення синхронізації.</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Дані</h2>
        <p className="text-sm text-muted">
          Усе зберігається лише на цьому телефоні.{' '}
          {persisted === true && 'Браузер не стиратиме дані автоматично.'}
          {persisted === false && !isStandalone() && 'Встановіть застосунок на головний екран, щоб дані не стерлися.'}
        </p>
        {canPrompt && <Button variant="secondary" className="w-full" onClick={prompt}>Встановити на головний екран</Button>}
        <Button variant="secondary" className="w-full" onClick={download}>Експортувати дані (JSON)</Button>
        <Button variant="ghost" className="w-full text-sos" onClick={wipe}>Видалити всі дані</Button>
      </Card>

      <Disclaimer />
      <p className="px-2 text-center text-xs text-muted">My Baby v0.1 · У разі небезпеки телефонуйте 103.</p>
    </div>
  )
}
