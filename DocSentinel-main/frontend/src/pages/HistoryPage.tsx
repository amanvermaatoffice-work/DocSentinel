import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { AuditRecord } from '../types'
import { RiskBadge } from '../components/RiskBadge'

const RISK_FILTERS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

function fmt(ts: string) {
  try {
    const d = new Date(ts)
    return { date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) }
  } catch { return { date: ts, time: '' } }
}

export default function HistoryPage() {
  const [records, setRecords]       = useState<AuditRecord[]>([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState<typeof RISK_FILTERS[number]>('ALL')
  const [search, setSearch]         = useState('')
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [copied, setCopied]         = useState<string | null>(null)

  useEffect(() => {
    api.auditList()
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function copyHash(hash: string, id: string) {
    navigator.clipboard.writeText(hash).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const visible = records.filter(r => {
    const matchRisk   = filter === 'ALL' || r.risk_result?.toUpperCase() === filter
    const matchSearch = !search || [r.verification_id, r.evidence_summary, r.officer_decision, r.encounter_id ?? '']
      .some(s => s.toLowerCase().includes(search.toLowerCase()))
    return matchRisk && matchSearch
  })

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Screening History</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Tamper-evident audit log — every document screening recorded here
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by ID, evidence, decision…"
          className="flex-1 min-w-[200px] px-3 py-1.5 text-sm rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          {RISK_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-semibold rounded border transition-colors ${
                filter === f
                  ? 'bg-blue-700 dark:bg-blue-600 border-blue-700 dark:border-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Audit Records</h2>
          {!loading && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {visible.length} of {records.length} records
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-slate-500 dark:text-slate-400">Loading records…</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">No records match the current filter.</p>
            {records.length === 0 && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Run a document screening to create audit records.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full gov-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Verification ID</th>
                  <th>Risk</th>
                  <th>Score</th>
                  <th>Evidence Summary</th>
                  <th>Decision</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map(r => {
                  const { date, time } = fmt(r.timestamp)
                  const isOpen = expanded === r.verification_id
                  return (
                    <>
                      <tr key={r.verification_id}>
                        <td>
                          <p className="text-sm text-slate-900 dark:text-slate-100">{date}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{time}</p>
                        </td>
                        <td>
                          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{r.verification_id.slice(0, 16)}…</span>
                        </td>
                        <td>
                          <RiskBadge level={r.risk_result} size="sm" />
                        </td>
                        <td>
                          <span className={`text-sm font-semibold tabular-nums ${
                            r.risk_score >= 75 ? 'text-red-700 dark:text-red-400' :
                            r.risk_score >= 50 ? 'text-orange-600 dark:text-orange-400' :
                            r.risk_score >= 25 ? 'text-amber-600 dark:text-amber-400' :
                            'text-green-700 dark:text-green-400'
                          }`}>{r.risk_score}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">/100</span>
                        </td>
                        <td className="max-w-xs">
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[240px]" title={r.evidence_summary}>
                            {r.evidence_summary || '—'}
                          </p>
                        </td>
                        <td>
                          {r.officer_decision ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                              r.officer_decision.includes('ADMIT') || r.officer_decision.includes('CLEAR')
                                ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                : r.officer_decision.includes('DETAIN') || r.officer_decision.includes('FLAG')
                                ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                            }`}>
                              {r.officer_decision}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Pending</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => setExpanded(isOpen ? null : r.verification_id)}
                            className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap"
                          >
                            {isOpen ? 'Hide ↑' : 'Details ↓'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded hash detail */}
                      {isOpen && (
                        <tr key={r.verification_id + '-detail'}>
                          <td colSpan={7} className="bg-slate-50 dark:bg-slate-800/50 px-5 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                              {[
                                { label: 'Document SHA-256', value: r.document_hash },
                                { label: 'Previous Block Hash', value: r.previous_hash },
                                { label: 'Current Block Hash', value: r.current_hash },
                              ].map(({ label, value }) => (
                                <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-3">
                                  <p className="font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">{label}</p>
                                  <div className="flex items-center gap-2">
                                    <code className="font-mono text-slate-700 dark:text-slate-300 truncate flex-1" title={value}>
                                      {value?.slice(0, 24)}…
                                    </code>
                                    <button
                                      onClick={() => copyHash(value, label)}
                                      title="Copy full hash"
                                      className="shrink-0 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    >
                                      {copied === label ? (
                                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                      ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {r.encounter_id && (
                              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                                Encounter ID: <span className="font-mono text-slate-600 dark:text-slate-400">{r.encounter_id}</span>
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
