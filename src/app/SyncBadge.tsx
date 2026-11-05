import { useOnline } from '@/lib/storage'
import { IconCloudOff, IconDevice } from '@/ui/icons'

/** Ненав'язливий стан збереження (ТЗ 7). До підключення Supabase — лише локально. */
export function SyncBadge() {
  const online = useOnline()
  return (
    <span className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs text-muted border border-line">
      {online ? <IconDevice width={14} height={14} /> : <IconCloudOff width={14} height={14} />}
      {online ? 'Збережено на телефоні' : 'Офлайн · збережено'}
    </span>
  )
}
