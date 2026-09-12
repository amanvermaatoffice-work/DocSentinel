import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAuth, getOfficerId } from '../services/api'
import {
  ShieldIcon, GridIcon, ScanIcon, ClockIcon, UserIcon,
  AlertTriangleIcon, ShieldCheckIcon, SunIcon, MoonIcon, LogOutIcon,
} from './Icons'

// ── Nav configuration ────────────────────────────────────────────────────────

const NAV = [
  { to: '/dashboard',      label: 'Dashboard',       Icon: GridIcon,         end: true  },
  { to: '/screening',      label: 'Screening',        Icon: ScanIcon,         end: true  },
  { to: '/history',        label: 'History',          Icon: ClockIcon,        end: true  },
  { to: '/identity',       label: 'Identity Lookup',  Icon: UserIcon,         end: false },
  { to: '/fraud-patterns', label: 'Fraud Patterns',   Icon: AlertTriangleIcon,end: true  },
  { to: '/audit',          label: 'Audit Trail',      Icon: ShieldCheckIcon,  end: true  },
]

// ── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const navigate  = useNavigate()
  const officerId = getOfficerId()
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('ds-theme', next ? 'dark' : 'light')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* ── Government top strip ── */}
      <div className="bg-blue-900 dark:bg-slate-950 dark:border-b dark:border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium text-blue-200 dark:text-slate-500">
            Government of India &nbsp;·&nbsp; Ministry of Home Affairs
          </span>
          <span className="hidden sm:block text-[11px] text-blue-300 dark:text-slate-600">
            Smart India Hackathon 2026 · SIH26188
          </span>
        </div>
      </div>

      {/* ── Main header ── */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* Brand + actions row */}
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 text-white flex items-center justify-center shadow-sm shrink-0">
                <ShieldIcon className="w-5 h-5" />
              </div>
              <div className="leading-none">
                <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">DocSentinel</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">Border Identity Intelligence System</p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-2 py-1 rounded-full ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              {officerId && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{officerId}</span>
                </div>
              )}

              <button
                onClick={toggleTheme}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="btn-icon text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
              >
                {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
              </button>

              <button
                onClick={() => { clearAuth(); navigate('/login') }}
                title="Sign out"
                className="btn-icon text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hidden sm:flex"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>

              <button
                onClick={() => { clearAuth(); navigate('/login') }}
                className="sm:hidden text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
              >
                Out
              </button>
            </div>
          </div>

          {/* Navigation tabs with icons */}
          <nav className="flex items-center overflow-x-auto scrollbar-none -mb-px">
            {NAV.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `group flex items-center gap-1.5 shrink-0 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'border-blue-700 dark:border-blue-400 text-blue-700 dark:text-blue-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 transition-transform duration-150 group-hover:scale-110 ${isActive ? '' : 'opacity-70'}`} />
                    <span className="hidden sm:inline">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 animate-fade-in">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="shrink-0 py-3 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        DocSentinel BIIS &nbsp;·&nbsp; SIH26188 &nbsp;·&nbsp; Ministry of Home Affairs, Government of India
      </footer>
    </div>
  )
}
