import { useState } from 'react'
import { isIOS, isStandalone, useInstallPrompt } from '@/lib/storage'
import { Button, Card } from '@/ui/kit'
import { IconClose } from '@/ui/icons'

const KEY = 'my-baby:install-hint-hidden'

/** Встановлення важливе: на iOS дані невстановленого сайту можуть стертися. */
export function InstallHint() {
  const { canPrompt, prompt } = useInstallPrompt()
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
  })
  if (hidden || isStandalone()) return null
  if (!canPrompt && !isIOS()) return null

  const hide = () => {
    setHidden(true)
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
  }

  return (
    <Card className="relative">
      <button onClick={hide} aria-label="Сховати" className="absolute right-2 top-2 flex h-12 w-12 items-center justify-center text-muted">
        <IconClose width={20} height={20} />
      </button>
      <p className="pr-10 font-semibold">Встановіть на головний екран</p>
      {canPrompt ? (
        <>
          <p className="mt-1 text-sm text-muted">Відкриватиметься як застосунок і працюватиме без інтернету.</p>
          <Button className="mt-3 w-full" onClick={prompt}>Встановити</Button>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">
          У Safari натисніть «Поділитися» → «На початковий екран». Так дані надійно збережуться на телефоні.
        </p>
      )}
    </Card>
  )
}
