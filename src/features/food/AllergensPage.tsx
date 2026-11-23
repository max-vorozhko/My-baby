import { Link } from 'react-router-dom'
import type { Child } from '@/db/types'
import { PageTitle } from '@/ui/kit'
import { AllergensCard } from './AllergensCard'
import { useFoodSheets } from './FoodSheets'

/** Алергени окремою сторінкою — хто не стежить, той і не бачить. */
export function AllergensPage({ child }: { child: Child }) {
  const sheets = useFoodSheets(child)
  return (
    <div className="space-y-5">
      <Link to="/food" className="inline-flex min-h-11 items-center px-1 text-sm text-accent">← Їжа</Link>
      <PageTitle sub="9 основних алергенів: які давали і коли">Алергени</PageTitle>
      <AllergensCard child={child} onFood={sheets.openFood} />
      {sheets.element}
    </div>
  )
}
