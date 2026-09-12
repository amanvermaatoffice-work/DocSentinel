import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { AuditRecord } from '../types'
import { RiskBadge } from '../components/RiskBadge'

const RISK_FILTERS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
const ITEMS_PER_PAGE = 10

function fmt(ts: string) {
  try {
    const d = new Date(ts)
    return {
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    }
  } catch { return { date: ts, time: '' } }
}

export default function HistoryPage() {
  const [records, setRecords]       = useState<AuditRecord[]>([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState<typeof RISK_FILTERS[number]>('ALL')
  const [search, setSearch]         = useState('')
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null)
  const [copied, setCopied]         = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchRecords = () => {
    setLoading(true)
    api.auditList()
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  function copyHash(hash: string, id: string) {
    navigator.clipboard.writeText(hash).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const visible = records.filter(r => {
    const matchRisk   = filter === 'ALL' || r.risk_result?.toUpperCase() === filter
    const matchSearch = !search || [r.verification_id, r.document_type ?? '', r.evidence_summary, r.officer_decision, r.encounter_id ?? '', r.officer_id ?? '']
      .some(s => s.toLowerCase().includes(search.toLowerCase()))
    return matchRisk && matchSearch
  })

  // Pagination calculation
  const totalPages = Math.ceil(visible.length / ITEMS_PER_PAGE) || 1
  const paginated = visible.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Screening History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tamper-evident verification audit trail — complete document and biometric log
          </p>
        </div>
        <button
          onClick={fetchRecords}
          className="btn-secondary text-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh History
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
          placeholder="Search by ID, Document Type, Officer ID, Decision..."
          className="flex-1 min-w-[220px] px-3 py-1.5 text-sm rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          {RISK_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setCurrentPage(1) }}
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
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Audit &amp; Verification History</h2>
          {!loading && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Showing {paginated.length} of {visible.length} records ({records.length} total)
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-slate-500 dark:text-slate-400">Loading screening history…</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">No records match the current filter.</p>
            {records.length === 0 && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Run a document screening to create verification history records.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full gov-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Document Type</th>
                  <th>Verification ID</th>
                  <th>Risk Score</th>
                  <th>Face Match</th>
                  <th>Decision</th>
                  <th>Officer</th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(r => {
                  const { date, time } = fmt(r.timestamp)
                  return (
                    <tr
                      key={r.verification_id}
                      onClick={() => setSelectedRecord(r)}
                      className="cursor-pointer hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td>
                        <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">{date}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{time}</p>
                      </td>
                      <td>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {r.document_type || 'Unknown Document'}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{r.verification_id.slice(0, 14)}…</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <RiskBadge level={r.risk_result} size="sm" />
                          <span className={`text-xs font-bold tabular-nums ${
                            r.risk_score >= 75 ? 'text-red-600 dark:text-red-400' :
                            r.risk_score >= 50 ? 'text-orange-600 dark:text-orange-400' :
                            r.risk_score >= 25 ? 'text-amber-600 dark:text-amber-400' :
                            'text-green-600 dark:text-green-400'
                          }`}>{r.risk_score}/100</span>
                        </div>
                      </td>
                      <td>
                        <span className={`text-xs font-semibold ${
                          (r.face_similarity_score ?? 0) >= 65 ? 'text-green-600 dark:text-green-400' :
                          (r.face_similarity_score ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'
                        }`}>
                          {r.face_similarity_score ? `${r.face_similarity_score.toFixed(1)}%` : 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                          r.officer_decision?.includes('ADMIT') || r.officer_decision?.includes('CLEAR')
                            ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : r.officer_decision?.includes('DETAIN') || r.officer_decision?.includes('FLAG')
                            ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        }`}>
                          {r.officer_decision || 'Pending'}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {r.officer_id || 'OFFICER-DEMO'}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedRecord(r) }}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded hover:bg-blue-100 transition-colors"
                        >
                          View Details →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                ← Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Verification Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-slide-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Verification Detail
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    {selectedRecord.verification_id}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Recorded on {fmt(selectedRecord.timestamp).date} at {fmt(selectedRecord.timestamp).time} by {selectedRecord.officer_id || 'OFFICER-DEMO'}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Document & Selfie Image Previews */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Document Image Preview */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Uploaded Document Image</p>
                {selectedRecord.document_url ? (
                  <img
                    src={selectedRecord.document_url}
                    alt="Document Preview"
                    className="w-full h-48 object-contain rounded-lg border border-slate-200 dark:border-slate-800 bg-black/5"
                  />
                ) : (
                  <div className="h-48 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                    No Document Image Available
                  </div>
                )}
              </div>

              {/* Selfie Image Preview */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Captured Face Image</p>
                {selectedRecord.selfie_url ? (
                  <img
                    src={selectedRecord.selfie_url}
                    alt="Captured Selfie"
                    className="w-full h-48 object-contain rounded-lg border border-slate-200 dark:border-slate-800 bg-black/5"
                  />
                ) : (
                  <div className="h-48 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                    No Live Selfie Captured
                  </div>
                )}
              </div>
            </div>

            {/* Screening Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Document Type</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRecord.document_type || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Risk Score</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRecord.risk_score} / 100 ({selectedRecord.risk_result})</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Face Similarity</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedRecord.face_similarity_score ? `${selectedRecord.face_similarity_score.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Officer Decision</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{selectedRecord.officer_decision || 'Pending'}</span>
              </div>
            </div>

            {/* Evidence Summary */}
            {selectedRecord.evidence_summary && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-600 dark:text-slate-300">Evidence Summary:</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedRecord.evidence_summary}</p>
              </div>
            )}

            {/* Cryptographic Hash Chain Details */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cryptographic Audit Chain Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { label: 'Document SHA-256', val: selectedRecord.document_hash },
                  { label: 'Previous Block Hash', val: selectedRecord.previous_hash },
                  { label: 'Current Block Hash', val: selectedRecord.current_hash },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">{label}</span>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <code className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">{val?.slice(0, 18)}...</code>
                      <button
                        onClick={() => copyHash(val, label)}
                        className="text-blue-500 hover:underline text-[10px] shrink-0"
                      >
                        {copied === label ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="btn-primary text-xs py-1.5 px-4"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
