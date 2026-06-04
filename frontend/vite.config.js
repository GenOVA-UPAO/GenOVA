import path from 'path'
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
  build: {
    // Split out stable vendor bundles so app changes don't bust the long-lived
    // immutable cache for React / router code on Vercel.
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) requiere manualChunks como función, no objeto.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('sonner')) return 'vendor-ui'
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'
        },
      },
    },
  },
})
