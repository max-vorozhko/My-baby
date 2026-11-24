import { useEffect } from 'react'
import {
  accountsEnabled, backupNow, dismissNotice, formatBackupDate, loadBackupInfo, resolveConflict, restoreNow,
  signInWithGoogle, signOut, useAccount,
} from '@/lib/account'
import { Sheet } from '@/ui/Sheet'
import { Button, Card } from '@/ui/kit'

/** Кольоровий логотип Google (за правилами бренду кнопка входу має його містити). */
export function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export function GoogleButton({ children = 'Увійти через Google', className = '' }: { children?: string; className?: string }) {
  const { busy } = useAccount()
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void signInWithGoogle()}
      className={`flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-line bg-surface px-4 font-semibold text-ink shadow-soft disabled:opacity-60 ${className}`}
    >
      <GoogleLogo />
      {busy ? 'Зачекайте…' : children}
    </button>
  )
}

/** Картка в «Ще». */
export function AccountCard() {
  const { account, backup, busy } = useAccount()
  useEffect(() => { void loadBackupInfo() }, [account])
  if (!accountsEnabled()) return null

  if (!account) {
    return (
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Акаунт</h2>
        <p className="text-sm text-muted">Увійдіть через Google — і отримаєте:</p>
        <ul className="space-y-1.5 text-[15px]">
          <li>☁️ Копію щоденника в хмарі — не загубиться, якщо зміните чи втратите телефон</li>
          <li>📖 5 казок на день замість 2</li>
        </ul>
        <GoogleButton />
        <p className="text-xs text-muted">Без входу все працює, як і раніше: записи лише на цьому телефоні.</p>
      </Card>
    )
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">Акаунт</h2>
      <div className="flex items-center gap-3">
        <GoogleLogo size={24} />
        <span className="min-w-0">
          {account.name && <span className="block truncate font-medium">{account.name}</span>}
          <span className="block truncate text-sm text-muted">{account.email}</span>
        </span>
      </div>
      <p className="text-sm text-muted">
        {backup === undefined && 'Перевіряю копію…'}
        {backup === null && 'Копії в хмарі ще немає.'}
        {backup && `Копія в хмарі: ${formatBackupDate(backup.updatedAt)} · записів: ${backup.records}. Оновлюється автоматично.`}
      </p>
      <Button variant="secondary" className="w-full" disabled={busy} onClick={() => void backupNow()}>Зберегти копію зараз</Button>
      {backup && (
        <Button variant="secondary" className="w-full" disabled={busy} onClick={() => {
          if (confirm(`Замінити записи на телефоні копією від ${formatBackupDate(backup.updatedAt)}?`)) void restoreNow()
        }}>Відновити з копії</Button>
      )}
      <Button variant="ghost" className="w-full" disabled={busy} onClick={() => void signOut()}>Вийти</Button>
    </Card>
  )
}

/** Повідомлення після входу: банер або питання при конфлікті. Показується на будь-якому екрані. */
export function AccountNotice() {
  const { notice, busy } = useAccount()
  // Інформаційний банер ховається сам; помилки й питання — лише вручну.
  useEffect(() => {
    if (notice?.kind !== 'info') return
    const t = setTimeout(dismissNotice, 7000)
    return () => clearTimeout(t)
  }, [notice])
  if (!notice) return null

  if (notice.kind === 'conflict') {
    return (
      <Sheet open onClose={dismissNotice} title="У акаунті вже є копія">
        <div className="space-y-4">
          <p className="text-[15px] leading-snug text-muted">
            У хмарі збережено інший щоденник (від {formatBackupDate(notice.backup.updatedAt)}, записів: {notice.backup.records}).
            Що залишити?
          </p>
          <Button className="w-full" disabled={busy} onClick={() => void resolveConflict('restore')}>
            Відновити копію з хмари
          </Button>
          <p className="-mt-2 text-xs text-muted">Записи на цьому телефоні буде замінено.</p>
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => void resolveConflict('keep')}>
            Залишити дані цього телефона
          </Button>
          <p className="-mt-2 text-xs text-muted">Копію в хмарі буде перезаписано.</p>
          <button onClick={dismissNotice} className="min-h-11 w-full text-sm font-semibold text-muted">Вирішу пізніше</button>
        </div>
      </Sheet>
    )
  }

  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 mx-auto max-w-lg px-4 pt-[max(env(safe-area-inset-top),12px)]">
      <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-soft ${notice.kind === 'error' ? 'bg-sos text-white' : 'bg-surface text-ink'}`}>
        <span className="flex-1">{notice.text}</span>
        <button onClick={dismissNotice} aria-label="Закрити" className="-my-1 -mr-2 min-h-9 min-w-9 font-bold opacity-70">✕</button>
      </div>
    </div>
  )
}
