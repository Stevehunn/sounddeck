// electron/modules/protocolHandler.js

const { protocol } = require('electron')
const path = require('path')
const fs = require('fs')
const { Readable } = require('stream')

// ─── MIME ────────────────────────────────────────────────────────────────

const MIME_MAP = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.weba': 'audio/webm',
  '.webm': 'audio/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
}

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_MAP[ext] || 'application/octet-stream'
}

// Convertit un Readable Node en Web ReadableStream (requis par Response)
function nodeStreamToWeb(nodeStream) {
  return Readable.toWeb(nodeStream)
}

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

      // Stat pour connaître la taille du fichier
      const stat = await fs.promises.stat(filePath)
      const mime = getMime(filePath)

      // Lit le header Range de la requête entrante
      const rangeHeader = request.headers.get('Range')

      // ─── Cas 1 : requête Range (seek) ────────────────────────────────
      if (rangeHeader) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())

        if (match) {
          const startStr = match[1]
          const endStr = match[2]

          let start = startStr ? parseInt(startStr, 10) : 0
          let end = endStr ? parseInt(endStr, 10) : stat.size - 1

          if (isNaN(start)) start = 0
          if (isNaN(end) || end >= stat.size) end = stat.size - 1

          if (start >= stat.size || start > end) {
            return new Response(null, {
              status: 416,
              headers: {
                'Content-Range': `bytes */${stat.size}`,
                'Accept-Ranges': 'bytes',
              },
            })
          }

          const chunkSize = end - start + 1
          const nodeStream = fs.createReadStream(filePath, { start, end })

          return new Response(nodeStreamToWeb(nodeStream), {
            status: 206,
            headers: {
              'Content-Type': mime,
              'Content-Length': String(chunkSize),
              'Content-Range': `bytes ${start}-${end}/${stat.size}`,
              'Accept-Ranges': 'bytes',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-store',
            },
          })
        }
      }

      // ─── Cas 2 : requête complète ────────────────────────────────────
      const nodeStream = fs.createReadStream(filePath)

      return new Response(nodeStreamToWeb(nodeStream), {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(stat.size),
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          // Pas de cache agressif : sinon le browser croit avoir le
          // fichier complet en cache et ne redemande pas de Range.
          'Cache-Control': 'no-store',
        },
      })
    } catch (e) {
      console.error('❌ [protocol] Erreur handler:', e)
      return new Response(`Error: ${e.message}`, { status: 500 })
    }
  })

}

// ─── EXPORTS ─────────────────────────────────────────────────────────────

module.exports = {
  registerLocalSchemes,
  registerLocalFileProtocol,
}