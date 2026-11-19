import type { SupabaseClient } from '@supabase/supabase-js'

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/** Чи налаштований бекенд. Без нього функції з AI не показуємо. */
export const backendEnabled = () => Boolean(URL_ && KEY)

let client: Promise<SupabaseClient> | null = null

/** Клієнт вантажимо ліниво: бібліотека потрібна лише тим, хто відкрив казки. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!URL_ || !KEY) return Promise.reject(new Error('backend_not_configured'))
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'my-baby:auth' } }),
  )
  return client
}

/** Анонімний вхід: стабільний id пристрою без пошти й пароля (ліміти рахуються на нього). */
export async function ensureSession(sb: SupabaseClient) {
  const { data } = await sb.auth.getSession()
  if (data.session) return data.session
  const { data: anon, error } = await sb.auth.signInAnonymously()
  if (error || !anon.session) throw new Error('auth_failed')
  return anon.session
}
