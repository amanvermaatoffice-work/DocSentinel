import { useState, useRef, useCallback } from 'react'
import { api } from '../services/api'
import type { DocumentAnalysisResult } from '../types'
import { RiskBadge } from '../components/RiskBadge'
import { ScanIcon, UploadIcon, CameraIcon, PlayIcon, CheckIcon, CheckCircleIcon, XIcon, CopyIcon } from '../components/Icons'

// ── Demo passport generator ───────────────────────────────────────────────────
function createDemoFile(name: string, scenario: string): File {
  const canvas = document.createElement('canvas')
  canvas.width = 850; canvas.height = 540
  const ctx = canvas.getContext('2d')!
  const bg = ctx.createLinearGradient(0, 0, 850, 540)
  bg.addColorStop(0, scenario === 'B' ? '#1a1a2e' : scenario === 'C' ? '#1a2e1a' : '#1c2951')
  bg.addColorStop(1, scenario === 'B' ? '#16213e' : scenario === 'C' ? '#162e16' : '#162040')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 850, 540)
  ctx.strokeStyle = scenario === 'B' ? '#ff4444' : '#4a7fd4'; ctx.lineWidth = 4; ctx.strokeRect(20, 20, 810, 500)
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 28px serif'; ctx.fillText('REPUBLIC OF INDIA', 220, 70)
  ctx.font = '18px serif'; ctx.fillText('PASSPORT', 220, 100)
  ctx.fillStyle = '#2a3a5a'; ctx.fillRect(40, 110, 150, 190); ctx.fillStyle = '#5a7aaa'; ctx.font = '14px sans-serif'; ctx.fillText('PHOTO', 82, 215)
  const fields = [
    ['Surname', scenario === 'C' ? 'KUMAR (MODIFIED)' : 'SHARMA'],
    ['Given Names', 'RAJESH'], ['Nationality', 'INDIAN'], ['Date of Birth', '01 JAN 1985'],
    ['Sex', 'M'], ['Place of Birth', 'DELHI'], ['Date of Issue', '15 MAR 2020'],
    ['Date of Expiry', scenario === 'B' ? '14 MAR 2025 (ALTERED)' : '14 MAR 2030'], ['Passport No.', 'A1234567'],
  ]
  fields.forEach(([label, val], i) => {
    const x = 210, y = 120 + i * 26
    ctx.fillStyle = '#7a9acd'; ctx.font = '11px sans-serif'; ctx.fillText(label + ':', x, y)
    ctx.fillStyle = '#ffffff'; ctx.fillText(val, x + 130, y)
  })
  ctx.fillStyle = '#0a1628'; ctx.fillRect(20, 460, 810, 60)
  ctx.fillStyle = '#33ff88'; ctx.font = '13px monospace'
  ctx.fillText('P<INDSHARMMA<<RAJESH<<<<<<<<<<<<<<<<<<<<<<<<', 30, 490)
  ctx.fillText('A1234567<8IND8501011M3003145<<<<<<<<<<<<<<<<6', 30, 512)
  if (scenario === 'B') {
    ctx.fillStyle = 'rgba(255,0,0,0.12)'; ctx.fillRect(380, 110, 200, 120)
    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.strokeRect(382, 112, 196, 116)
    ctx.setLineDash([]); ctx.fillStyle = '#ff4444'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('[TAMPER REGION]', 400, 175)
  }
  const [header, data] = canvas.toDataURL('image/jpeg', 0.9).split(',')
  const mime = header.match(/:(.*?);/)![1]
  const binary = atob(data); const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([new Blob([bytes], { type: mime })], `${name}.jpg`, { type: 'image/jpeg' })
}

// ── Upload drop zone ──────────────────────────────────────────────────────────
function UploadBox({ label, sublabel, icon, file, onFile }: {
  label: string; sublabel: string; icon: React.ReactNode; file: File | null; onFile: (f: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setOver(false)
    const f = e.dataTransfer.files[0]; if (f) onFile(f)
  }, [onFile])

  return (
    <div className="flex-1 min-w-0">
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-xl h-44 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
          over
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]'
            : file
            ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
        }`}
      >
        {file ? (
          <div className="text-center px-4">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-2">
              <CheckIcon className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 truncate max-w-[140px]">{file.name}</p>
            <p className="text-[10px] text-slate-400 mt-1">Click to replace</p>
          </div>
        ) : (
          <div className="text-center px-4 pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
              {icon}
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{sublabel}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">JPG · PNG · PDF</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }} />
      </div>
    </div>
  )
}

// ── Live Selfie / Webcam Capture Box ───────────────────────────────────────
function SelfieBox({ selfieFile, onFile }: { selfieFile: File | null; onFile: (f: File | null) => void }) {
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      })
      streamRef.current = stream
      setIsCameraOpen(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(console.error)
        }
      }, 100)
    } catch (err) {
      console.error('Webcam error:', err)
      setCameraError('Camera unavailable or permission denied. Please upload a photo file instead.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraOpen(false)
  }

  const snapPhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], `live-selfie-${Date.now()}.jpg`, { type: 'image/jpeg' })
          onFile(file)
          stopCamera()
        }
      }, 'image/jpeg', 0.92)
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
        Live Selfie / Face Photo (Optional)
      </label>

      {isCameraOpen ? (
        <div className="relative border-2 border-blue-500 rounded-xl h-44 bg-slate-950 overflow-hidden flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          
          {/* Oval face reticle overlay */}
          <div className="absolute inset-0 border-[24px] border-black/40 pointer-events-none flex items-center justify-center">
            <div className="w-28 h-36 rounded-[50%] border-2 border-dashed border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-pulse" />
          </div>

          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2 px-3 z-10">
            <button
              type="button"
              onClick={snapPhoto}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all active:scale-95"
            >
              <CameraIcon className="w-3.5 h-3.5" /> Snap Photo
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg backdrop-blur-md transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : selfieFile ? (
        <div className="relative border-2 border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10 rounded-xl h-44 flex flex-col items-center justify-center text-center p-4">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-2">
            <CheckIcon className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 truncate max-w-[160px]">{selfieFile.name}</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Retake Photo
            </button>
            <span className="text-slate-400 text-xs">•</span>
            <button
              type="button"
              onClick={() => onFile(null)}
              className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl h-44 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
            <CameraIcon className="w-5 h-5" />
          </div>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={startCamera}
              className="btn-primary py-1.5 px-3 text-xs"
            >
              <CameraIcon className="w-3.5 h-3.5" /> Take Live Photo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary py-1.5 px-3 text-xs"
            >
              <UploadIcon className="w-3.5 h-3.5" /> Upload File
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Capture face live via camera or upload file</p>
          {cameraError && (
            <p className="text-[10px] text-red-500 mt-1 max-w-xs">{cameraError}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }}
          />
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { key: 'A', label: 'Genuine Document',  desc: 'No anomalies',        color: 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30' },
  { key: 'B', label: 'Tampered Photo',    desc: 'Altered region',       color: 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30' },
  { key: 'C', label: 'Cloned Identity',   desc: 'Suspected fraud',      color: 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' },
]
const STEPS = ['Preprocessing image', 'Running OCR', 'Forensic analysis', 'Face verification', 'Risk assessment']
type Phase = 'idle' | 'loading' | 'done'

export default function ScreeningPage() {
  const [docFile, setDocFile]       = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [scenario, setScenario]     = useState<string | null>(null)
  const [phase, setPhase]           = useState<Phase>('idle')
  const [stepIdx, setStepIdx]       = useState(0)
  const [result, setResult]         = useState<DocumentAnalysisResult | null>(null)
  const [error, setError]           = useState('')
  const [decision, setDecision]     = useState('')
  const [notes, setNotes]           = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [copied, setCopied]         = useState(false)

  async function runScenario(key: string) {
    setScenario(key)
    const f = createDemoFile(`scenario-${key}`, key)
    setDocFile(f); setSelfieFile(null); setResult(null); setError(''); setSubmitted(false); setDecision(''); setNotes('')
    await runAnalysis(f, undefined, key)
  }

  async function runAnalysis(doc: File, selfie?: File, sc?: string) {
    setPhase('loading'); setStepIdx(0); setResult(null); setError('')
    const ticker = setInterval(() => setStepIdx(i => (i < STEPS.length - 1 ? i + 1 : i)), 800)
    try {
      const res = await api.analyzeDocument(doc, sc, selfie)
      clearInterval(ticker); setStepIdx(STEPS.length - 1)
      await new Promise(r => setTimeout(r, 300))
      setResult(res); setPhase('done')
    } catch (e) {
      clearInterval(ticker)
      setError(e instanceof Error ? e.message : 'Analysis failed'); setPhase('idle')
    }
  }

  function reset() {
    setDocFile(null); setSelfieFile(null); setScenario(null); setResult(null)
    setError(''); setPhase('idle'); setSubmitted(false); setDecision(''); setNotes('')
  }

  const scoreColor = (s: number) =>
    s >= 75 ? 'text-red-700 dark:text-red-400' : s >= 50 ? 'text-orange-600 dark:text-orange-400' :
    s >= 25 ? 'text-amber-600 dark:text-amber-400' : 'text-green-700 dark:text-green-400'

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="page-icon-blue">
          <ScanIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Document Screening</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">AI-assisted identity and document verification</p>
        </div>
      </div>

      {/* ── Idle: upload form ── */}
      {phase === 'idle' && !result && (
        <div className="space-y-5 animate-slide-up">

          {/* Scenario presets */}
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
              <PlayIcon className="w-3.5 h-3.5" />
              Quick Demo — Instant Evaluation
            </p>
            <div className="flex flex-wrap gap-2.5">
              {SCENARIOS.map(s => (
                <button
                  key={s.key}
                  onClick={() => runScenario(s.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all duration-150 active:scale-95 ${
                    scenario === s.key
                      ? 'bg-blue-700 border-blue-700 text-white shadow-sm'
                      : s.color
                  }`}
                >
                  <span className="font-bold">Scenario {s.key}</span>
                  <span className="opacity-80">—</span>
                  <span>{s.label}</span>
                  <span className="text-[10px] opacity-60 hidden sm:inline">({s.desc})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual upload */}
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
              <UploadIcon className="w-3.5 h-3.5" />
              Or Upload / Capture Files Manually
            </p>
            <div className="flex gap-4 flex-wrap sm:flex-nowrap">
              <UploadBox
                label="Document" sublabel="Drop passport / ID here"
                icon={<UploadIcon className="w-5 h-5" />}
                file={docFile} onFile={f => { setDocFile(f); setScenario(null) }}
              />
              <SelfieBox
                selfieFile={selfieFile}
                onFile={setSelfieFile}
              />
            </div>
            <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
              {docFile && (
                <button onClick={() => { setDocFile(null); setSelfieFile(null) }} className="btn-ghost text-xs">
                  <XIcon className="w-3.5 h-3.5" /> Clear files
                </button>
              )}
              <button
                disabled={!docFile}
                onClick={() => docFile && runAnalysis(docFile, selfieFile ?? undefined, scenario ?? undefined)}
                className="btn-primary ml-auto"
              >
                <PlayIcon className="w-4 h-4" />
                Run Analysis
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-slide-in">
              <XIcon className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {phase === 'loading' && (
        <div className="card p-12 flex flex-col items-center gap-5 animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-100 dark:border-blue-900" />
            <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin absolute inset-0" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-900 dark:text-white">{STEPS[stepIdx]}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Step {stepIdx + 1} of {STEPS.length}</p>
          </div>
          <div className="w-full max-w-xs space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Progress</span>
              <span>{Math.round(((stepIdx + 1) / STEPS.length) * 100)}%</span>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < stepIdx ? 'bg-blue-600' : i === stepIdx ? 'bg-blue-400 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'
                }`}
                title={s}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {phase === 'done' && result && (
        <div className="space-y-4 animate-slide-up">

          {/* Risk banner */}
          <div className={`card flex items-center justify-between flex-wrap gap-4 px-5 py-4 border-l-4 ${
            result.risk.risk_level === 'CRITICAL' ? 'border-l-red-600' :
            result.risk.risk_level === 'HIGH'     ? 'border-l-orange-500' :
            result.risk.risk_level === 'MEDIUM'   ? 'border-l-amber-500' : 'border-l-green-500'
          }`}>
            <div>
              <p className="text-label mb-1">Verification Result</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {result.verification_id}</p>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="text-label mb-1">Risk Score</p>
                <p className={`text-4xl font-bold tabular-nums ${scoreColor(result.risk.risk_score)}`}>
                  {result.risk.risk_score}
                  <span className="text-sm font-normal text-slate-400">/100</span>
                </p>
              </div>
              <RiskBadge level={result.risk.risk_level} size="lg" showDot />
            </div>
          </div>

          {/* Details card */}
          <div className="card overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">

            {/* OCR fields */}
            <div className="px-5 py-4">
              <p className="text-label mb-3 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                Extracted Document Fields
              </p>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                {([
                  ['Name',          result.extracted_fields.name],
                  ['Date of Birth', result.extracted_fields.date_of_birth],
                  ['Document No.',  result.extracted_fields.document_number],
                  ['Expiry Date',   result.extracted_fields.expiry_date],
                  ['Nationality',   result.extracted_fields.nationality],
                  ['Document Type', result.document_type],
                ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([label, val]) => (
                  <div key={label}>
                    <dt className="text-label mb-0.5">{label}</dt>
                    <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100">{val}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Forensic flags */}
            {result.forensic_indicators.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-label mb-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                  Forensic Flags
                </p>
                <ul className="space-y-2.5">
                  {result.forensic_indicators.map((fi, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${fi.confidence > 0.7 ? 'bg-red-500' : fi.confidence > 0.4 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fi.indicator}</p>
                        <p className="text-xs text-muted">{fi.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation checks */}
            {result.validation_results.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-label mb-3">Validation Checks</p>
                <div className="space-y-2">
                  {result.validation_results.map((v, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      {v.passed
                        ? <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                        : <XIcon className="w-4 h-4 text-red-500 shrink-0" />
                      }
                      <span className={`text-sm ${v.passed ? 'text-slate-700 dark:text-slate-300' : 'text-red-700 dark:text-red-400 font-medium'}`}>{v.check}</span>
                      {!v.passed && <span className="text-xs text-muted">— {v.message}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Face verification */}
            {result.face_verification && (
              <div className="px-5 py-4">
                <p className="text-label mb-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /></svg>
                  Face Verification
                </p>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-label mb-0.5">Similarity</p>
                    <p className={`text-2xl font-bold ${result.face_verification.similarity_score >= 0.8 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {(result.face_verification.similarity_score * 100).toFixed(1)}%
                    </p>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${
                    result.face_verification.verdict === 'MATCH'
                      ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    {result.face_verification.verdict}
                  </span>
                </div>
              </div>
            )}

            {/* Recommended action */}
            {result.risk.recommended_action && (
              <div className="px-5 py-4 bg-blue-50 dark:bg-blue-900/10">
                <p className="text-label mb-1 text-blue-600 dark:text-blue-400">System Recommendation</p>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">{result.risk.recommended_action}</p>
              </div>
            )}

            {/* Officer decision */}
            <div className="px-5 py-4">
              <p className="text-label mb-3">Officer Decision</p>
              {submitted ? (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-semibold">
                  <CheckCircleIcon className="w-5 h-5" />
                  Decision recorded: <strong>{decision}</strong>
                  <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="ml-auto btn-ghost text-xs">
                    {copied ? <><CheckIcon className="w-3.5 h-3.5" /> Copied</> : <><CopyIcon className="w-3.5 h-3.5" /> Copy ID</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {['ADMIT / CLEAR', 'SECONDARY SCREENING', 'DETAIN / FLAG'].map(d => (
                      <button
                        key={d}
                        onClick={() => setDecision(d)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-150 active:scale-95 ${
                          decision === d
                            ? d.startsWith('ADMIT')     ? 'bg-green-700 border-green-700 text-white shadow-sm'
                            : d.startsWith('SECONDARY') ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                            :                             'bg-red-700 border-red-700 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Optional officer notes…"
                    className="input resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <button disabled={!decision} onClick={() => setSubmitted(true)} className="btn-primary">
                      <CheckCircleIcon className="w-4 h-4" /> Submit to Audit Log
                    </button>
                    <button onClick={reset} className="btn-ghost text-sm">
                      <XIcon className="w-3.5 h-3.5" /> New Screening
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {submitted && (
            <div className="text-right">
              <button onClick={reset} className="btn-ghost text-sm text-blue-700 dark:text-blue-400 hover:text-blue-800">
                ← Start New Screening
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
