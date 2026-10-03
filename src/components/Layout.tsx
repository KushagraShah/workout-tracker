import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'

const NAV = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/exercises', label: 'Exercises', icon: '🏋️', end: false },
  { to: '/machines', label: 'Machines', icon: '🛠️', end: false },
  { to: '/muscles', label: 'Muscles', icon: '🎯', end: false },
]

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💪</span>
            <span className="font-semibold text-white">Workout Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-400 sm:inline">{user?.email}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition ${
                  isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
