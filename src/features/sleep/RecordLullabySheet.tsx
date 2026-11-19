import { useEffect, useRef, useState } from 'react'
import { addLullaby } from '@/db/actions'
import { Sheet } from '@/ui/Sheet'
import { Button, Field, inputCls } from '@/ui/kit'
import { IconMic } from '@/ui/icons'

const MAX_SECONDS = 10 * 60

/** Safari пише audio/mp4, Chrome — webm: беремо перший формат, який підтримує браузер. */
function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t))
}

const defaultTitle = () => `Колискова ${new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}`
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

type Phase = 'idle' | 'recording' | 'review'

/** Запис колискової голосом батьків. Аудіо зберігається лише на цьому телефоні. */
export function RecordLullabySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [secs, setSecs] = useState(0)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const blob = useRef<Blob | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const release = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null }
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }

  const reset = () => {
    release()
    if (recorder.current && recorder.current.state !== 'inactive') {
      recorder.current.onstop = null
      recorder.current.stop()
    }
    recorder.current = null
    blob.current = null
    chunks.current = []
    setPreviewUrl((u) => { if (u) URL.revokeObjectURL(u); return null })
    setPhase('idle'); setSecs(0); setError(null); setTitle('')
  }

  // Закриття шторки завжди звільняє мікрофон.
  useEffect(() => { if (!open) reset() }, [open])
  useEffect(() => reset, [])

  const start = async () => {
    setError(null)
    const mime = pickMime()
    if (!navigator.mediaDevices?.getUserMedia || !mime) {
      setError('Цей браузер не підтримує запис звуку. Додайте готовий файл.')
      return
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Немає доступу до мікрофона. Дозвольте його в налаштуваннях браузера.')
      return
    }
    chunks.current = []
    const rec = new MediaRecorder(stream.current, { mimeType: mime })
    recorder.current = rec
    rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
    rec.onstop = () => {
      release()
      blob.current = new Blob(chunks.current, { type: rec.mimeType || mime })
      setPreviewUrl(URL.createObjectURL(blob.current))
      setTitle((t) => t || defaultTitle())
      setPhase('review')
    }
    rec.start()
    setSecs(0)
    setPhase('recording')
    const t0 = Date.now()
    timer.current = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000)
      setSecs(s)
      if (s >= MAX_SECONDS) rec.stop()
    }, 250)
  }

  const stop = () => recorder.current?.stop()

  const save = async () => {
    if (!blob.current) return
    await addLullaby({ title, audio: blob.current, duration_sec: secs, origin: 'recorded' })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Записати колискову">
      <div className="space-y-4">
        {phase === 'idle' && (
          <>
            <p className="text-sm text-muted">Заспівайте або розкажіть — малюк знає ваш голос. Запис лишається лише на цьому телефоні.</p>
            <Button className="flex w-full items-center justify-center gap-2" onClick={start}><IconMic width={20} height={20} /> Почати запис</Button>
          </>
        )}
        {phase === 'recording' && (
          <>
            <p className="text-center text-4xl font-extrabold tabular-nums" aria-live="off">{mmss(secs)}</p>
            <p className="text-center text-sm text-muted">Іде запис…</p>
            <Button variant="danger" className="w-full" onClick={stop}>Зупинити</Button>
          </>
        )}
        {phase === 'review' && previewUrl && (
          <>
            <audio controls src={previewUrl} className="w-full" />
            <Field label="Назва"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} /></Field>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={reset}>Записати знову</Button>
              <Button className="flex-1" onClick={save} disabled={!title.trim()}>Зберегти</Button>
            </div>
          </>
        )}
        {error && <p role="alert" className="text-sm text-sos">{error}</p>}
      </div>
    </Sheet>
  )
}
