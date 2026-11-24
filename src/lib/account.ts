/**
 * Акаунт Google (Supabase Auth). Без входу застосунок працює як раніше — усе на телефоні.
 * Вхід дає: резервну копію в хмарі і більше казок на день.
 *
 * Сесія Supabase лежить у localStorage ('my-baby:auth'), тож «чи увійшов» читаємо звідти синхронно,
 * не завантажуючи бібліотеку на старті.
 */
import { useSyncExternalStore } from 'react'
import { db, getSession } from '@/db'
import { backendEnabled, getSupabase } from './supabase'
import { decideAfterSignIn, isSnapshot, makeSnapshot, restoreSnapshot } from './backup'

const AUTH_KEY = 'my-baby:auth'
const BACKUP_AT_KEY = 'my-baby:backup-at'
const AUTO_EVERY_MS = 60 * 60 * 1000

export interface Account {
  email: string
  name: string | null
}

export interface BackupInfo {
  updatedAt: string
  records: number
}

/** Пасивні повідомлення (банер) і питання, що потребують рішення. */
export type Notice =
  | { kind: 'info'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'conflict'; backup: BackupInfo }

interface State {
  account: Account | null
  notice: Notice | null
  busy: boolean
  backup: BackupInfo | null | undefined // undefined — ще не знаємо
}

/* ---------- маленьке сховище стану (без зовнішніх бібліотек) ---------- */

function readStoredAccount(): Account | null {
  try {
    const raw = JSON.parse(localStorage.getItem(AUTH_KEY) ?? 'null') as
      | { user?: { email?: string; is_anonymous?: boolean; user_metadata?: Record<string, unknown> } }
      | null
    const u = raw?.user
    if (!u || u.is_anonymous || !u.email) return null
    const name = (u.user_metadata?.full_name ?? u.user_metadata?.name ?? null) as string | null
    return { email: u.email, name }
  } catch { return null }
}

let state: State = { account: readStoredAccount(), notice: null, busy: false, backup: undefined }
const listeners = new Set<() => void>()
function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l) }

export function useAccount() {
  return useSyncExternalStore(subscribe, () => state)
}

/** Синхронно: чи увійшов через Google (для пінгу і лімітів у UI). */
export const isSignedIn = () => readStoredAccount() !== null
export const accountsEnabled = backendEnabled

export const dismissNotice = () => set({ notice: null })

/* ---------- вхід / вихід ---------- */

/** Адреса повернення після Google: корінь застосунку (має бути в Redirect URLs у Supabase). */
const redirectTo = () => location.origin + import.meta.env.BASE_URL

export async function signInWithGoogle() {
  set({ busy: true, notice: null })
  try {
    const sb = await getSupabase()
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo(), queryParams: { prompt: 'select_account' } },
    })
    if (error) throw error
    // Далі браузер іде на сторінку Google і повертається з токеном в адресі.
  } catch {
    set({ busy: false, notice: { kind: 'error', text: 'Не вдалося відкрити вхід через Google. Перевірте інтернет і спробуйте ще раз.' } })
  }
}

export async function signOut() {
  set({ busy: true })
  try {
    const sb = await getSupabase()
    await sb.auth.signOut({ scope: 'local' })
  } catch { /* офлайн — локальну сесію все одно приберемо */ }
  try { localStorage.removeItem(AUTH_KEY); localStorage.removeItem(BACKUP_AT_KEY); localStorage.removeItem('my-baby:stories-left') } catch { /* ignore */ }
  set({ account: null, backup: undefined, busy: false, notice: { kind: 'info', text: 'Ви вийшли. Записи лишилися на цьому телефоні.' } })
}

/** Чи містить адреса відповідь від Google/Supabase після входу. */
export function isAuthReturn(loc: Pick<Location, 'hash' | 'search'> = location) {
  return /access_token=|error_description=/.test(loc.hash) || /error_description=/.test(loc.search)
}

/** Викликається на старті, якщо в адресі є токен: бібліотека сама його забирає і чистить адресу. */
export async function handleAuthReturn() {
  const err = new URLSearchParams(location.hash.slice(1) || location.search).get('error_description')
  set({ busy: true })
  try {
    const sb = await getSupabase()
    const { data } = await sb.auth.getSession() // чекає, доки клієнт розбере токен з адреси
    const user = data.session?.user
    if (!user || user.is_anonymous || !user.email) {
      if (err) history.replaceState(history.state, '', location.pathname)
      set({ busy: false, notice: { kind: 'error', text: 'Вхід не завершено. Спробуйте ще раз.' } })
      return
    }
    try { localStorage.removeItem('my-baby:stories-left') } catch { /* ignore */ } // ліміт казок тепер інший
    set({ account: readStoredAccount() ?? { email: user.email, name: null } })
    await resolveAfterSignIn()
  } catch {
    set({ notice: { kind: 'error', text: 'Не вдалося завершити вхід. Перевірте інтернет і спробуйте ще раз.' } })
  } finally {
    set({ busy: false })
  }
}

/* ---------- хмарна копія ---------- */

const fmt = (iso: string) => new Date(iso).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
export const formatBackupDate = fmt

async function fetchRemoteMeta(): Promise<(BackupInfo & { familyId: string | null }) | null> {
  const sb = await getSupabase()
  const { data, error } = await sb.from('backups').select('updated_at, records, family_id:data->>family_id').maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as { updated_at: string; records: number; family_id: string | null }
  return { updatedAt: row.updated_at, records: row.records, familyId: row.family_id }
}

async function upload(): Promise<BackupInfo> {
  const sb = await getSupabase()
  const { data: s } = await sb.auth.getSession()
  const userId = s.session?.user.id
  if (!userId) throw new Error('no_session')
  const { snapshot, records } = await makeSnapshot()
  let deviceId: string | null = null
  try { deviceId = localStorage.getItem('my-baby:device-id') } catch { /* ignore */ }
  const updatedAt = new Date().toISOString()
  const { error } = await sb.from('backups').upsert({ user_id: userId, data: snapshot, records, device_id: deviceId, updated_at: updatedAt })
  if (error) throw error
  try { localStorage.setItem(BACKUP_AT_KEY, String(Date.now())) } catch { /* ignore */ }
  const info = { updatedAt, records }
  set({ backup: info })
  return info
}

async function download() {
  const sb = await getSupabase()
  const { data, error } = await sb.from('backups').select('data').maybeSingle()
  if (error) throw error
  const snap = (data as { data?: unknown } | null)?.data
  if (!isSnapshot(snap)) throw new Error('bad_backup')
  await restoreSnapshot(snap)
}

/** Після входу: вирішуємо, відновити копію, створити її чи спитати людину. */
async function resolveAfterSignIn() {
  const [remote, session, child] = await Promise.all([
    fetchRemoteMeta(),
    getSession(),
    db.children.filter((c) => !c.deleted_at).first(),
  ])
  const localFamily = child && session ? session.familyId : null
  set({ backup: remote ? { updatedAt: remote.updatedAt, records: remote.records } : null })

  switch (decideAfterSignIn(localFamily, remote ? remote.familyId : undefined)) {
    case 'restore':
      await download()
      set({ notice: { kind: 'info', text: `Дані відновлено з копії від ${fmt(remote!.updatedAt)}.` } })
      break
    case 'upload':
      await upload()
      set({ notice: { kind: 'info', text: 'Готово! Щоденник збережено в хмарі — тепер його можна відновити на будь-якому телефоні.' } })
      break
    case 'same':
      await upload()
      set({ notice: { kind: 'info', text: 'Ви увійшли. Копію щоденника оновлено.' } })
      break
    case 'conflict':
      set({ notice: { kind: 'conflict', backup: { updatedAt: remote!.updatedAt, records: remote!.records } } })
      break
    case 'empty':
      set({ notice: { kind: 'info', text: 'Ви увійшли. Копії для цього акаунта ще немає — заповніть профіль, і вона збережеться автоматично.' } })
      break
  }
}

/** Рішення людини при конфлікті. */
export async function resolveConflict(choice: 'restore' | 'keep') {
  set({ busy: true, notice: null })
  try {
    if (choice === 'restore') {
      await download()
      set({ notice: { kind: 'info', text: 'Дані відновлено з копії.' } })
    } else {
      await upload()
      set({ notice: { kind: 'info', text: 'Копію в хмарі замінено даними з цього телефона.' } })
    }
  } catch {
    set({ notice: { kind: 'error', text: 'Не вдалося. Перевірте інтернет і спробуйте ще раз.' } })
  } finally {
    set({ busy: false })
  }
}

/** Кнопка «Зберегти копію зараз». */
export async function backupNow() {
  set({ busy: true, notice: null })
  try {
    const remote = await fetchRemoteMeta()
    const session = await getSession()
    if (decideAfterSignIn(session?.familyId ?? null, remote ? remote.familyId : undefined) === 'conflict') {
      set({ notice: { kind: 'conflict', backup: { updatedAt: remote!.updatedAt, records: remote!.records } } })
      return
    }
    await upload()
    set({ notice: { kind: 'info', text: 'Копію збережено.' } })
  } catch {
    set({ notice: { kind: 'error', text: 'Не вдалося зберегти копію. Перевірте інтернет.' } })
  } finally {
    set({ busy: false })
  }
}

/** Кнопка «Відновити з копії». */
export async function restoreNow() {
  set({ busy: true, notice: null })
  try {
    await download()
    set({ notice: { kind: 'info', text: 'Дані відновлено з копії.' } })
  } catch {
    set({ notice: { kind: 'error', text: 'Не вдалося відновити. Перевірте інтернет.' } })
  } finally {
    set({ busy: false })
  }
}

/** Дізнатися дату останньої копії (для картки «Акаунт»). */
export async function loadBackupInfo() {
  if (!state.account || state.backup !== undefined) return
  try {
    const r = await fetchRemoteMeta()
    set({ backup: r ? { updatedAt: r.updatedAt, records: r.records } : null })
  } catch { /* офлайн */ }
}

/**
 * Тиха автокопія: не частіше ніж раз на годину, лише коли є інтернет і копія належить цій же сімʼї
 * (щоб новий порожній телефон не перезаписав справжню копію).
 */
export async function autoBackup() {
  if (!isSignedIn() || !navigator.onLine || state.busy) return
  try {
    const last = Number(localStorage.getItem(BACKUP_AT_KEY) ?? 0)
    if (Date.now() - last < AUTO_EVERY_MS) return
  } catch { return }
  try {
    const [remote, session] = await Promise.all([fetchRemoteMeta(), getSession()])
    if (!session) return
    const d = decideAfterSignIn(session.familyId, remote ? remote.familyId : undefined)
    if (d === 'upload' || d === 'same') await upload()
  } catch { /* спробуємо наступного разу */ }
}
