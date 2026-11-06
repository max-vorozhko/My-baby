import { Link, NavLink, Outlet } from 'react-router-dom'
import { IconChart, IconFood, IconGear, IconHeart, IconPhone, IconSleep, IconToday } from '@/ui/icons'
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

      <main className="flex-1 px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+8.5rem)]">
        <Outlet />
      </main>

      {/* Екстрений виклик — 1 тап з будь-якого екрана. Без медичних інструкцій. */}
      <a
        href="tel:103"
        aria-label="Телефонувати 103"
        className="fixed right-4 z-20 flex h-12 items-center gap-1.5 rounded-full bg-sos px-4 text-sm font-bold text-white shadow-md active:scale-95 dark:text-bg bottom-[calc(env(safe-area-inset-bottom)+5rem)]"
      >
        <IconPhone width={18} height={18} /> 103
      </a>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-lg">
          {tabs.map(({ to, label, Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-accent' : 'text-muted'}`
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
