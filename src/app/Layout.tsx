import { Link, NavLink, Outlet } from 'react-router-dom'
import { IconChart, IconFood, IconGear, IconHeart, IconSleep, IconToday } from '@/ui/icons'
import { SyncBadge } from './SyncBadge'

const tabs = [
  { to: '/', label: 'Сьогодні', Icon: IconToday, end: true },
  { to: '/food', label: 'Їжа', Icon: IconFood },
  { to: '/sleep', label: 'Сон', Icon: IconSleep },
  { to: '/health', label: "Здоров'я", Icon: IconHeart },
  { to: '/stats', label: 'Статистика', Icon: IconChart },
]

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),10px)]">
        <SyncBadge />
        <Link to="/more" aria-label="Налаштування" className="flex h-11 w-11 items-center justify-center rounded-full text-muted">
          <IconGear width={22} height={22} />
        </Link>
      </div>

      <main className="flex-1 px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 rounded-t-[26px] bg-surface/95 shadow-[0_-6px_20px_-12px_rgb(120_80_50_/_0.35)] backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-lg">
          {tabs.map(({ to, label, Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${isActive ? 'text-accent' : 'text-muted'}`
                }
              >
                <Icon width={22} height={22} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
