import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setAuth } from '../services/api'
import { ShieldIcon } from '../components/Icons'

export default function LoginPage() {
  const navigate = useNavigate()
  const [officerId, setOfficerId] = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  async function handleLogin(id?: string, pw?: string) {
    setError('')
    setLoading(true)
    const targetId = id || officerId || 'DEMO-SSB-001'
    try {
      const res = await api.login(targetId, pw || '')
      setAuth(res.access_token, res.officer_id)
      navigate('/dashboard')
    } catch {
      setError('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

      {/* Government strip */}
      <div className="bg-blue-900 text-blue-100 text-[11px] py-1.5 px-4 text-center font-medium">
        Government of India &nbsp;·&nbsp; Ministry of Home Affairs &nbsp;·&nbsp; Border Security Division
      </div>

      {/* Tricolor stripe */}
      <div className="h-1 flex shrink-0">
        <div className="flex-1 bg-orange-500" />
        <div className="flex-1 bg-white dark:bg-slate-300" />
        <div className="flex-1 bg-green-700" />
      </div>

      {/* Center form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-slide-up">

          {/* Emblem + heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 text-white shadow-lg mb-5">
              <ShieldIcon className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">DocSentinel</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Border Identity Intelligence System</p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Checkpoint Officer Portal &nbsp;·&nbsp; Demo Access</p>
          </div>

          {/* Card */}
          <div className="card p-6 shadow-card">

            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-5 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Sign in with Officer ID
            </h2>

            {error && (
              <div className="mb-4 flex items-start gap-2 px-3 py-2.5 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-slide-in">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={e => { e.preventDefault(); handleLogin() }} className="space-y-4">
              <div>
                <label htmlFor="officerId" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Officer ID
                </label>
                <input
                  id="officerId"
                  type="text"
                  value={officerId}
                  onChange={e => setOfficerId(e.target.value)}
                  placeholder="DEMO-SSB-001"
                  autoComplete="username"
                  className="input font-mono"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Password <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="No password required for demo"
                  autoComplete="current-password"
                  className="input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Demo account */}
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 mb-3">
                — Instant Evaluation Access —
              </p>
              <button
                onClick={() => handleLogin('DEMO-SSB-001', '')}
                disabled={loading}
                className="btn-secondary w-full justify-center py-2.5 group"
              >
                <svg className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Enter Demo Mode (No Password)
              </button>
              <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                1-Click Direct Demo Access — No Password Required
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
            All access is monitored, logged, and subject to audit.<br />
            Unauthorised access is a punishable offence.
          </p>
        </div>
      </div>
    </div>
  )
}
