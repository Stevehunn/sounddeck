// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// ─── CSP DEV (avec HMR + eval) ──────────────────────────────────────────
const CSP_DEV = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' sounddeck-local: blob:",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "img-src 'self' data: blob: sounddeck-local: file: https:",
  "media-src 'self' data: blob: sounddeck-local: file: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "connect-src 'self' sounddeck-local: ws: wss: http://localhost:* https: file: blob:",
  "worker-src 'self' blob: sounddeck-local:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

// ─── CSP PROD (stricte) ─────────────────────────────────────────────────
const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' sounddeck-local: blob:",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "img-src 'self' data: blob: sounddeck-local: file: https:",
  "media-src 'self' data: blob: sounddeck-local: file: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "connect-src 'self' sounddeck-local: https: file: blob:",
  "worker-src 'self' blob: sounddeck-local:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

// ─── Plugin Vite : injecte la CSP selon le mode ─────────────────────────
function cspPlugin() {
  return {
    name: 'sounddeck-csp',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const isDev = !!ctx.server
        const csp = isDev ? CSP_DEV : CSP_PROD
        const metaTag = `    <meta http-equiv="Content-Security-Policy" content="${csp}">`
        return html.replace('<!-- CSP_PLACEHOLDER -->', metaTag)
      },
    },
  }
}

export default defineConfig({
  plugins: [
    react({
      include: /\.(js|jsx|ts|tsx)$/,
    }),
    cspPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@features': path.resolve(__dirname, './src/features'),
      '@plugins': path.resolve(__dirname, './src/plugins'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // ✅ ÉLARGI : inclut tous les tests dans src/ + electron/
    include: [
      'src/test/**/*.{test,spec}.{js,jsx}',
      'src/**/*.{test,spec}.{js,jsx}',
      'electron/**/*.{test,spec}.js',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'dist-electron/',
      'dist-plugins/',
      'src/test/_obsolete/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/main.jsx',
        'src/App.css',
        '**/*.config.js',
        '**/index.js',
        '**/index.jsx',
      ],
      // ⚠️ Thresholds volontairement désactivés pour le moment.
      // À activer progressivement après la Phase 1 (~30% de couverture).
      // thresholds: {
      //   lines: 30,
      //   functions: 30,
      //   branches: 30,
      //   statements: 30,
      // },
    },
  },
})