import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { formatBuildVersion } from './src/lib/buildVersion.js'

export default defineConfig({
  base: '/youtube-playlist/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(formatBuildVersion(new Date(), process.env.GITHUB_RUN_NUMBER)),
  },
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
