import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackScreen } from '@/lib/analytics'

/** Рахує перегляди екранів (анонімно, див. lib/analytics). */
export function ScreenTracker() {
  const { pathname } = useLocation()
  useEffect(() => { trackScreen(location.pathname) }, [pathname])
  return null
}
