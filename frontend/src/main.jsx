import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.jsx'
import './index.css'

// Global Fetch Interceptor for Cookies and 401 Redirects
const originalFetch = window.fetch
window.fetch = async (url, options = {}) => {
  // Automatically include credentials (cookies) in requests
  options.credentials = 'include'

  // Remove invalid Bearer headers that are null or undefined
  if (options.headers) {
    if (options.headers instanceof Headers) {
      if (options.headers.has('Authorization')) {
        const auth = options.headers.get('Authorization')
        if (auth && (auth.includes('null') || auth.includes('undefined'))) {
          options.headers.delete('Authorization')
        }
      }
    } else {
      const auth = options.headers['Authorization'] || options.headers['authorization']
      if (auth && (auth.includes('null') || auth.includes('undefined'))) {
        delete options.headers['Authorization']
        delete options.headers['authorization']
      }
    }
  }

  const response = await originalFetch(url, options)

  // Detect session expiration (401 Unauthorized)
  // Exclude login/register requests to avoid infinite redirect loops during failed logins
  const urlString = String(url)
  if (
    response.status === 401 &&
    !urlString.includes('/auth/login') &&
    !urlString.includes('/auth/register')
  ) {
    localStorage.removeItem('genova_is_authenticated')
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }
  return response
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
