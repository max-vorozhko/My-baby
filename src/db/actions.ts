import { baseFields, db, getSession, nowISO, setSetting, getSetting } from './index'
import type { BaseRecord, BottleContent, BreastSide, Feeding, SkinCareKind, SkinCheck, Sleep, SleepKind } from './types'
import { defaultKind } from '@/lib/sleep'
import { OBSERVE_DAYS, activeObservation } from '@/lib/food'
import type { FoodIntroStatus, MealItem, ReactionType } from './types'

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

// ---------- Прикорм ----------


export async function getIntros(childId: string) {
  return db.foodIntros.where('child_id').equals(childId).filter((i) => !i.deleted_at).toArray()
}

/** Почати вводити продукт: 3 доби спостереження + перша проба в журналі їжі. */
export async function startIntro(childId: string, foodId: string, amount: number | null = null) {
  const at = new Date()
  const s = await session()
  return db.transaction('rw', [db.foodIntros, db.meals], async () => {
    const active = activeObservation(await getIntros(childId))
    if (active) throw new Error('Триває спостереження за іншим продуктом')
    await db.foodIntros.add({
      ...baseFields(s), child_id: childId, food_id: foodId, started_at: at.toISOString(),
      observe_until: new Date(at.getTime() + OBSERVE_DAYS * 24 * 3600_000).toISOString(), status: 'observing',
    })
    await db.meals.add({
      ...baseFields(s), child_id: childId, at: at.toISOString(),
      items: [{ food_id: foodId, amount, unit: amount ? 'spoon' : null, liked: null }], note: 'Перша проба',
    })
  })
}

export async function resolveIntro(id: string, status: Exclude<FoodIntroStatus, 'observing'>) {
  await db.foodIntros.update(id, touch({ status }))
}

export async function addMeal(childId: string, items: MealItem[], at = new Date(), note = '') {
  const s = await session()
  await db.meals.add({ ...baseFields(s), child_id: childId, at: at.toISOString(), items, note })
}

export async function deleteMeal(id: string) {
  await db.meals.update(id, touch({ deleted_at: nowISO() }))
}

/** Реакція. Якщо продукт зараз під спостереженням — його статус стає «реакція». */
export async function addReaction(input: {
  childId: string; foodId: string | null; type: ReactionType; severity: 1 | 2 | 3; photo: Blob | null; at: Date; note: string
}) {
  const s = await session()
  await db.transaction('rw', [db.reactions, db.foodIntros], async () => {
    await db.reactions.add({
      ...baseFields(s), child_id: input.childId, food_id: input.foodId, type: input.type,
      severity: input.severity, photo: input.photo, at: input.at.toISOString(), note: input.note,
    })
    if (input.foodId) {
      const intro = (await getIntros(input.childId))
        .filter((i) => i.food_id === input.foodId)
        .sort((a, b) => b.started_at.localeCompare(a.started_at))[0]
      if (intro && intro.status !== 'reaction') await db.foodIntros.update(intro.id, touch({ status: 'reaction' }))
    }
  })
}

export async function deleteReaction(id: string) {
  await db.reactions.update(id, touch({ deleted_at: nowISO() }))
}

// ---------- Шкіра ----------

export async function setSkinModule(childId: string, on: boolean) {
  await db.children.update(childId, touch({ skin_module: on }))
}

export async function getSkinCheck(childId: string, date: string) {
  return db.skinChecks.where('[child_id+date]').equals([childId, date]).filter((c) => !c.deleted_at).first()
}

/** Один огляд на день: повторне збереження оновлює запис. */
export async function saveSkinCheck(childId: string, date: string, data: Omit<SkinCheck, keyof BaseRecord | 'child_id' | 'date'>) {
  const s = await session()
  await db.transaction('rw', db.skinChecks, async () => {
    const existing = await getSkinCheck(childId, date)
    if (existing) await db.skinChecks.update(existing.id, touch(data))
    else await db.skinChecks.add({ ...baseFields(s), child_id: childId, date, ...data })
  })
}

export async function addSkinCare(childId: string, kind: SkinCareKind, product = '', at = new Date()) {
  const s = await session()
  await db.skinCare.add({ ...baseFields(s), child_id: childId, at: at.toISOString(), kind, product, note: '' })
  if (kind === 'prescribed' && product) {
    const list = (await getSetting<string[]>('prescribedProducts')) ?? []
    if (!list.includes(product)) await setSetting('prescribedProducts', [product, ...list].slice(0, 8))
  }
}

export async function deleteSkinCare(id: string) {
  await db.skinCare.update(id, touch({ deleted_at: nowISO() }))
}
