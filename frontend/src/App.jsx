import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'
import { clearToken, getToken, isTokenExpired } from './lib/auth.js'
import { AppLayout } from './layouts/AppLayout.jsx'
import { AdminLayout } from './layouts/AdminLayout.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { CrearOvaPage } from './pages/CrearOvaPage.jsx'
import { AdminRolesPage } from './pages/AdminRolesPage.jsx'
import { AdminUsersPage } from './pages/AdminUsersPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'

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
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route
        element={
          isAuthenticated ? <AdminLayout /> : <Navigate to="/login" replace />
        }
      >
        <Route path="/admin/roles" element={<AdminRolesPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
