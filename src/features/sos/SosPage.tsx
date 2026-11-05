import { useNavigate } from 'react-router-dom'
import { IconClose, IconPhone } from '@/ui/icons'

/**
 * Заглушка (крок 1). Покрокова інструкція з ілюстраціями — на кроці 4,
 * лише після рецензії педіатра (ТЗ 8). Екран працює офлайн.
 */
export function SosPage() {
  const navigate = useNavigate()
  const close = () => (history.length > 1 ? navigate(-1) : navigate('/'))

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg px-4 pt-[max(env(safe-area-inset-top),12px)] pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sos">Поперхування</h1>
        <button onClick={close} aria-label="Закрити" className="flex h-12 w-12 items-center justify-center rounded-full border border-line">
          <IconClose />
        </button>
      </div>

      <a
        href="tel:103"
        className="mt-6 flex min-h-20 items-center justify-center gap-3 rounded-3xl bg-sos text-2xl font-bold text-white dark:text-bg active:scale-[0.98]"
      >
        <IconPhone width={28} height={28} />
        Телефонувати 103
      </a>

      <div className="mt-6 rounded-3xl border-2 border-dashed border-line p-5 text-muted">
        <p className="font-semibold text-ink">Покрокова інструкція з ілюстраціями</p>
        <p className="mt-2 text-sm">
          З'явиться на кроці 4 після перевірки педіатром. Поки це заглушка — не покладайтеся на неї.
        </p>
      </div>
    </div>
  )
}
