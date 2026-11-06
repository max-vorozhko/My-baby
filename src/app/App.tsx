import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useTheme } from '@/lib/theme'
import { requestPersistence } from '@/lib/storage'
import { useActiveChild } from '@/lib/useActiveChild'
import { useCustomFoods } from '@/db/hooks'
import { setCustomFoods } from '@/data/foods'
import { Layout } from './Layout'
import { Onboarding } from '@/features/onboarding/Onboarding'
import { Today } from '@/features/today/Today'
import { FoodPage } from '@/features/food/FoodPage'
import { FoodsPage } from '@/features/food/FoodsPage'
import { SleepPage } from '@/features/sleep/SleepPage'
import { HealthPage } from '@/features/health/HealthPage'
import { SkinPage } from '@/features/health/skin/SkinPage'
import { StatsPage } from '@/features/stats/StatsPage'
import { MorePage } from '@/features/more/MorePage'

export default function App() {
  const theme = useTheme()
  const child = useActiveChild()
  const custom = useCustomFoods()

  useEffect(() => { void requestPersistence() }, [])
  // Реєстр продуктів оновлюється до рендеру дітей.
  if (custom) setCustomFoods(custom.map((c) => ({ ...c, custom: true, allergen_code: c.allergen_code as never })))

  if (child === undefined) return <div className="min-h-dvh" />

  return (
    <Routes>
      {child === null ? (
        <Route path="*" element={<Onboarding />} />
      ) : (
        <Route element={<Layout />}>
          <Route index element={<Today child={child} />} />
          <Route path="food" element={<FoodPage child={child} />} />
          <Route path="food/all" element={<FoodsPage child={child} />} />
          <Route path="sleep" element={<SleepPage child={child} />} />
          <Route path="health" element={<HealthPage child={child} />} />
          <Route path="health/skin" element={<SkinPage child={child} />} />
          <Route path="stats" element={<StatsPage child={child} />} />
          <Route path="more" element={<MorePage child={child} theme={theme} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  )
}
