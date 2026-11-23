import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { addLullaby, deleteLullaby } from '@/db/actions'
import { useLullabies } from '@/db/hooks'
import type { Lullaby } from '@/db/types'
import { SOUNDS } from '@/lib/noise'
import { canSetVolume, pause, play, setTimer, setVolume, TIMER_OPTIONS, usePlayer, type Source } from '@/lib/soundPlayer'
import { formatClock, useNow } from '@/lib/time'
import { Card, Dot, PageTitle, Section, Segmented } from '@/ui/kit'
import { IconMic, IconMusic, IconPause, IconPlay, IconSleep } from '@/ui/icons'
import { RecordLullabySheet } from './RecordLullabySheet'
import { lullabySource, SoundRow } from './SoundRow'

const MAX_FILE_MB = 40

const soundSource = (s: (typeof SOUNDS)[number]): Source => ({ id: `gen:${s.kind}`, title: s.title, kind: 'generated', sound: s.kind })

type TimerValue = '15' | '30' | '60' | 'off'
const TIMER_SEG: { value: TimerValue; label: string }[] = [
  ...TIMER_OPTIONS.map((m) => ({ value: String(m) as TimerValue, label: `${m} хв` })),
  { value: 'off', label: 'Весь час' },
]

export function SoundsPage() {
  const p = usePlayer()
  const now = useNow(1000)
  const lullabies = useLullabies() ?? []
  const [recording, setRecording] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  /** Щойно збережена колискова: підсвічуємо й прокручуємо до неї, показуємо «Збережено». */
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    if (!savedId || !lullabies.some((l) => l.id === savedId)) return
    document.getElementById(`lul-${savedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => setSavedId(null), 4000)
    return () => clearTimeout(t)
  }, [savedId, lullabies])

  const toggle = (src: Source) => {
    if (p.source?.id === src.id && p.playing) pause()
    else void play(src)
  }

  const timerValue: TimerValue = p.timerMin === null ? 'off' : (String(p.timerMin) as TimerValue)
  const leftMs = p.endsAt === null ? null : Math.max(0, p.endsAt - now)
  const totalMs = p.timerMin === null ? null : p.timerMin * 60_000
  const volumeOk = canSetVolume()

  const importFile = async (file: File | undefined) => {
    setFileError(null)
    if (!file) return
    if (!file.type.startsWith('audio/')) return setFileError('Оберіть аудіофайл (mp3, m4a, wav…).')
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setFileError(`Файл завеликий — до ${MAX_FILE_MB} МБ.`)
    try {
      const id = await addLullaby({ title: file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Колискова', audio: file, duration_sec: null, origin: 'imported' })
      setSavedId(id)
    } catch {
      setFileError('Не вдалося зберегти файл. Можливо, на телефоні замало місця.')
    }
  }

  const remove = async (l: Lullaby) => {
    if (!confirm(`Видалити «${l.title}»?`)) return
    if (p.source?.id === `lul:${l.id}`) pause()
    await deleteLullaby(l.id)
  }

  return (
    <div className="space-y-5">
      <Link to="/sleep" className="inline-flex min-h-11 items-center px-1 text-sm text-accent">← Сон</Link>
      <PageTitle sub="Шум, колискові й таймер">Засинання</PageTitle>

      <section className="rounded-3xl bg-gradient-to-br from-night-1 via-night-2 to-night-3 p-5 text-white shadow-lift">
        <div className="flex items-center gap-4">
          <button
            onClick={() => (p.playing ? pause() : void play(p.source ?? soundSource(SOUNDS[2])))}
            aria-label={p.playing ? 'Пауза' : 'Грати'}
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-white/20 active:scale-95">
            {p.playing ? <IconPause width={30} height={30} /> : <IconPlay width={30} height={30} />}
          </button>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">{p.source?.title ?? 'Оберіть звук'}</p>
            <p className="text-sm text-white/70" aria-live="polite">
              {!p.playing
                ? p.timerMin === null ? 'Не грає' : `Не грає · таймер ${p.timerMin} хв`
                : leftMs === null ? 'Грає без таймера' : <>Вимкнеться через <b className="tabular-nums text-white">{formatClock(leftMs)}</b></>}
            </p>
          </div>
        </div>
        {p.playing && leftMs !== null && totalMs && (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20" aria-hidden>
            <div className="h-full rounded-full bg-white/80 transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, (leftMs / totalMs) * 100)}%` }} />
          </div>
        )}
        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-white/70">Гучність{!volumeOk && ' · змінюється за мить після того, як відпустите'}</span>
          <input type="range" min={0.05} max={1} step={0.05} value={p.volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="h-8 w-full accent-white" />
        </label>
        {p.error && <p role="alert" className="mt-3 text-sm text-white">{p.error}</p>}
      </section>

      <Section title="Таймер">
        <Segmented<TimerValue> value={timerValue} onChange={(v) => setTimer(v === 'off' ? null : Number(v))} options={TIMER_SEG} />
        <p className="mt-2 px-1 text-xs text-muted">
          {volumeOk ? 'Звук плавно затихає останні 30 секунд.' : 'Звук вимкнеться, коли мине час.'} Таймер іде, поки звук грає. Ставте тихо й подалі від ліжечка.
        </p>
      </Section>

      <Section title="Мої колискові"
        action={
          <span className="flex items-center gap-1">
            <button onClick={() => setRecording(true)} className="min-h-11 px-2 text-sm text-accent">+ Записати</button>
            <button onClick={() => fileInput.current?.click()} className="min-h-11 px-2 text-sm text-accent">+ Файл</button>
          </span>
        }>
        {lullabies.length === 0 ? (
          <Card className="flex items-start gap-3">
            <Dot tone="sleep"><IconMic /></Dot>
            <p className="text-sm text-muted">Запишіть колискову своїм голосом або додайте файл — малюк знає ваш голос найкраще. Записи лишаються лише на цьому телефоні.</p>
          </Card>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface shadow-soft">
            {lullabies.map((l) => {
              const src = lullabySource(l)
              return (
                <SoundRow key={l.id} rowId={`lul-${l.id}`} highlight={savedId === l.id} title={l.title} sub={l.origin === 'recorded' ? 'Записано в застосунку' : 'Додано файлом'}
                  icon={<IconMic />} active={p.source?.id === src.id} playing={p.playing}
                  onToggle={() => toggle(src)} onDelete={() => void remove(l)} />
              )
            })}
          </ul>
        )}
        {p.error && p.source?.kind === 'blob' && <p role="alert" className="mt-2 px-1 text-sm text-sos">{p.error}</p>}
        {savedId && <p role="status" className="mt-2 px-1 text-sm font-medium text-sleep-ink">✓ Збережено. Натисніть на колискову, щоб увімкнути.</p>}
        {fileError && <p role="alert" className="mt-2 px-1 text-sm text-sos">{fileError}</p>}
        <input ref={fileInput} type="file" accept="audio/*" hidden
          onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = '' }} />
      </Section>

      <Section title="Звуки">
        <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface shadow-soft">
          {SOUNDS.map((s) => {
            const src = soundSource(s)
            return (
              <SoundRow key={s.kind} title={s.title} sub={s.hint} icon={s.kind === 'musicbox' || s.kind === 'swing' ? <IconMusic /> : <IconSleep />}
                active={p.source?.id === src.id} playing={p.playing} onToggle={() => toggle(src)} />
            )
          })}
        </ul>
      </Section>

      <RecordLullabySheet open={recording} onClose={() => setRecording(false)} onSaved={setSavedId} />
    </div>
  )
}
