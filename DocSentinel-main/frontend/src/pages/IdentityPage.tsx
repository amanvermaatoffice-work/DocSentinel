import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import type { IdentityTimeline, TimelineEntry } from '../types'
import { RiskBadge } from '../components/RiskBadge'

const PRESETS = ['ID-REF-001', 'ID-REF-007', 'ID-REF-017', 'ID-REF-031']

function fmt(ts: string) {
  try {
    const d = new Date(ts)
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch { return ts }
}

function riskDot(level: string) {
  const l = level?.toUpperCase()
  if (l === 'CRITICAL') return 'bg-red-500'
  if (l === 'HIGH')     return 'bg-orange-500'
  if (l === 'MEDIUM')   return 'bg-amber-500'
  return 'bg-green-500'
}

export default function IdentityPage() {
  const { id }                      = useParams<{ id: string }>()
  const navigate                    = useNavigate()
  const [query, setQuery]           = useState(id ?? '')
  const [data, setData]             = useState<IdentityTimeline | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    if (id) loadIdentity(id)
  }, [id])

  async function loadIdentity(ref: string) {
    const clean = ref.trim()
    if (!clean) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await api.identityTimeline(clean)
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Identity not found')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const clean = query.trim()
    if (clean) navigate(`/identity/${clean}`)
  }

  // Sorted newest-first
  const entries: TimelineEntry[] = data
    ? [...data.entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : []

  const highRisk = entries.filter(e => ['HIGH', 'CRITICAL'].includes(e.risk_level?.toUpperCase()))

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Identity Lookup</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Trace an identity reference across border checkpoints</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter Identity Reference (e.g. ID-REF-001)"
          className="flex-1 px-3 py-2 text-sm rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-mono"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors"
        >
          Search
        </button>
      </form>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => { setQuery(p); navigate(`/identity/${p}`) }}
            className={`px-3 py-1 text-xs font-mono font-semibold rounded border transition-colors ${
              id === p
                ? 'bg-blue-700 border-blue-700 text-white'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-400'
            }`}
          >
            {p}
          </button>
        ))}
        <span className="text-xs text-slate-400 dark:text-slate-500 self-center">— quick access</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3">
          <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-slate-500 dark:text-slate-400">Looking up identity…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="px-4 py-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-4">

          {/* Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Identity Reference</p>
                <p className="mt-1 text-lg font-bold font-mono text-slate-900 dark:text-white">{data.identity_reference}</p>
              </div>
              <div className="flex gap-5 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{entries.length}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Total Crossings</p>
                </div>
                <div>
                  <p className={`text-2xl font-bold ${highRisk.length > 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                    {highRisk.length}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">High Risk Events</p>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {data.alerts.length > 0 && (
              <div className="mt-4 space-y-2">
                {data.alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p className="text-xs text-red-700 dark:text-red-400 font-medium">{a}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Checkpoint Timeline</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Most recent first</p>
            </div>

            {entries.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 dark:text-slate-500 text-center">No checkpoint events recorded for this identity.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {entries.map((entry, i) => (
                  <div key={i} className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center shrink-0">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 ${riskDot(entry.risk_level)}`} />
                      {i < entries.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1 min-h-[24px]" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.checkpoint}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{fmt(entry.timestamp)}</p>
                        </div>
                        <RiskBadge level={entry.risk_level} size="sm" />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Encounter: {entry.encounter_id}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-16 text-center">
          <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          <p className="text-sm text-slate-500 dark:text-slate-400">Enter an identity reference above to trace checkpoint history.</p>
        </div>
      )}
    </div>
  )
}
