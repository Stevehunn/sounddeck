// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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

// vite.config.js
// ... (CSP + cspPlugin inchangés)

const SHARED_ALIASES = {
  '@': path.resolve(__dirname, './src'),
  '@core': path.resolve(__dirname, './src/core'),
  '@shared': path.resolve(__dirname, './src/shared'),
  '@features': path.resolve(__dirname, './src/features'),
  '@plugins': path.resolve(__dirname, './src/plugins'),
}

export default defineConfig({
  plugins: [
    react({ include: /\.(js|jsx|ts|tsx)$/ }),
    cspPlugin(),
  ],
  resolve: { alias: SHARED_ALIASES },
  base: './',
  build: { outDir: 'dist', assetsDir: 'assets' },
  server: { port: 5173, strictPort: true },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'frontend',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.js'],
          include: [
            'src/test/**/*.{test,spec}.{js,jsx}',
            'src/**/*.{test,spec}.{js,jsx}',
          ],
          exclude: [
            'node_modules/',
            'dist/',
            'dist-electron/',
            'dist-plugins/',
            'src/test/_obsolete/**',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'electron',
          environment: 'node',
          setupFiles: ['./src/test/setup-electron.js'],
          include: ['electron/**/*.{test,spec}.js'],
          exclude: [
            'node_modules/',
            'dist/',
            'dist-electron/',
            'electron/__test-mocks__/**',
          ],
          // ✅ Garder UNIQUEMENT les modules tests inline (pour transformation)
          server: {
            deps: {
              inline: [/electron[\\/]modules[\\/]/],
            },
          },
        },
      },
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
        'electron/__test-mocks__/**',
      ],
    },
  },
})