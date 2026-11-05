import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSetting } from '@/db'
import type { Child } from '@/db/types'

/** undefined — ще вантажиться, null — профілю немає (показуємо онбординг). */
export function useActiveChild(): Child | null | undefined {
  return useLiveQuery(async () => {
    const id = await getSetting<string>('activeChildId')
    const child = id ? await db.children.get(id) : undefined
    if (child && !child.deleted_at) return child
    const first = await db.children.filter((c) => !c.deleted_at).first()
    return first ?? null
  }, [])
}
