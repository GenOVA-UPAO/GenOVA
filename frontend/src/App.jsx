import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, Outlet } from 'react-router'
import { isLoggedIn } from './lib/auth.js'
import { apiFetch } from './lib/http.js'
import { AppLayout } from './layouts/AppLayout.jsx'
import { WorkspaceLayout } from './layouts/WorkspaceLayout.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'

// Code-split heavier authenticated routes so the login bundle stays tiny.
const CrearOvaPage = lazy(() => import('./pages/CrearOvaPage.jsx').then((m) => ({ default: m.CrearOvaPage })))
const AdminRolesPage = lazy(() => import('./pages/AdminRolesPage.jsx').then((m) => ({ default: m.AdminRolesPage })))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage.jsx').then((m) => ({ default: m.AdminUsersPage })))
const MisOvasPage = lazy(() => import('./pages/MisOvasPage.jsx').then((m) => ({ default: m.MisOvasPage })))
const EditarOvaPage = lazy(() => import('./pages/EditarOvaPage.jsx').then((m) => ({ default: m.EditarOvaPage })))
const PapeleraPage = lazy(() => import('./pages/PapeleraPage.jsx').then((m) => ({ default: m.PapeleraPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx').then((m) => ({ default: m.ProfilePage })))
const EngagePage = lazy(() => import('./pages/EngagePage.jsx').then((m) => ({ default: m.EngagePage })))
const ExplorePage = lazy(() => import('./pages/ExplorePage.jsx').then((m) => ({ default: m.ExplorePage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx').then((m) => ({ default: m.NotFoundPage })))
const LabsPage = lazy(() => import('./pages/LabsPage.jsx').then((m) => ({ default: m.LabsPage })))
const OvaWorkspacePage = lazy(() => import('./pages/OvaWorkspacePage.jsx').then((m) => ({ default: m.OvaWorkspacePage })))

import { Toaster } from 'sonner'

function RouteFallback() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  )
}

export function AdminRoute() {
  const [loading, setLoading] = useState(() => isLoggedIn())
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) return

    const checkAdmin = async () => {
      try {
        const response = await apiFetch('/api/auth/me')
        if (response.status === 200) {
          const user = await response.json()
          setIsAdmin(user.role === 'administrador')
        } else {
          setIsAdmin(false)
        }
      } catch {
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-xs text-muted-foreground font-medium">Verificando acceso de administrador...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

function ProtectedLayout() {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return <AppLayout />
}

function App() {
  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/mis-ovas" element={<MisOvasPage />} />
            <Route path="/mis-ovas/:ovaId/editar" element={<EditarOvaPage />} />
            <Route path="/papelera" element={<PapeleraPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/metodologia/engage" element={<EngagePage />} />
            <Route path="/metodologia/explore" element={<ExplorePage />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin/roles" element={<AdminRolesPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/labs" element={<LabsPage />} />
            </Route>
          </Route>
          {/* Full-bleed layout: no sidebar, no container padding, no max-width */}
          <Route element={<WorkspaceLayout />}>
            <Route path="/crear-ova" element={<CrearOvaPage />} />
            <Route path="/ova/:ovaId/workspace" element={<OvaWorkspacePage />} />
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
