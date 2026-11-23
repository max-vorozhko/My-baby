import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteStory, toggleStoryFavorite } from '@/db/actions'
import { useStory } from '@/db/hooks'
import { hasUkrainianVoice, narrationSupported, speak, stopNarration, useNarration } from '@/lib/speech'
import { Button } from '@/ui/kit'
import { IconPause, IconPlay, IconStar, IconTrash } from '@/ui/icons'

/** Читання казки: великий спокійний шрифт, озвучка, обране. */
export function StoryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const story = useStory(id)
  const n = useNarration()
  const [voice, setVoice] = useState(hasUkrainianVoice)

  // Голоси в браузерах підвантажуються асинхронно.
  useEffect(() => {
    if (!narrationSupported()) return
    const sync = () => setVoice(hasUkrainianVoice())
    window.speechSynthesis.addEventListener('voiceschanged', sync)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', sync)
  }, [])
  // Озвучка не має лишатися, коли пішли з екрана.
  useEffect(() => () => stopNarration(), [])

  if (story === undefined) return <div className="min-h-40" />
  if (story === null) {
    return (
      <div className="space-y-3">
        <Link to="/sleep/stories" className="inline-flex min-h-11 items-center px-1 text-sm text-accent">← Казки</Link>
        <p className="text-muted">Цієї казки немає.</p>
      </div>
    )
  }

  const remove = async () => {
    if (!confirm(`Видалити казку «${story.title}»?`)) return
    stopNarration()
    await deleteStory(story.id)
    navigate('/sleep/stories', { replace: true })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/sleep/stories" className="inline-flex min-h-11 items-center px-1 text-sm text-accent">← Казки</Link>
        <span className="flex items-center">
          <button onClick={() => toggleStoryFavorite(story.id)} aria-pressed={story.favorite}
            aria-label={story.favorite ? 'Прибрати з обраного' : 'В обране'}
            className={`flex h-11 w-11 items-center justify-center rounded-full ${story.favorite ? 'text-skin' : 'text-muted'}`}>
            <IconStar width={22} height={22} fill={story.favorite ? 'currentColor' : 'none'} />
          </button>
          <button onClick={remove} aria-label="Видалити казку" className="flex h-11 w-11 items-center justify-center rounded-full text-muted">
            <IconTrash width={20} height={20} />
          </button>
        </span>
      </div>

      <article className="space-y-5 rounded-[28px] bg-sleep-soft px-5 pt-7 pb-8 text-sleep-ink">
        <p aria-hidden className="text-center text-sm tracking-[0.5em] opacity-60">✦ ✧ ✦</p>
        <h1 className="text-balance text-center text-[28px] leading-tight font-extrabold">{story.title}</h1>
        {story.text.split(/\n{2,}/).map((p, i) => (
          <p key={i} className={`text-pretty text-[21px] leading-[1.65] ${i === 0 ? 'first-letter:float-left first-letter:mr-2 first-letter:text-[56px] first-letter:leading-[0.9] first-letter:font-extrabold' : ''}`}>{p}</p>
        ))}
        <p className="pt-2 text-center text-2xl" aria-hidden>🌙</p>
      </article>

      {narrationSupported() && (
        <div className="space-y-2">
          <Button className="flex w-full items-center justify-center gap-2" variant={n.speaking ? 'secondary' : 'primary'}
            onClick={() => (n.speaking ? stopNarration() : speak(`${story.title}.\n${story.text}`))}>
            {n.speaking ? <><IconPause width={18} height={18} /> Зупинити</> : <><IconPlay width={18} height={18} /> Прочитати вголос</>}
          </Button>
          {!voice && <p className="px-1 text-xs text-muted">На цьому пристрої немає українського голосу — озвучка може звучати дивно. Краще прочитати самим.</p>}
        </div>
      )}
    </div>
  )
}
