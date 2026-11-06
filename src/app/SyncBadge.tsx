import { useOnline } from '@/lib/storage'

/** Ненав'язливий стан збереження. До синхронізації — лише локально. */
export function SyncBadge() {
  const online = useOnline()
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <i className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-food' : 'bg-muted'}`} />
      {online ? 'Збережено на телефоні' : 'Офлайн · збережено'}
    </span>
  )
}
