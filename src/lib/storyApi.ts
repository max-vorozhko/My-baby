import { getSupabase, ensureSession } from './supabase'
import { validateInput, type StoryErrorBody, type StoryInput, type StoryResponse } from '../../supabase/functions/_shared/story'

export type { StoryInput, StoryLength } from '../../supabase/functions/_shared/story'

export type StoryErrorCode = StoryErrorBody['error'] | 'network' | 'not_configured'

export class StoryError extends Error {
  constructor(public code: StoryErrorCode, message: string) { super(message) }
}

const LEFT_KEY = 'my-baby:stories-left'

/** Скільки казок лишилось на сьогодні (за відповіддю сервера). null — ще невідомо. */
export function storiesLeftToday(now = new Date()): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(LEFT_KEY) ?? 'null') as { day: string; left: number } | null
    return v && v.day === now.toISOString().slice(0, 10) ? v.left : null
  } catch { return null }
}
function rememberLeft(left: number, now = new Date()) {
  try { localStorage.setItem(LEFT_KEY, JSON.stringify({ day: now.toISOString().slice(0, 10), left })) } catch { /* не критично */ }
}

const GENERIC = 'Не вдалося придумати казку. Спробуйте ще раз.'

/** Просить сервер придумати казку. Помилки перетворює на зрозумілі повідомлення. */
export async function generateStory(input: StoryInput): Promise<StoryResponse> {
  const v = validateInput(input)
  if (!v.ok) throw new StoryError('bad_input', v.error)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new StoryError('network', 'Немає інтернету. Казки створюються онлайн — спробуйте, коли зʼявиться звʼязок.')
  }

  let sb
  try {
    sb = await getSupabase()
    await ensureSession(sb)
  } catch (e) {
    if (e instanceof Error && e.message === 'backend_not_configured') throw new StoryError('not_configured', 'Казки ще не налаштовані.')
    throw new StoryError('auth', 'Не вдалося підключитися. Спробуйте ще раз.')
  }

  const { data, error } = await sb.functions.invoke('generate-story', { body: v.value })
  if (error) {
    // FunctionsHttpError тримає відповідь сервера в context; мережеві збої — інші класи.
    const ctx = (error as { context?: unknown }).context
    if (ctx instanceof Response) {
      const body = (await ctx.json().catch(() => null)) as StoryErrorBody | null
      throw new StoryError(body?.error ?? 'server', body?.message ?? GENERIC)
    }
    throw new StoryError('network', 'Немає звʼязку із сервером. Спробуйте ще раз.')
  }
  const res = data as Partial<StoryResponse> | null
  if (!res?.title || !res.text) throw new StoryError('server', GENERIC)
  if (typeof res.left === 'number') rememberLeft(res.left)
  return { title: res.title, text: res.text, left: res.left ?? 0 }
}
