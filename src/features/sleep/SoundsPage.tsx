import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { addLullaby, deleteLullaby } from '@/db/actions'
import { useLullabies } from '@/db/hooks'
import type { Lullaby } from '@/db/types'
import { SOUNDS } from '@/lib/noise'
import { canSetVolume, pause, play, setTimer, setVolume, TIMER_OPTIONS, usePlayer, type Source } from '@/lib/soundPlayer'
import { useNow } from '@/lib/time'
import { Card, Dot, PageTitle, Section, Segmented } from '@/ui/kit'
import { IconMic, IconMusic, IconPause, IconPlay, IconSleep, IconTrash } from '@/ui/icons'
import { RecordLullabySheet } from './RecordLullabySheet'

const MAX_FILE_MB = 40

const soundSource = (s: (typeof SOUNDS)[number]): Source => ({ id: `gen:${s.kind}`, title: s.title, kind: 'generated', sound: s.kind })
const lullabySource = (l: Lullaby): Source => ({ id: `lul:${l.id}`, title: l.title, kind: 'blob', blob: l.audio })

type TimerValue = '15' | '30' | '60' | 'off'
const TIMER_SEG: { value: TimerValue; label: string }[] = [
  ...TIMER_OPTIONS.map((m) => ({ value: String(m) as TimerValue, label: `${m} хв` })),
  { value: 'off', label: 'Весь час' },
]

/** Рядок зі звуком: натиснули — грає, ще раз — пауза. */
function SoundRow({ title, sub, icon, active, playing, onToggle, onDelete }: {
  title: string; sub?: string; icon: React.ReactNode; active: boolean; playing: boolean
  onToggle: () => void; onDelete?: () => void
}) {
  return (
    <li className="flex items-center gap-2 pr-2">
      <button onClick={onToggle} aria-pressed={active && playing}
        aria-label={`${active && playing ? 'Пауза' : 'Увімкнути'}: ${title}`}
        className="flex min-h-16 flex-1 items-center gap-3 px-4 py-2 text-left">
        <Dot tone="sleep">{icon}</Dot>
        <span className="flex-1">
          <span className={`block font-medium ${active ? 'text-sleep-ink' : ''}`}>{title}</span>
          {sub && <span className="block text-xs text-muted">{sub}</span>}
        </span>
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${active && playing ? 'bg-sleep text-white dark:text-bg' : 'bg-line text-muted'}`}>
          {active && playing ? <IconPause width={18} height={18} /> : <IconPlay width={18} height={18} />}
        </span>
      </button>
      {onDelete && (
        <button onClick={onDelete} aria-label={`Видалити: ${title}`} className="flex h-11 w-11 items-center justify-center rounded-full text-muted">
          <IconTrash width={18} height={18} />
        </button>
      )}
    </li>
  )
}

export function SoundsPage() {
  const p = usePlayer()
  const now = useNow(1000)
  const lullabies = useLullabies() ?? []
  const [recording, setRecording] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const toggle = (src: Source) => {
    if (p.source?.id === src.id && p.playing) pause()
    else void play(src)
  }

  const timerValue: TimerValue = p.timerMin === null ? 'off' : (String(p.timerMin) as TimerValue)
  const leftMin = p.endsAt === null ? null : Math.max(0, Math.ceil((p.endsAt - now) / 60_000))
  const volumeOk = canSetVolume()

  const importFile = async (file: File | undefined) => {
    setFileError(null)
    if (!file) return
    if (!file.type.startsWith('audio/')) return setFileError('Оберіть аудіофайл (mp3, m4a, wav…).')
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setFileError(`Файл завеликий — до ${MAX_FILE_MB} МБ.`)
    await addLullaby({ title: file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Колискова', audio: file, duration_sec: null, origin: 'imported' })
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
              {!p.playing ? 'Не грає' : leftMin === null ? 'Без таймера' : `Вимкнеться через ${leftMin} хв`}
            </p>
          </div>
        </div>
        {volumeOk ? (
          <label className="mt-4 block">
            <span className="mb-1 block text-xs text-white/70">Гучність</span>
            <input type="range" min={0.05} max={1} step={0.05} value={p.volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="h-8 w-full accent-white" />
          </label>
        ) : (
          <p className="mt-4 text-xs text-white/70">Гучність — кнопками телефона.</p>
        )}
        {p.error && <p role="alert" className="mt-3 text-sm text-white">{p.error}</p>}
      </section>

      <Section title="Таймер">
        <Segmented<TimerValue> value={timerValue} onChange={(v) => setTimer(v === 'off' ? null : Number(v))} options={TIMER_SEG} />
        <p className="mt-2 px-1 text-xs text-muted">
          {volumeOk ? 'Звук плавно затихає останні 30 секунд.' : 'Звук вимкнеться, коли мине час.'} Ставте тихо й подалі від ліжечка.
        </p>
      </Section>

      <Section title="Звуки">
        <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface shadow-soft">
          {SOUNDS.map((s) => {
            const src = soundSource(s)
            return (
              <SoundRow key={s.kind} title={s.title} sub={s.hint} icon={s.kind === 'musicbox' ? <IconMusic /> : <IconSleep />}
                active={p.source?.id === src.id} playing={p.playing} onToggle={() => toggle(src)} />
            )
          })}
        </ul>
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
                <SoundRow key={l.id} title={l.title} sub={l.origin === 'recorded' ? 'Записано в застосунку' : 'Додано файлом'}
                  icon={<IconMic />} active={p.source?.id === src.id} playing={p.playing}
                  onToggle={() => toggle(src)} onDelete={() => void remove(l)} />
              )
            })}
          </ul>
        )}
        {fileError && <p role="alert" className="mt-2 px-1 text-sm text-sos">{fileError}</p>}
        <input ref={fileInput} type="file" accept="audio/*" hidden
          onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = '' }} />
      </Section>

      <RecordLullabySheet open={recording} onClose={() => setRecording(false)} />
    </div>
  )
}
