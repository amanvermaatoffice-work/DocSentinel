import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { AuditRecord } from '../types'
import { RiskBadge } from '../components/RiskBadge'

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch { return ts }
}

function shortHash(h: string) {
  return h ? h.slice(0, 8) + '…' + h.slice(-8) : '—'
}

export default function AuditPage() {
  const [records, setRecords]           = useState<AuditRecord[]>([])
  const [loading, setLoading]           = useState(true)
  const [verifying, setVerifying]       = useState(false)
  const [verifyResult, setVerifyResult] = useState<'pass' | 'fail' | null>(null)
  const [copied, setCopied]             = useState<string | null>(null)

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

  function verifyChain() {
    setVerifying(true)
    setVerifyResult(null)
    api.auditVerify()
      .then(res => setVerifyResult(res.intact ? 'pass' : 'fail'))
      .catch(() => setVerifyResult('fail'))
      .finally(() => setVerifying(false))
  }

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tamper Audit Trail</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Blockchain-style hash chain — every record cryptographically linked
          </p>
        </div>
        <button
          onClick={verifyChain}
          disabled={verifying || loading || records.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {verifying ? (
            <>
              <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verifying…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Verify Chain Integrity
            </>
          )}
        </button>
      </div>

      {/* Verification result */}
      {verifyResult && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-semibold ${
          verifyResult === 'pass'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          {verifyResult === 'pass' ? (
            <>
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Chain Integrity Verified — all {records.length} blocks link correctly. No tampering detected.
            </>
          ) : (
            <>
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Chain Break Detected — hash mismatch found in chain. Possible tampering.
            </>
          )}
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-slate-500 dark:text-slate-400">Loading audit chain…</span>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-14 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">No audit records yet. Complete a document screening to begin the chain.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r, idx) => (
            <div
              key={r.verification_id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
            >
              {/* Block header */}
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 text-xs font-bold font-mono text-slate-600 dark:text-slate-400 shrink-0">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300 font-semibold">{r.verification_id}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{fmt(r.timestamp)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RiskBadge level={r.risk_result} size="sm" />
                  <span className={`text-xs font-semibold tabular-nums ${
                    r.risk_score >= 75 ? 'text-red-700 dark:text-red-400' :
                    r.risk_score >= 50 ? 'text-orange-600 dark:text-orange-400' :
                    r.risk_score >= 25 ? 'text-amber-600 dark:text-amber-400' :
                    'text-green-700 dark:text-green-400'
                  }`}>{r.risk_score}/100</span>
                  {r.officer_decision && (
                    <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-3">
                      {r.officer_decision}
                    </span>
                  )}
                </div>
              </div>

              {/* Evidence + hashes */}
              <div className="px-5 py-4 space-y-4">
                {r.evidence_summary && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-500 dark:text-slate-500">Evidence: </span>
                    {r.evidence_summary}
                  </p>
                )}

                {/* Hash grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Document Hash',   value: r.document_hash,  accent: 'border-slate-200 dark:border-slate-700' },
                    { label: 'Parent Hash',      value: r.previous_hash,  accent: 'border-slate-200 dark:border-slate-700' },
                    { label: 'Block Hash',       value: r.current_hash,   accent: 'border-emerald-200 dark:border-emerald-800' },
                  ].map(({ label, value, accent }) => {
                    const copyKey = `${r.verification_id}-${label}`
                    return (
                      <div key={label} className={`border rounded-md px-3 py-2.5 ${accent} bg-slate-50 dark:bg-slate-800/50`}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{label}</p>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs text-slate-700 dark:text-slate-300 flex-1">{shortHash(value)}</code>
                          <button
                            onClick={() => copyHash(value, copyKey)}
                            title="Copy full hash"
                            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
                          >
                            {copied === copyKey ? (
                              <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Explainer */}
      {records.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg px-5 py-4 text-xs text-slate-500 dark:text-slate-500">
          <p className="font-semibold text-slate-600 dark:text-slate-400 mb-1">How tamper-detection works</p>
          Each block's <span className="font-mono">Parent Hash</span> must match the previous block's <span className="font-mono">Block Hash</span>. Any modification to a historical record breaks this chain, making tampering immediately detectable. Click <em>Verify Chain Integrity</em> to confirm the full chain is intact.
        </div>
      )}
    </div>
  )
}
