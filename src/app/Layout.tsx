import { Link, NavLink, Outlet } from 'react-router-dom'
import { IconFood, IconHeart, IconMore, IconSleep, IconToday } from '@/ui/icons'
import { SyncBadge } from './SyncBadge'

const tabs = [
  { to: '/', label: 'Сьогодні', Icon: IconToday, end: true },
  { to: '/food', label: 'Їжа', Icon: IconFood },
  { to: '/sleep', label: 'Сон', Icon: IconSleep },
  { to: '/health', label: "Здоров'я", Icon: IconHeart },
  { to: '/more', label: 'Ще', Icon: IconMore },
]

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)]">
        <span className="text-sm font-semibold text-muted">My Baby</span>
        <SyncBadge />
      </div>

      <main className="flex-1 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+9rem)]">
        <Outlet />
      </main>

      {/* SOS поверх усіх вкладок — 1 тап з будь-якого екрана (ТЗ 3.9). */}
      <Link
        to="/sos"
        aria-label="SOS: поперхування"
        className="fixed right-4 z-20 flex h-14 items-center gap-2 rounded-full bg-sos px-5 font-bold text-white shadow-lg active:scale-95 dark:text-bg bottom-[calc(env(safe-area-inset-bottom)+5.25rem)]"
      >
        SOS
        <span className="text-sm font-medium opacity-90">поперхування</span>
      </Link>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-lg">
          {tabs.map(({ to, label, Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                    isActive ? 'text-accent' : 'text-muted'
                  }`
                }
              >
                <Icon />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
