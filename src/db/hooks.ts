import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './index'
import { DAY_MS, HOUR } from '@/lib/time'

/** Сни дитини з моменту `since` (з запасом 16 год, щоб захопити нічний сон через північ). */
export function useSleepsSince(childId: string, since: number) {
  return useLiveQuery(async () => {
    const from = new Date(since - 16 * HOUR).toISOString()
    const rows = await db.sleeps.where('[child_id+start_at]').between([childId, from], [childId, '￿']).toArray()
    return rows.filter((s) => !s.deleted_at)
  }, [childId, since]) ?? []
}

export function useFeedingsSince(childId: string, since: number) {
  return useLiveQuery(async () => {
    const from = new Date(since).toISOString()
    const rows = await db.feedings.where('[child_id+start_at]').between([childId, from], [childId, '￿']).toArray()
    return rows.filter((f) => !f.deleted_at)
  }, [childId, since]) ?? []
}

/** Останні два тижні снів — для прогнозу і підказки переходу. */
export const useRecentSleeps = (childId: string, dayStart: number) => useSleepsSince(childId, dayStart - 13 * DAY_MS)
