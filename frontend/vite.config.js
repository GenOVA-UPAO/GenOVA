import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    fs: {
      // pnpm hoists deps to the monorepo root, so the dev server (rooted at
      // frontend/) must be allowed to serve e.g. @fontsource-variable/geist
      // woff2 files from ../node_modules. Without this Vite blocks them.
      allow: [path.resolve(import.meta.dirname, '..')],
    },
  },
  build: {
    // Split out stable vendor bundles so app changes don't bust the long-lived
    // immutable cache for React / router code on Vercel.
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) requiere manualChunks como función, no objeto.
        // OJO con el orden: pnpm incrusta la versión en la ruta (p. ej.
        // `@tanstack+react-query@..._react@19...`), así que un match genérico
        // de "react" arrastra motion/react-query/react-hook-form al chunk de
        // React. Por eso las libs propias se separan ANTES y el match de React
        // es por subruta exacta (`/react/`, `/react-dom/`).
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@phosphor-icons')) return 'vendor-icons'
          if (id.includes('radix-ui')) return 'vendor-radix'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('/motion/') || id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-forms'
          if (id.includes('@tanstack')) return 'vendor-query'
          if (id.includes('sonner')) return 'vendor-ui'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler'))
            return 'vendor-react'
        },
      },
    },
  },
})
