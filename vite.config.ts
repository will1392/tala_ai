import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
    // Force Vite to rebuild the dependency pre-bundle on every start.
    // This avoids the "Outdated Optimize Dep" 504s that were causing the
    // dev server to return blank pages after dependency upgrades.
    force: true
  },
  server: {
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
