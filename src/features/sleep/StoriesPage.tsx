import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addStory } from '@/db/actions'
import { useStories } from '@/db/hooks'
import { getSetting, setSetting } from '@/db'
import type { Child } from '@/db/types'
import { getAge } from '@/lib/age'
import { backendEnabled } from '@/lib/supabase'
import { dictationSupported, startDictation, type Dictation } from '@/lib/speech'
import { generateStory, StoryError, storiesLeftToday, type StoryLength } from '@/lib/storyApi'
import { THEME_MAX } from '../../../supabase/functions/_shared/story'
import { Button, Card, Dot, Field, PageTitle, Section, Segmented, inputCls } from '@/ui/kit'
import { IconBook, IconMic, IconStar } from '@/ui/icons'
import { GoogleButton } from '@/features/account/Account'
import { useAccount } from '@/lib/account'

const EXAMPLES = [
  'Ми ходили в парк і годували качок',
  'Малюк уперше їв кашу сам ложкою',
  'Бабуся приїхала в гості й привезла яблучко',
  'Ми купалися у ванночці з гумовою качечкою',
]

const CONSENT_KEY = 'stories_consent'
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })

/** Казка на ніч: батьки пишуть чи диктують тему — AI робить із неї казку. */
export function StoriesPage({ child }: { child: Child }) {
  const navigate = useNavigate()
  const stories = useStories(child.id) ?? []
  const [theme, setTheme] = useState('')
  const [length, setLength] = useState<StoryLength>('short')
  const [useName, setUseName] = useState(true)
  const [consent, setConsent] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needSignIn, setNeedSignIn] = useState(false)
  const { account } = useAccount()
  const [listening, setListening] = useState(false)
  const [left, setLeft] = useState<number | null>(storiesLeftToday)
  const dictation = useRef<Dictation | null>(null)
  const alive = useRef(true)

  useEffect(() => { void getSetting<boolean>(CONSENT_KEY).then((v) => setConsent(Boolean(v))) }, [])
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; dictation.current?.stop() }
  }, [])

  const acceptConsent = async () => { await setSetting(CONSENT_KEY, true); setConsent(true) }

  const toggleDictation = () => {
    if (listening) { dictation.current?.stop(); return }
    setError(null)
    const base = theme.trim() ? theme.trim() + ' ' : ''
    dictation.current = startDictation({
      onText: (t) => setTheme((base + t).slice(0, THEME_MAX)),
      onEnd: () => { setListening(false); dictation.current = null },
      onError: setError,
    })
    setListening(dictation.current !== null)
  }

  const submit = async () => {
    dictation.current?.stop()
    setBusy(true); setError(null); setNeedSignIn(false)
    try {
      const res = await generateStory({
        theme, childName: useName ? child.name : null, length,
        ageMonths: getAge(child.birth_date, child.preterm_weeks).months,
      })
      // Зберігаємо навіть якщо користувач встиг піти з екрана — казка не загубиться.
      const story = await addStory({ childId: child.id, prompt: theme.trim(), title: res.title, text: res.text, length })
      if (!alive.current) return
      setLeft(storiesLeftToday())
      setTheme('')
      navigate(`/sleep/stories/${story.id}`)
    } catch (e) {
      if (!alive.current) return
      setError(e instanceof StoryError ? e.message : 'Не вдалося придумати казку. Спробуйте ще раз.')
      setNeedSignIn(e instanceof StoryError && e.code === 'limit_guest')
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const ready = theme.trim().length >= 3 && consent === true && !busy

  return (
    <div className="space-y-5">
      <Link to="/sleep" className="inline-flex min-h-11 items-center px-1 text-sm text-accent">← Сон</Link>
      <PageTitle sub="Розкажіть, що було — вийде казка для малюка">Казка на ніч</PageTitle>

      {!backendEnabled() ? (
        <Card><p className="text-sm text-muted">Казки ще не підключені до сервера. Додайте адресу Supabase в налаштування збірки — див. README.</p></Card>
      ) : (
        <div className="space-y-4">
          <Field label="Про що казка?" hint={`${theme.length}/${THEME_MAX}`}>
            <div className="relative">
              <textarea className={`${inputCls} min-h-32 resize-none py-3 pr-14`} value={theme} maxLength={THEME_MAX} disabled={busy}
                onChange={(e) => setTheme(e.target.value)} placeholder="Наприклад: сьогодні ми були в парку й бачили качок" />
              {dictationSupported() && (
                <button type="button" onClick={toggleDictation} disabled={busy}
                  aria-label={listening ? 'Зупинити диктування' : 'Надиктувати тему'} aria-pressed={listening}
                  className={`absolute right-2 bottom-2 flex h-11 w-11 items-center justify-center rounded-full ${listening ? 'bg-sos text-white' : 'bg-accent-soft text-accent'}`}>
                  <IconMic width={20} height={20} />
                </button>
              )}
            </div>
          </Field>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" disabled={busy} onClick={() => setTheme(ex)}
                className="min-h-10 shrink-0 rounded-full border border-line bg-surface px-4 text-sm text-muted">{ex}</button>
            ))}
          </div>

          <Field label="Довжина" group>
            <Segmented<StoryLength> value={length} onChange={setLength} options={[
              { value: 'short', label: 'Коротка · 2 хв' }, { value: 'medium', label: 'Довша · 4 хв' },
            ]} />
          </Field>

          <label className="flex min-h-12 items-center justify-between gap-3">
            <span>
              <span className="block font-medium">Герой — {child.name}</span>
              <span className="block text-sm text-muted">Без імені герой буде лагідним звірятком</span>
            </span>
            <input type="checkbox" role="switch" className="h-6 w-6 shrink-0 accent-[var(--color-accent)]" checked={useName} onChange={(e) => setUseName(e.target.checked)} />
          </label>

          {consent === false && (
            <Card className="space-y-3">
              <p className="text-sm text-muted">
                Щоб створити казку, тема{useName ? ' та імʼя малюка' : ''} надсилаються на сервер і до AI-сервісу. Сервер не зберігає ні теми, ні казки: вони лишаються лише на вашому телефоні.
              </p>
              <Button variant="secondary" className="w-full" onClick={acceptConsent}>Зрозуміло, погоджуюсь</Button>
            </Card>
          )}

          <Button className="w-full" disabled={!ready} onClick={submit}>
            {busy ? 'Вигадую казку… це займе хвилинку' : 'Створити казку'}
          </Button>
          {busy && <p className="text-center text-sm text-muted" aria-live="polite">🌙 Можна не виходити з екрана</p>}
          {error && <p role="alert" className="rounded-2xl bg-sos/10 px-4 py-3 text-sm text-sos">{error}</p>}
          {needSignIn && !account && <GoogleButton>Увійти · 5 казок на день</GoogleButton>}
          {left !== null && !busy && <p className="text-center text-xs text-muted">Сьогодні ще казок: {left}</p>}
        </div>
      )}

      <Section title="Мої казки">
        {stories.length === 0 ? (
          <Card className="flex items-start gap-3">
            <Dot tone="sleep"><IconBook /></Dot>
            <p className="text-sm text-muted">Тут зберігатимуться ваші казки. Улюблені можна позначити зіркою й перечитувати без інтернету.</p>
          </Card>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface shadow-soft">
            {stories.map((s) => (
              <li key={s.id}>
                <Link to={`/sleep/stories/${s.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2">
                  <Dot tone="sleep"><IconBook /></Dot>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.title}</span>
                    <span className="block truncate text-xs text-muted">{fmtDate(s.created_at)} · {s.prompt}</span>
                  </span>
                  {s.favorite && <IconStar width={18} height={18} className="shrink-0 text-skin" fill="currentColor" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
