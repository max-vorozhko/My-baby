import { useEffect, useState, type ReactNode } from 'react'
import { isAndroid, isInstalled, isIOS, isIOSOtherBrowser, useInstallPrompt } from '@/lib/storage'
import { Sheet } from '@/ui/Sheet'
import { Button } from '@/ui/kit'
import { IconDots, IconPlusSquare, IconShare } from '@/ui/icons'

/**
 * Пропозиція встановити застосунок на головний екран (PWA).
 * Android/Chrome — системне вікно в один тап; iPhone — покрокова інструкція (системного вікна там немає).
 * Показується сама через кілька секунд після відкриття; «Пізніше» — знову через 3 дні.
 */

const SNOOZE_KEY = 'my-baby:install-snooze-until'
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000
const FIRST_DELAY_MS = 4000
const OPEN_EVENT = 'my-baby:open-install'

/** Відкрити вікно встановлення з будь-якого місця (наприклад, з налаштувань). */
export const openInstallSheet = () => window.dispatchEvent(new Event(OPEN_EVENT))

const snoozed = () => {
  try { return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now() } catch { return false }
}
const snooze = () => {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)) } catch { /* ignore */ }
}

/** Телефон чи планшет — на компʼютері не набридаємо. */
const isMobile = () => isIOS() || isAndroid()

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-extrabold text-accent">{n}</span>
      <span className="text-[15px] leading-snug">{children}</span>
    </li>
  )
}

/** Іконка «як на екрані» — щоб легко знайти потрібну кнопку. */
const Key = ({ children }: { children: ReactNode }) => (
  <span className="mx-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-line/80 px-1 align-middle text-ink">{children}</span>
)

export function InstallSheet() {
  const { canPrompt, prompt } = useInstallPrompt()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const show = () => { if (!isInstalled()) setOpen(true) }
    window.addEventListener(OPEN_EVENT, show)
    // Сама пропозиція — лише на телефоні, якщо ще не встановлено і не відкладено.
    const t = isMobile() && !isInstalled() && !snoozed() ? setTimeout(show, FIRST_DELAY_MS) : null
    return () => { window.removeEventListener(OPEN_EVENT, show); if (t) clearTimeout(t) }
  }, [])

  const later = () => { snooze(); setOpen(false) }
  const install = async () => {
    const ok = await prompt()
    if (ok) setOpen(false)
  }

  const ios = isIOS()
  const iosOther = isIOSOtherBrowser()

  return (
    <Sheet open={open} onClose={later} title="Встановіть My Baby">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <img src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="" className="h-16 w-16 rounded-[22%] shadow-soft" />
          <p className="text-[15px] leading-snug text-muted">
            Додайте застосунок на головний екран — і він відкриватиметься з іконки, як звичайна програма.
          </p>
        </div>

        <ul className="space-y-2 rounded-3xl bg-surface p-4 text-[15px] shadow-soft">
          <li>⚡ Відкривається в один тап, на весь екран</li>
          <li>📴 Працює без інтернету</li>
          <li>🔒 Записи надійно зберігаються на телефоні{ios ? ' (на iPhone — особливо важливо)' : ''}</li>
        </ul>

        {canPrompt ? (
          <Button className="w-full" onClick={() => void install()}>Встановити</Button>
        ) : ios ? (
          <ol className="space-y-3">
            <Step n={1}>
              Натисніть <Key><IconShare width={18} height={18} /></Key> «Поділитися»{' '}
              {iosOther ? 'в адресному рядку' : 'внизу екрана Safari'}
            </Step>
            <Step n={2}>
              Прокрутіть і виберіть <Key><IconPlusSquare width={18} height={18} /></Key> «На початковий екран»
            </Step>
            <Step n={3}>Натисніть «Додати» вгорі праворуч</Step>
          </ol>
        ) : (
          <ol className="space-y-3">
            <Step n={1}>Відкрийте меню браузера <Key><IconDots width={18} height={18} /></Key></Step>
            <Step n={2}>Виберіть «Встановити застосунок» або «Додати на головний екран»</Step>
          </ol>
        )}

        <button onClick={later} className="min-h-11 w-full text-sm font-semibold text-muted">
          {canPrompt ? 'Пізніше' : 'Зрозуміло, пізніше'}
        </button>
      </div>
    </Sheet>
  )
}
