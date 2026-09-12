import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import type { DashboardStats, EncounterSummary } from '../types'
import { RiskBadge } from '../components/RiskBadge'
import { GridIcon, ScanIcon, UserIcon, ShieldCheckIcon, PlusIcon, ArrowRightIcon } from '../components/Icons'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats]         = useState<DashboardStats | null>(null)
  const [encounters, setEncounters] = useState<EncounterSummary[]>([])
  const [loading, setLoading]     = useState(true)

  const [error, setError]         = useState('')

  const loadData = () => {
    setLoading(true)
    setError('')
    Promise.all([api.dashboard(), api.encounters()])
      .then(([s, e]) => { setStats(s); setEncounters(e) })
      .catch(err => {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard…</span>
        </div>
      </div>
    )
  }

  const kpis = stats
    ? [
        {
          label: 'Encounters Processed',
          value: stats.encounters_processed,
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>,
          bg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400', valueColor: 'text-blue-700 dark:text-blue-300',
        },
        {
          label: 'Suspicious Encounters',
          value: stats.suspicious_encounters,
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
          bg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400', valueColor: 'text-amber-700 dark:text-amber-300',
        },
        {
          label: 'High Risk Flagged',
          value: stats.high_risk_encounters,
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
          bg: 'bg-red-50 dark:bg-red-900/20', iconColor: 'text-red-600 dark:text-red-400', valueColor: 'text-red-700 dark:text-red-300',
        },
        {
          label: 'Pending Reviews',
          value: stats.pending_reviews,
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
          bg: 'bg-orange-50 dark:bg-orange-900/20', iconColor: 'text-orange-600 dark:text-orange-400', valueColor: 'text-orange-700 dark:text-orange-300',
        },
      ]
    : []

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="page-icon-blue">
            <GridIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Command Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {stats?.checkpoint ?? 'Border Checkpoint'} &nbsp;·&nbsp; Real-time overview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button onClick={() => navigate('/screening')} className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            New Screening
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={loadData} className="underline font-bold text-xs">Retry</button>
        </div>
      )}

      {/* KPI cards */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <div
              key={k.label}
              className="card p-5 card-hover animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`w-9 h-9 rounded-lg ${k.bg} ${k.iconColor} flex items-center justify-center mb-3`}>
                {k.icon}
              </div>
              <p className={`text-3xl font-bold tabular-nums ${k.valueColor}`}>{k.value}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-snug">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent encounters table */}
      <div className="card overflow-hidden animate-slide-up delay-150">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Recent Encounters
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{encounters.length} total</span>
        </div>

        {encounters.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
            </svg>
            <p className="text-sm text-slate-500 dark:text-slate-400">No encounters yet.</p>
            <button onClick={() => navigate('/screening')} className="btn-primary mt-4 mx-auto">
              <ScanIcon className="w-4 h-4" /> Start First Screening
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Encounter ID</th>
                  <th>Checkpoint</th>
                  <th>Document Type</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {encounters.slice(0, 15).map(enc => (
                  <tr key={enc.encounter_id}>
                    <td className="font-mono text-xs text-slate-600 dark:text-slate-400">{enc.encounter_id}</td>
                    <td className="font-medium">{enc.checkpoint}</td>
                    <td className="text-slate-500 dark:text-slate-400">{enc.document_type}</td>
                    <td><RiskBadge level={enc.risk_level} size="sm" showDot /></td>
                    <td>
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        enc.status === 'CLEARED'
                          ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : enc.status === 'FLAGGED'
                          ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}>
                        {enc.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => navigate(`/identity/${enc.identity_reference}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors group"
                      >
                        Inspect
                        <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up delay-225">
        {[
          { label: 'Run Screening',   desc: 'Analyse a document or identity',      to: '/screening', Icon: ScanIcon,       iconBg: 'page-icon-blue'  },
          { label: 'Identity Lookup', desc: 'Trace person across checkpoints',      to: '/identity',  Icon: UserIcon,       iconBg: 'page-icon-indigo'},
          { label: 'Audit Trail',     desc: 'Verify tamper-evident hash chain',     to: '/audit',     Icon: ShieldCheckIcon,iconBg: 'page-icon-green' },
        ].map(link => (
          <button
            key={link.to}
            onClick={() => navigate(link.to)}
            className="card card-interactive text-left p-5 flex items-start gap-4 group"
          >
            <div className={link.iconBg}>
              <link.Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{link.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{link.desc}</p>
            </div>
            <ArrowRightIcon className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-auto self-center group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all mt-0.5" />
          </button>
        ))}
      </div>
    </div>
  )
}
