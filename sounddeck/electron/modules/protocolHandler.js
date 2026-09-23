// electron/modules/protocolHandler.js
// Protocole custom `sounddeck-local://` pour servir les fichiers userData
// en respectant webSecurity: true (contourne la restriction file:// cross-origin).
//
// Format d'URL : sounddeck-local://file/<encoded-absolute-path>
// Exemple     : sounddeck-local://file/C%3A%2FUsers%2F...%2Fsounds%2Ffoo.mp3

const { protocol, net } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')

// ─── SCHEME PRIVILÉGIÉ (à appeler AVANT app.whenReady()) ────────────────

function registerLocalSchemes() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'sounddeck-local',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        bypassCSP: false,
      },
    },
  ])
}

// ─── VALIDATION DE CHEMIN ───────────────────────────────────────────────

function getAllowedRoots() {
  const { app } = require('electron')
  const userData = app.getPath('userData')
  const resourcesPath = process.resourcesPath || ''

  const roots = [
    path.join(userData, 'sounds'),
    path.join(userData, 'images'),
    path.join(userData, 'plugins'),
    path.join(userData, 'exports'),
    userData,
  ]

  if (resourcesPath) {
    roots.push(resourcesPath)
  }

  return roots.map((r) => path.normalize(r).toLowerCase())
}

function isPathAllowed(filePath) {
  const normalized = path.normalize(filePath).toLowerCase()
  const roots = getAllowedRoots()

  // Empêche les remontées de dossier du type `../../../Windows`
  if (normalized.includes('..')) return false

  return roots.some((root) => {
    if (normalized === root) return true
    const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep
    return normalized.startsWith(rootWithSep)
  })
}

// ─── HANDLER (à appeler APRÈS app.whenReady()) ──────────────────────────

function registerLocalFileProtocol() {
  protocol.handle('sounddeck-local', async (request) => {
    try {
      const url = new URL(request.url)

      // Le hostname doit être `file`
      if (url.hostname !== 'file') {
        return new Response('Invalid hostname', { status: 400 })
      }

      // Enlève le `/` initial du pathname
      const encodedPath = url.pathname.slice(1)
      if (!encodedPath) {
        return new Response('Missing path', { status: 400 })
      }

      const filePath = decodeURIComponent(encodedPath)

      // Sécurité : chemin autorisé ?
      if (!isPathAllowed(filePath)) {
        console.warn(`🚫 [protocol] Accès refusé : ${filePath}`)
        return new Response('Forbidden', { status: 403 })
      }

      // Fichier existe ?
      if (!fs.existsSync(filePath)) {
        return new Response('Not found', { status: 404 })
      }

      // Utilise net.fetch pour bénéficier du streaming + bon MIME
      const fileUrl = pathToFileURL(filePath).toString()
      const response = await net.fetch(fileUrl)

      // Surcharge des headers (CORS + cache)
      const headers = new Headers(response.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Cache-Control', 'public, max-age=3600')

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (e) {
      console.error('❌ [protocol] Erreur handler:', e)
      return new Response(`Error: ${e.message}`, { status: 500 })
    }
  })

  console.log('✅ [protocol] sounddeck-local:// enregistré')
}

module.exports = {
  registerLocalSchemes,
  registerLocalFileProtocol,
}