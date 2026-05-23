import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate, Outlet } from 'react-router'
import { clearToken, isAuthenticated, getToken } from './lib/auth.js'
import { AppLayout } from './layouts/AppLayout.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { CrearOvaPage } from './pages/CrearOvaPage.jsx'
import { AdminRolesPage } from './pages/AdminRolesPage.jsx'
import { AdminUsersPage } from './pages/AdminUsersPage.jsx'
import { MisOvasPage } from './pages/MisOvasPage.jsx'
import { EditarOvaPage } from './pages/EditarOvaPage.jsx'
import { PapeleraPage } from './pages/PapeleraPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { EngagePage } from './pages/EngagePage.jsx'
import { ExplorePage } from './pages/ExplorePage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { LabsPage } from './pages/LabsPage.jsx'
import { Toaster } from 'sonner'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function AdminRoute() {
  const [loading, setLoading] = useState(() => isAuthenticated())
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) return

    const checkAdmin = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${getToken()}` },  // ← fix
        })
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
          <p className="text-xs text-slate-400 font-medium">Verificando acceso de administrador...</p>
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
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <AppLayout />
}

function App() {
  const navigate = useNavigate()

  useEffect(() => {
    const checkSession = async () => {
      if (!isAuthenticated()) {
        navigate('/login', { replace: true })
        return
      }
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${getToken()}` },  // ← fix
        })
        if (response.status === 401) {
          await clearToken()
          navigate('/login', { replace: true })
        }
      } catch (err) {
        console.error('Error en heartbeat de sesión:', err)
      }
    }

    if (isAuthenticated()) {
      checkSession()
    }

    const interval = setInterval(checkSession, 60000)
    return () => clearInterval(interval)
  }, [navigate])

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/crear-ova" element={<CrearOvaPage />} />
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
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App