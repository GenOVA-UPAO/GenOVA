import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate, Outlet } from 'react-router'
import { clearToken, getToken, isTokenExpired } from './lib/auth.js'
import { AppLayout } from './layouts/AppLayout.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { CrearOvaPage } from './pages/CrearOvaPage.jsx'
import { AdminRolesPage } from './pages/AdminRolesPage.jsx'
import { AdminUsersPage } from './pages/AdminUsersPage.jsx'
import { MisOvasPage } from './pages/MisOvasPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'

import { Toaster } from 'sonner'
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function AdminRoute() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    const checkAdmin = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        if (response.status === 200) {
          const user = await response.json()
          if (user.role === 'administrador') {
            setIsAdmin(true)
          } else {
            setIsAdmin(false)
          }
        } else {
          setIsAdmin(false)
        }
      } catch (error) {
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

function App() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = getToken()
    if (token && isTokenExpired(token)) {
      clearToken()
      return false
    }
    return Boolean(token)
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const token = getToken()
      const valid = token && !isTokenExpired(token)
      if (!valid) {
        clearToken()
        setIsAuthenticated(false)
        navigate('/login', { replace: true })
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [navigate])

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/crear-ova" element={<CrearOvaPage />} />
          <Route path="/mis-ovas" element={<MisOvasPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          
          {/* Unified Admin pages nested in AppLayout and protected by AdminRoute */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/roles" element={<AdminRolesPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
