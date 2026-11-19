import Dexie, { type EntityTable } from 'dexie'
import type {
  BaseRecord, Child, Family, Feeding, FoodIntro, Lullaby, Meal, Member, Reaction, Setting, SkinCare, SkinCheck, Sleep, CustomFood, Story,
} from './types'

export class MyBabyDB extends Dexie {
  families!: EntityTable<Family, 'id'>
  members!: EntityTable<Member, 'id'>
  children!: EntityTable<Child, 'id'>
  sleeps!: EntityTable<Sleep, 'id'>
  feedings!: EntityTable<Feeding, 'id'>
  meals!: EntityTable<Meal, 'id'>
  foodIntros!: EntityTable<FoodIntro, 'id'>
  reactions!: EntityTable<Reaction, 'id'>
  settings!: EntityTable<Setting, 'key'>
  skinChecks!: EntityTable<SkinCheck, 'id'>
  skinCare!: EntityTable<SkinCare, 'id'>
  customFoods!: EntityTable<CustomFood, 'id'>
  lullabies!: EntityTable<Lullaby, 'id'>
  stories!: EntityTable<Story, 'id'>

  constructor() {
    super('my-baby')
    this.version(1).stores({
      families: 'id',
      members: 'id, family_id, user_id',
      children: 'id, family_id',
      sleeps: 'id, child_id, [child_id+start_at], end_at',
      feedings: 'id, child_id, [child_id+start_at]',
      meals: 'id, child_id, [child_id+at]',
      foodIntros: 'id, child_id, [child_id+food_id], status',
      reactions: 'id, child_id, [child_id+at]',
      settings: 'key',
    })
    // v2: модуль «Шкіра»
    this.version(2).stores({
      skinChecks: 'id, child_id, [child_id+date]',
      skinCare: 'id, child_id, [child_id+at]',
    })
    // v3: власні продукти
    this.version(3).stores({ customFoods: 'id, family_id' })
    // v4: власні колискові (аудіо-блоби)
    this.version(4).stores({ lullabies: 'id, family_id' })
    // v5: казки на ніч
    this.version(5).stores({ stories: 'id, child_id, [child_id+created_at]' })
  }
}

export const db = new MyBabyDB()

/** UUID v4. crypto.randomUUID немає поза HTTPS і на iOS < 15.4 — тоді збираємо з getRandomValues. */
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
export const nowISO = () => new Date().toISOString()

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db.settings.get(key))?.value as T | undefined
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}

/** Локальний «користувач» до появи авторизації (етап Supabase). */
export interface Session {
  userId: string
  familyId: string
}

export async function getSession(): Promise<Session | undefined> {
  return getSetting<Session>('session')
}

/** Поля, які додаються до кожного нового запису. */
export function baseFields(session: Session): BaseRecord {
  const now = nowISO()
  return {
    id: uuid(),
    family_id: session.familyId,
    created_by: session.userId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }
}

/** Перший запуск: створює сім'ю, учасника-батька і дитину. */
export async function createFamilyWithChild(input: {
  parentName: string
  child: Pick<Child, 'name' | 'birth_date' | 'sex' | 'preterm_weeks'>
}): Promise<Child> {
  return db.transaction('rw', [db.families, db.members, db.children, db.settings], async () => {
    const familyId = uuid()
    const userId = `local-${uuid()}`
    const session: Session = { userId, familyId }
    await db.families.add({ id: familyId, name: `Сім'я ${input.child.name}`, created_at: nowISO() })
    await db.members.add({
      id: uuid(), family_id: familyId, user_id: userId,
      display_name: input.parentName || 'Я', role: 'parent',
    })
    const child: Child = { ...baseFields(session), ...input.child, photo: null }
    await db.children.add(child)
    await setSetting('session', session)
    await setSetting('activeChildId', child.id)
    return child
  })
}

export async function updateChild(id: string, patch: Partial<Child>) {
  await db.children.update(id, { ...patch, updated_at: nowISO() })
}

/** Експорт усіх даних у JSON (ТЗ 6: «Експорт усіх даних»). Фото й аудіо поки не включаємо. */
export async function exportAll() {
  const dump: Record<string, unknown[]> = {}
  for (const table of db.tables) {
    const rows = await table.toArray()
    dump[table.name] = rows.map((r) => {
      const copy = { ...r } as Record<string, unknown>
      // Бінарні поля (фото, аудіо) у JSON-експорт не потрапляють.
      for (const k of Object.keys(copy)) if (copy[k] instanceof Blob) copy[k] = null
      return copy
    })
  }
  return { app: 'my-baby', version: 1, exported_at: nowISO(), data: dump }
}

export async function wipeAll() {
  await db.delete()
  await db.open()
}
