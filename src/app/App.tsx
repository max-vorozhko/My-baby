import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useTheme } from '@/lib/theme'
import { requestPersistence } from '@/lib/storage'
import { useActiveChild } from '@/lib/useActiveChild'
import { Layout } from './Layout'
import { Onboarding } from '@/features/onboarding/Onboarding'
import { Today } from '@/features/today/Today'
import { FoodPage } from '@/features/food/FoodPage'
import { SleepPage } from '@/features/sleep/SleepPage'
import { DevelopmentPage } from '@/features/development/DevelopmentPage'
import { MorePage } from '@/features/more/MorePage'
import { SosPage } from '@/features/sos/SosPage'

export default function App() {
  const theme = useTheme()
  const child = useActiveChild()

  useEffect(() => { void requestPersistence() }, [])

  if (child === undefined) return <div className="min-h-dvh" />

  return (
    <Routes>
      {/* SOS доступний завжди, навіть до онбордингу. */}
      <Route path="/sos" element={<SosPage />} />
      {child === null ? (
        <Route path="*" element={<Onboarding />} />
      ) : (
        <Route element={<Layout />}>
          <Route index element={<Today child={child} />} />
          <Route path="food" element={<FoodPage />} />
          <Route path="sleep" element={<SleepPage />} />
          <Route path="development" element={<DevelopmentPage />} />
          <Route path="more" element={<MorePage child={child} theme={theme} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  )
}
