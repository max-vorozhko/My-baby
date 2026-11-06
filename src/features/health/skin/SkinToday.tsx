import type { Child } from '@/db/types'
import { SkinCareButtons } from './SkinCareButtons'

/** Блок шкіри на «Сьогодні»: відмітки догляду в 1 тап. */
export function SkinToday({ child }: { child: Child }) {
  return <SkinCareButtons child={child} />
}
