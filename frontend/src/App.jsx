import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, Outlet } from 'react-router'
import { isLoggedIn } from './lib/auth.js'
import { getCurrentUser } from './lib/me.js'
import { AppLayout } from './layout/shells/AppLayout.jsx'
import { WorkspaceLayout } from './layout/shells/WorkspaceLayout.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'

// Code-split heavier authenticated routes so the login bundle stays tiny.
const AdminRolesPage = lazy(() => import('./pages/AdminRolesPage.jsx').then((m) => ({ default: m.AdminRolesPage })))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage.jsx').then((m) => ({ default: m.AdminUsersPage })))
const AdminPlatformPage = lazy(() => import('./pages/AdminPlatformPage.jsx').then((m) => ({ default: m.AdminPlatformPage })))
const MisOvasPage = lazy(() => import('./pages/MisOvasPage.jsx').then((m) => ({ default: m.MisOvasPage })))
const PapeleraPage = lazy(() => import('./pages/PapeleraPage.jsx').then((m) => ({ default: m.PapeleraPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx').then((m) => ({ default: m.ProfilePage })))
const EngagePage = lazy(() => import('./pages/EngagePage.jsx').then((m) => ({ default: m.EngagePage })))
const ExplorePage = lazy(() => import('./pages/ExplorePage.jsx').then((m) => ({ default: m.ExplorePage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx').then((m) => ({ default: m.NotFoundPage })))
const LabsPage = lazy(() => import('./pages/LabsPage.jsx').then((m) => ({ default: m.LabsPage })))
const OvaWorkspacePage = lazy(() => import('./pages/OvaWorkspacePage.jsx').then((m) => ({ default: m.OvaWorkspacePage })))
const WireframeNavbarPage = lazy(() => import('./pages/WireframeNavbarPage.jsx').then((m) => ({ default: m.WireframeNavbarPage })))
const WireframeDashboardPage = lazy(() => import('./pages/WireframeDashboardPage.jsx').then((m) => ({ default: m.WireframeDashboardPage })))
const WireframeMisOvasPage = lazy(() => import('./pages/WireframeMisOvasPage.jsx').then((m) => ({ default: m.WireframeMisOvasPage })))
const WireframeCrearOvaPage = lazy(() => import('./pages/WireframeCrearOvaPage.jsx').then((m) => ({ default: m.WireframeCrearOvaPage })))
const WireframeWorkspacePage = lazy(() => import('./pages/WireframeWorkspacePage.jsx').then((m) => ({ default: m.WireframeWorkspacePage })))
const WireframeAdminRolesPage = lazy(() => import('./pages/WireframeAdminRolesPage.jsx').then((m) => ({ default: m.WireframeAdminRolesPage })))
const WireframeAdminUsersPage = lazy(() => import('./pages/WireframeAdminUsersPage.jsx').then((m) => ({ default: m.WireframeAdminUsersPage })))
const WireframeAdminPlatformPage = lazy(() => import('./pages/WireframeAdminPlatformPage.jsx').then((m) => ({ default: m.WireframeAdminPlatformPage })))
const WireframeProfilePage = lazy(() => import('./pages/WireframeProfilePage.jsx').then((m) => ({ default: m.WireframeProfilePage })))

import { Toaster } from 'sonner'
import { SpeedInsights } from '@vercel/speed-insights/react'

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

    let cancelled = false
    const checkAdmin = async () => {
      const user = await getCurrentUser()
      if (cancelled) return
      setIsAdmin(user?.role === 'administrador')
      setLoading(false)
    }

    checkAdmin()
    return () => {
      cancelled = true
    }
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
      <SpeedInsights />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/wireframe1" element={<WireframeNavbarPage />} />
          <Route path="/wireframe2" element={<WireframeDashboardPage />} />
          <Route path="/wireframe3" element={<WireframeMisOvasPage />} />
          <Route path="/wireframe4" element={<WireframeCrearOvaPage />} />
          <Route path="/wireframe5" element={<WireframeWorkspacePage />} />
          <Route path="/wireframe6" element={<WireframeWorkspacePage />} />
          <Route path="/wireframe7" element={<WireframeAdminRolesPage />} />
          <Route path="/wireframe8" element={<WireframeAdminUsersPage />} />
          <Route path="/wireframe9" element={<WireframeAdminPlatformPage />} />
          <Route path="/wireframe10" element={<WireframeProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/mis-ovas" element={<MisOvasPage />} />
            <Route path="/papelera" element={<PapeleraPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/metodologia/engage" element={<EngagePage />} />
            <Route path="/metodologia/explore" element={<ExplorePage />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin/roles" element={<AdminRolesPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/platform" element={<AdminPlatformPage />} />
              <Route path="/admin/labs" element={<LabsPage />} />
            </Route>
          </Route>
          {/* Full-bleed layout: no sidebar, no container padding, no max-width.
              Both routes render the SAME OvaWorkspacePage (unified create+edit
              surface): /crear-ova = creation mode, /ova/:id/workspace = edit mode. */}
          <Route element={<WorkspaceLayout />}>
            <Route path="/crear-ova" element={<OvaWorkspacePage />} />
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
