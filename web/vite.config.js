import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { formatBuildVersion } from './src/lib/buildVersion.js'
import { TINYURL_API } from './src/lib/urlShortener.js'

const TINYURL_ORIGIN = new URL(TINYURL_API).origin

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // iframe_api bootstraps www-widgetapi.js from www.youtube.com/s/player/...
  "script-src 'self' https://www.youtube.com",
  "style-src 'self'",
  // Video thumbnails returned by the YouTube Data API.
  "img-src 'self' data: https://i.ytimg.com",
  `connect-src 'self' https://www.googleapis.com ${TINYURL_ORIGIN}`,
  'frame-src https://www.youtube.com https://www.youtube-nocookie.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

// Production-only: the dev server and React Refresh inject inline scripts that
// this policy would block. frame-ancestors is ignored in a <meta> CSP, so it's
// deliberately omitted.
function contentSecurityPolicy() {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

export default defineConfig({
  base: '/youtube-playlist/',
  plugins: [react(), contentSecurityPolicy()],
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
