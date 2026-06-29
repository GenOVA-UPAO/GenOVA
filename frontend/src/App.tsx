import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { AppLayout } from '@/core/layouts/shells/AppLayout.tsx'
import { getCachedUser, getCurrentUser } from '@/core/lib/auth/me'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage.tsx'
import { LoginPage } from '@/features/auth/pages/LoginPage.tsx'
import { RegisterPage } from '@/features/auth/pages/RegisterPage.tsx'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage.tsx'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage.tsx'
import { isLoggedIn } from '@/features/auth/services/auth'
import { DashboardPage } from '@/features/ova_library/pages/DashboardPage.tsx'

const AdminRolesPage = lazy(() =>
  import('@/features/admin/pages/AdminRolesPage.tsx').then((m) => ({
    default: m.AdminRolesPage,
  })),
)
const AdminUsersPage = lazy(() =>
  import('@/features/admin/pages/AdminUsersPage.tsx').then((m) => ({
    default: m.AdminUsersPage,
  })),
)
const MisOvasPage = lazy(() =>
  import('@/features/ova_library/pages/MisOvasPage.tsx').then((m) => ({
    default: m.MisOvasPage,
  })),
)
const PapeleraPage = lazy(() =>
  import('@/features/ova_library/pages/PapeleraPage.tsx').then((m) => ({
    default: m.PapeleraPage,
  })),
)
const ProfilePage = lazy(() =>
  import('@/features/profile/pages/ProfilePage.tsx').then((m) => ({
    default: m.ProfilePage,
  })),
)
const ModelsPage = lazy(() =>
  import('@/features/ova_workspace/pages/ModelsPage.tsx').then((m) => ({
    default: m.ModelsPage,
  })),
)
const UserLinksPage = lazy(() =>
  import('@/features/profile/pages/UserLinksPage.tsx').then((m) => ({
    default: m.UserLinksPage,
  })),
)
const AnalyticsPage = lazy(() =>
  import('@/features/analytics/pages/AnalyticsPage').then((m) => ({
    default: m.AnalyticsPage,
  })),
)
const EngagePage = lazy(() =>
  import('@/features/student/pages/EngagePage').then((m) => ({
    default: m.EngagePage,
  })),
)
const ExplorePage = lazy(() =>
  import('@/features/student/pages/ExplorePage').then((m) => ({
    default: m.ExplorePage,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/core/components/NotFoundPage.tsx').then((m) => ({
    default: m.NotFoundPage,
  })),
)
const OvaWorkspacePage = lazy(() =>
  import('@/features/ova_workspace/pages/OvaWorkspacePage.tsx').then((m) => ({
    default: m.OvaWorkspacePage,
  })),
)

import { SpeedInsights } from '@vercel/speed-insights/react'
import { Toaster } from 'sonner'
import { RootErrorBoundary } from '@/core/components/RootErrorBoundary.tsx'

interface UserData {
  role?: string
  full_name?: string
  email?: string
}

function RouteFallback() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  )
}

export function AdminRoute() {
  const cached = getCachedUser() as UserData | null
  const [loading, setLoading] = useState(() => isLoggedIn() && !cached)
  const [isAdmin, setIsAdmin] = useState(() => cached?.role === 'administrador')

  useEffect(() => {
    if (!isLoggedIn()) return

    let cancelled = false
    const checkAdmin = async () => {
      const user = (await getCurrentUser()) as UserData | null
      if (cancelled) return
      if (user) setIsAdmin(user.role === 'administrador')
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
          <p className="text-xs text-muted-foreground font-medium">
            Verificando acceso de administrador...
          </p>
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
      <RootErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/recuperar-contrasena"
              element={<ForgotPasswordPage />}
            />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verificar-correo" element={<VerifyEmailPage />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/mis-ovas" element={<MisOvasPage />} />
              <Route path="/papelera" element={<PapeleraPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/modelos" element={<ModelsPage />} />
              <Route
                path="/fallback"
                element={<Navigate to="/modelos" replace />}
              />
              <Route path="/vinculacion" element={<UserLinksPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/metodologia/engage" element={<EngagePage />} />
              <Route path="/metodologia/explore" element={<ExplorePage />} />

              <Route element={<AdminRoute />}>
                <Route path="/admin/roles" element={<AdminRolesPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route
                  path="/admin/platform"
                  element={<Navigate to="/modelos" replace />}
                />
              </Route>
            </Route>
            <Route element={<AppLayout fullBleed />}>
              <Route path="/crear-ova" element={<OvaWorkspacePage />} />
              <Route
                path="/ova/job/:jobId/workspace"
                element={<OvaWorkspacePage />}
              />
              <Route
                path="/ova/:ovaId/workspace"
                element={<OvaWorkspacePage />}
              />
            </Route>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </RootErrorBoundary>
    </>
  )
}

export default App
