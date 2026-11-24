// Supabase Edge Function: генерація казки на ніч. Ключ Anthropic живе лише тут, у секретах.
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildPrompt, DEFAULT_MODEL, parseStory, validateInput,
  type StoryErrorBody, type StoryResponse,
} from '../_shared/story.ts'

const env = (k: string) => Deno.env.get(k) ?? ''
const num = (k: string, d: number) => { const v = parseInt(env(k), 10); return Number.isFinite(v) && v > 0 ? v : d }

const ALLOWED = (env('ALLOWED_ORIGINS') || 'https://max-vorozhko.github.io,http://localhost:5173,http://127.0.0.1:4173')
  .split(',').map((s) => s.trim()).filter(Boolean)

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  if (origin && ALLOWED.includes(origin)) h['Access-Control-Allow-Origin'] = origin
  return h
}

function json(body: StoryResponse | StoryErrorBody, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
const fail = (error: StoryErrorBody['error'], message: string, status: number, cors: Record<string, string>) =>
  json({ error, message }, status, cors)

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return fail('bad_input', 'Метод не підтримується.', 405, cors)

  const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

  // 1. Хто викликає. Анонімний вхід теж дає справжній JWT і стабільний user.id на пристрій.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth, error: authErr } = token ? await supabase.auth.getUser(token) : { data: null, error: new Error('no token') }
  if (authErr || !auth?.user) return fail('auth', 'Потрібен вхід. Оновіть застосунок і спробуйте ще раз.', 401, cors)
  const userId = auth.user.id

  // 2. Валідація вводу.
  let body: unknown
  try { body = await req.json() } catch { return fail('bad_input', 'Некоректний запит.', 400, cors) }
  const v = validateInput(body)
  if (!v.ok) return fail('bad_input', v.error, 400, cors)

  // 3. Ліміти: на користувача і загальний денний (щоб бюджет не можна було спалити).
  const userLimit = num('STORY_DAILY_LIMIT', 5)
  const { data: quota, error: quotaErr } = await supabase.rpc('consume_story_quota', {
    p_user: userId, p_user_limit: userLimit, p_global_limit: num('STORY_GLOBAL_DAILY_LIMIT', 300),
  })
  if (quotaErr || !quota) {
    console.error('quota error', quotaErr?.message)
    return fail('server', 'Сталася помилка. Спробуйте пізніше.', 500, cors)
  }
  if (!quota.ok) {
    return quota.reason === 'global'
      ? fail('busy', 'Сьогодні казок дуже багато. Спробуйте завтра.', 429, cors)
      : fail('limit', `Сьогодні ліміт казок вичерпано (${userLimit}). Нові будуть завтра.`, 429, cors)
  }
  const refund = () => supabase.rpc('refund_story_quota', { p_user: userId })

  // 4. Запит до моделі.
  const { system, user, maxTokens } = buildPrompt(v.value)
  const ctrl = new AbortController()
  // Довша казка українською може писатися понад хвилину; ліміт Edge Function — 150 с.
  const timeout = setTimeout(() => ctrl.abort(), 110_000)
  try {
    const res = await fetch(env('ANTHROPIC_API_URL') || 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env('STORY_MODEL') || DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!res.ok) {
      console.error('anthropic status', res.status)
      await refund()
      return fail('upstream', 'Не вдалося придумати казку. Спробуйте ще раз.', 502, cors)
    }
    const data = await res.json()
    const raw = (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n')
    // Обрізана казка без «сонного» фіналу нам не підходить.
    const parsed = data.stop_reason === 'max_tokens' ? { ok: false as const, error: 'truncated' } : parseStory(raw)
    if (!parsed.ok) {
      console.error('parse failed', parsed.error)
      await refund()
      return fail('upstream', 'Казка не вийшла. Спробуйте ще раз.', 502, cors)
    }
    return json({ title: parsed.title, text: parsed.text, left: quota.left }, 200, cors)
  } catch (e) {
    console.error('generate error', e instanceof Error ? e.name : 'unknown')
    await refund()
    return fail('upstream', 'Не вдалося придумати казку. Спробуйте ще раз.', 502, cors)
  } finally {
    clearTimeout(timeout)
  }
})
