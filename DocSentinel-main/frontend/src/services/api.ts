const TOKEN_KEY = 'biis_token'
const OFFICER_KEY = 'biis_officer'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(token: string, officerId: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(OFFICER_KEY, officerId)
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(OFFICER_KEY)
}

export function getOfficerId(): string | null {
  return localStorage.getItem(OFFICER_KEY)
}

export async function login(officerId: string, password: string) {
  const res = await api.login(officerId, password)
  setAuth(res.access_token, res.officer_id)
  return res
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(path, { ...options, headers })
  if (res.status === 401) {
    clearAuth()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  login: (officerId: string, password: string) =>
    request<{ access_token: string; officer_id: string; demo_mode: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ officer_id: officerId, password }),
    }),

  dashboard: () => request<import('../types').DashboardStats>('/api/dashboard'),

  analyzeDocument: (file: File, scenario?: string, selfie?: File) => {
    const form = new FormData()
    form.append('file', file)
    if (scenario) form.append('scenario', scenario)
    if (selfie) form.append('selfie', selfie)
    return request<import('../types').DocumentAnalysisResult>('/api/documents/analyze', {
      method: 'POST',
      body: form,
      headers: {},
    })
  },

  encounters: () => request<import('../types').EncounterSummary[]>('/api/encounters'),

  identityTimeline: (id: string) =>
    request<import('../types').IdentityTimeline>(`/api/identity/${id}/timeline`),

  identityGraph: (id: string) =>
    request<import('../types').IdentityGraph>(`/api/identity/${id}/graph`),

  fraudPatterns: () => request<import('../types').FraudPattern[]>('/api/fraud-patterns'),

  auditList: () => request<import('../types').AuditRecord[]>('/api/audit'),

  auditGet: (id: string) => request<import('../types').AuditRecord>(`/api/audit/${id}`),


  auditVerify: () =>
    request<{ intact: boolean; message: string; records_checked: number }>('/api/audit/verify', {
      method: 'POST',
    }),

  submitReview: (data: {
    verification_id: string
    encounter_id: string
    decision: string
    notes?: string
  }) =>
    request<{ success: boolean; message: string }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
