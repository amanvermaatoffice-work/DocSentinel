import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'
import AuditPage from './pages/AuditPage'
import DashboardPage from './pages/DashboardPage'
import FraudPatternsPage from './pages/FraudPatternsPage'
import HistoryPage from './pages/HistoryPage'
import IdentityPage from './pages/IdentityPage'
import LoginPage from './pages/LoginPage'
import ScreeningPage from './pages/ScreeningPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/screening" element={<ScreeningPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/identity/:id" element={<IdentityPage />} />
            <Route path="/identity" element={<Navigate to="/identity/ID-REF-001" replace />} />
            <Route path="/fraud-patterns" element={<FraudPatternsPage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)


