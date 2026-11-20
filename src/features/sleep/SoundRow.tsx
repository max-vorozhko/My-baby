import type { ReactNode } from 'react'
import { lullabyBlob } from '@/db/actions'
import type { Lullaby } from '@/db/types'
import type { Source } from '@/lib/soundPlayer'
import { Dot } from '@/ui/kit'
import { IconPause, IconPlay, IconTrash } from '@/ui/icons'

export const lullabySource = (l: Lullaby): Source => ({ id: `lul:${l.id}`, title: l.title, kind: 'blob', blob: lullabyBlob(l) })

/** Рядок зі звуком: натиснули — грає, ще раз — пауза. */
export function SoundRow({ title, sub, icon, active, playing, highlight, onToggle, onDelete, rowId }: {
  title: string; sub?: string; icon: ReactNode; active: boolean; playing: boolean; highlight?: boolean
  onToggle: () => void; onDelete?: () => void; rowId?: string
}) {
  return (
    <li id={rowId} className={`flex items-center gap-2 pr-2 transition-colors duration-700 ${highlight ? 'bg-sleep/15' : ''}`}>
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
