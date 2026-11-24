/**
 * Резервна копія щоденника для акаунта Google: увесь Dexie (крім фото й аудіо колискових) — одним JSON у таблиці backups.
 * Одна копія на акаунт; «останній записав — той і правий» (синхронізація між пристроями — окремий етап).
 */
import { db, getSession, nowISO } from '@/db'

/** Таблиці, яких немає в копії: аудіо колискових важке і лишається лише на телефоні. */
const SKIP = new Set(['lullabies'])

export interface Snapshot {
  app: 'my-baby'
  version: 1
  family_id: string | null
  created_at: string
  data: Record<string, Record<string, unknown>[]>
}

const isBinary = (v: unknown) =>
  (typeof Blob !== 'undefined' && v instanceof Blob) || v instanceof ArrayBuffer || ArrayBuffer.isView(v)

export async function makeSnapshot(): Promise<{ snapshot: Snapshot; records: number }> {
  const data: Snapshot['data'] = {}
  let records = 0
  for (const table of db.tables) {
    if (SKIP.has(table.name)) continue
    const rows = (await table.toArray()) as Record<string, unknown>[]
    data[table.name] = rows.map((r) => {
      const copy = { ...r }
      for (const k of Object.keys(copy)) if (isBinary(copy[k])) copy[k] = null
      return copy
    })
    if (table.name !== 'settings') records += rows.length
  }
  const session = await getSession()
  return { snapshot: { app: 'my-baby', version: 1, family_id: session?.familyId ?? null, created_at: nowISO(), data }, records }
}

export function isSnapshot(v: unknown): v is Snapshot {
  const s = v as Snapshot | null
  return !!s && s.app === 'my-baby' && s.version === 1 && typeof s.data === 'object' && s.data !== null
}

/** Замінює дані на телефоні даними з копії. Колискові (аудіо) не чіпаємо. */
export async function restoreSnapshot(snap: Snapshot) {
  const tables = db.tables.filter((t) => !SKIP.has(t.name))
  await db.transaction('rw', tables, async () => {
    for (const t of tables) {
      await t.clear()
      const rows = snap.data[t.name]
      if (Array.isArray(rows) && rows.length) await t.bulkPut(rows)
    }
  })
}

/** Що робити після входу, залежно від того, що є на телефоні і в хмарі. */
export type AfterSignIn =
  | 'restore'   // на телефоні порожньо, у хмарі є копія — відновлюємо
  | 'upload'    // копії ще немає, на телефоні є дані — зберігаємо
  | 'same'      // копія цієї ж сімʼї — просто оновимо її згодом
  | 'conflict'  // на телефоні й у хмарі різні сімʼї — питаємо людину
  | 'empty'     // ні там, ні там нічого

export function decideAfterSignIn(localFamily: string | null, remoteFamily: string | null | undefined): AfterSignIn {
  const hasRemote = remoteFamily !== undefined
  if (!localFamily) return hasRemote ? 'restore' : 'empty'
  if (!hasRemote) return 'upload'
  return remoteFamily === localFamily ? 'same' : 'conflict'
}
