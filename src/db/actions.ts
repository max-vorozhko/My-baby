import { baseFields, db, getSession, nowISO, setSetting, getSetting } from './index'
import type { BottleContent, BreastSide, Feeding, Sleep, SleepKind } from './types'
import { defaultKind } from '@/lib/sleep'

async function session() {
  const s = await getSession()
  if (!s) throw new Error('Немає сесії — пройдіть онбординг')
  return s
}

const touch = <T extends object>(patch: T) => ({ ...patch, updated_at: nowISO() })

// ---------- Сон ----------

export async function getActiveSleep(childId: string) {
  return db.sleeps.where('child_id').equals(childId).filter((s) => !s.end_at && !s.deleted_at).first()
}

/** «Заснув». На дитину допускається лише один активний сон. */
export async function startSleep(childId: string, at = new Date()) {
  const s = await session()
  return db.transaction('rw', db.sleeps, async () => {
    const active = await getActiveSleep(childId)
    if (active) return active
    const sleep: Sleep = {
      ...baseFields(s), child_id: childId, start_at: at.toISOString(), end_at: null,
      kind: defaultKind(at), wake_ups: 0, note: '',
    }
    await db.sleeps.add(sleep)
    return sleep
  })
}

/** «Прокинувся». */
export async function endSleep(childId: string, at = new Date()) {
  const active = await getActiveSleep(childId)
  if (!active) return
  const end = Math.max(at.getTime(), new Date(active.start_at).getTime() + 60_000)
  await db.sleeps.update(active.id, touch({ end_at: new Date(end).toISOString() }))
}

export async function addWakeUp(id: string, delta = 1) {
  const s = await db.sleeps.get(id)
  if (!s) return
  await db.sleeps.update(id, touch({ wake_ups: Math.max(0, s.wake_ups + delta) }))
}

export async function saveSleep(input: {
  id?: string; childId: string; start_at: string; end_at: string | null; kind: SleepKind; wake_ups: number; note: string
}) {
  const fields = {
    start_at: input.start_at, end_at: input.end_at, kind: input.kind, wake_ups: input.wake_ups, note: input.note,
  }
  if (input.id) {
    await db.sleeps.update(input.id, touch(fields))
  } else {
    const s = await session()
    await db.sleeps.add({ ...baseFields(s), child_id: input.childId, ...fields })
  }
}

export async function deleteSleep(id: string) {
  await db.sleeps.update(id, touch({ deleted_at: nowISO() }))
}

// ---------- Груди / пляшечка ----------

export async function getActiveFeeding(childId: string) {
  return db.feedings.where('child_id').equals(childId).filter((f) => !f.end_at && !f.deleted_at).first()
}

/** Почати груди. Якщо вже йде годування — завершуємо його (зміна сторони). */
export async function startBreast(childId: string, side: BreastSide) {
  const now = nowISO() // час тапу, а не завершення запису
  const s = await session()
  return db.transaction('rw', db.feedings, async () => {
    const active = await getActiveFeeding(childId)
    if (active) {
      if (active.side === side) return active
      await db.feedings.update(active.id, touch({ end_at: now }))
    }
    const f: Feeding = {
      ...baseFields(s), child_id: childId, kind: 'breast', start_at: now, end_at: null,
      side, bottle_content: null, amount_ml: null, note: '',
    }
    await db.feedings.add(f)
    return f
  })
}

export async function stopFeeding(childId: string) {
  const now = nowISO()
  const active = await getActiveFeeding(childId)
  if (active) await db.feedings.update(active.id, touch({ end_at: now }))
}

export async function addBottle(childId: string, content: BottleContent, amountMl: number, at = new Date()) {
  const s = await session()
  const iso = at.toISOString()
  await db.feedings.add({
    ...baseFields(s), child_id: childId, kind: 'bottle', start_at: iso, end_at: iso,
    side: null, bottle_content: content, amount_ml: amountMl, note: '',
  })
  await setSetting('lastBottle', { content, amountMl })
}

export async function getLastBottle() {
  return (await getSetting<{ content: BottleContent; amountMl: number }>('lastBottle')) ?? { content: 'formula' as BottleContent, amountMl: 120 }
}

export async function saveFeeding(id: string, patch: Partial<Pick<Feeding, 'start_at' | 'end_at' | 'side' | 'bottle_content' | 'amount_ml' | 'note'>>) {
  await db.feedings.update(id, touch(patch))
}

export async function deleteFeeding(id: string) {
  await db.feedings.update(id, touch({ deleted_at: nowISO() }))
}
