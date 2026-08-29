import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/youtube-playlist/',
  plugins: [react()],
  server: {
    port: 5183,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    globals: true,
  },
})
