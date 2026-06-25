import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { LazyMotion, MotionConfig } from 'motion/react'
import App from '@/App.jsx'
import { queryClient } from '@/core/lib/queryClient.js'
import './index.css'

// Carga diferida de las features de animación (chunk async). Los componentes
// usan el core ligero `m` (importado como `motion`); LazyMotion inyecta las
// features tras la hidratación.
const loadMotionFeatures = () => import('@/core/lib/motionFeatures.js').then((mod) => mod.default)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={loadMotionFeatures}>
        {/* reducedMotion="user" respeta prefers-reduced-motion en todas las
            animaciones de motion (entrada, hover, layout) sin tocar cada uno. */}
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  </StrictMode>
)
