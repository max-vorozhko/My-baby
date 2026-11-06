import { useState } from 'react'
import type { Child } from '@/db/types'
import { FoodDetailSheet } from './FoodDetailSheet'
import { MealSheet } from './MealSheet'
import { ReactionSheet } from './ReactionSheet'

/** Спільний контролер шторок прикорму. */
export function useFoodSheets(child: Child) {
  const [detail, setDetail] = useState<string | null>(null)
  const [reaction, setReaction] = useState<{ foodId: string | null } | null>(null)
  const [meal, setMeal] = useState<{ foodId: string | null } | null>(null)

  const element = (
    <>
      <FoodDetailSheet child={child} foodId={detail} onClose={() => setDetail(null)}
        onReaction={(id) => { setDetail(null); setReaction({ foodId: id }) }}
        onMeal={(id) => { setDetail(null); setMeal({ foodId: id }) }} />
      <ReactionSheet child={child} open={!!reaction} foodId={reaction?.foodId ?? null} onClose={() => setReaction(null)} />
      <MealSheet child={child} open={!!meal} preselect={meal?.foodId} onClose={() => setMeal(null)} />
    </>
  )
  return {
    openFood: (id: string) => setDetail(id),
    openReaction: (foodId: string | null = null) => setReaction({ foodId }),
    openMeal: (foodId: string | null = null) => setMeal({ foodId }),
    element,
  }
}
