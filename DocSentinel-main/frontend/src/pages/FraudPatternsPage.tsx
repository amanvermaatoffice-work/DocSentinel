import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import type { FraudPattern } from '../types'

export default function FraudPatternsPage() {
  const navigate               = useNavigate()
  const [patterns, setPatterns] = useState<FraudPattern[]>([])
  const [loading, setLoading]  = useState(true)
  const [search, setSearch]    = useState('')

  useEffect(() => {
    api.fraudPatterns()
      .then(setPatterns)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const visible = patterns.filter(p =>
    !search ||
    [p.pattern_id, p.description, ...p.common_indicators, ...p.observed_in]
      .some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Fraud Patterns</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Known fraud typologies detected at border checkpoints</p>
        </div>
        {!loading && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
            {patterns.length} pattern{patterns.length !== 1 ? 's' : ''} on record
          </span>
        )}
      </div>

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search patterns, indicators, or encounter IDs…"
        className="w-full px-3 py-2 text-sm rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-slate-500 dark:text-slate-400">Loading patterns…</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-14 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {patterns.length === 0 ? 'No fraud patterns on record yet.' : 'No patterns match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map(p => (
            <div
              key={p.pattern_id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
            >
              {/* Card header */}
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 shrink-0">
                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{p.pattern_id}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/screening')}
                  className="shrink-0 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  Test in Screening →
                </button>
              </div>

              {/* Card body */}
              <div className="px-5 py-4 grid sm:grid-cols-2 gap-5">
                {/* Indicators */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Common Indicators</p>
                  <ul className="space-y-1.5">
                    {p.common_indicators.map((ind, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        {ind}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Observed in */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Observed in Encounters
                  </p>
                  {p.observed_in.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {p.observed_in.map((enc, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        >
                          {enc}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">No correlated encounters on record</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
