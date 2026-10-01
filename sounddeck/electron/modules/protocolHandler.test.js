// electron/modules/protocolHandler.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Readable } from 'stream'

import {
  registerLocalSchemes,
  registerLocalFileProtocol,
} from './protocolHandler'

// ─── Helpers ─────────────────────────────────────────────────────────
function makeFileUrl(absolutePath) {
  return `sounddeck-local://file/${encodeURIComponent(absolutePath)}`
}

function makeRequest(url, rangeHeader = null) {
  return {
    url,
    headers: {
      get: vi.fn((name) => (name === 'Range' ? rangeHeader : null)),
    },
  }
}

describe('protocolHandler', () => {
  let protocol
  let fs

  beforeEach(() => {
    vi.clearAllMocks()
    protocol = globalThis.__electronMock.protocol
    fs = globalThis.__fsMock

    // Reset fs mocks et pose des valeurs par défaut
    fs.existsSync.mockReset().mockReturnValue(true)
    fs.promises.stat.mockReset().mockResolvedValue({ size: 1024 })
    fs.createReadStream.mockReset().mockImplementation(() =>
      Readable.from([Buffer.from('fake audio data')])
    )
  })

  // ═══════════════════════════════════════════════════════════════════
  // registerLocalSchemes
  // ═══════════════════════════════════════════════════════════════════

  describe('registerLocalSchemes', () => {
    it('devrait appeler protocol.registerSchemesAsPrivileged', () => {
      registerLocalSchemes()
      expect(protocol.registerSchemesAsPrivileged).toHaveBeenCalledTimes(1)
    })

    it('devrait enregistrer exactement 1 scheme', () => {
      registerLocalSchemes()
      const [schemes] = protocol.registerSchemesAsPrivileged.mock.calls[0]
      expect(schemes).toHaveLength(1)
    })

    it('devrait enregistrer "sounddeck-local"', () => {
      registerLocalSchemes()
      const [schemes] = protocol.registerSchemesAsPrivileged.mock.calls[0]
      expect(schemes[0].scheme).toBe('sounddeck-local')
    })

    it('devrait activer les privilèges attendus', () => {
      registerLocalSchemes()
      const [schemes] = protocol.registerSchemesAsPrivileged.mock.calls[0]
      expect(schemes[0].privileges).toMatchObject({
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        bypassCSP: false,
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // registerLocalFileProtocol
  // ═══════════════════════════════════════════════════════════════════

  describe('registerLocalFileProtocol', () => {
    it('devrait enregistrer un handler sur "sounddeck-local"', () => {
      registerLocalFileProtocol()
      expect(protocol.handle).toHaveBeenCalledWith(
        'sounddeck-local',
        expect.any(Function)
      )
    })

    it('devrait retourner une fonction async', () => {
      registerLocalFileProtocol()
      const handler = protocol.handle.mock.calls[0][1]
      // Une async function a un constructor.name === 'AsyncFunction'
      expect(handler.constructor.name).toBe('AsyncFunction')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Handler — validation d'entrée
  // ═══════════════════════════════════════════════════════════════════

  describe('handler — validation', () => {
    let handler

    beforeEach(() => {
      registerLocalFileProtocol()
      handler = protocol.handle.mock.calls[0][1]
    })

    it('devrait retourner 400 si hostname !== "file"', async () => {
      const req = makeRequest('sounddeck-local://evil/fake/userData/test.mp3')
      const res = await handler(req)
      expect(res.status).toBe(400)
    })

    it('devrait retourner 400 si path vide', async () => {
      const req = makeRequest('sounddeck-local://file/')
      const res = await handler(req)
      expect(res.status).toBe(400)
    })

    it('devrait retourner 403 si chemin hors zones autorisées', async () => {
      const req = makeRequest(makeFileUrl('/etc/passwd'))
      const res = await handler(req)
      expect(res.status).toBe(403)
    })

    it('devrait retourner 403 si path contient ".."', async () => {
      const req = makeRequest(makeFileUrl('../../etc/passwd'))
      const res = await handler(req)
      expect(res.status).toBe(403)
    })

    it('devrait retourner 404 si fichier inexistant', async () => {
      fs.existsSync.mockReturnValue(false)
      const req = makeRequest(makeFileUrl('/fake/userData/sounds/nope.mp3'))
      const res = await handler(req)
      expect(res.status).toBe(404)
    })

    it('devrait retourner 500 si fs.promises.stat throw', async () => {
      fs.promises.stat.mockRejectedValue(new Error('stat failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const req = makeRequest(makeFileUrl('/fake/userData/sounds/a.mp3'))
      const res = await handler(req)

      expect(res.status).toBe(500)
      consoleSpy.mockRestore()
    })

    it('devrait logger une erreur dans le cas 500', async () => {
      fs.promises.stat.mockRejectedValue(new Error('boom'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const req = makeRequest(makeFileUrl('/fake/userData/sounds/a.mp3'))
      await handler(req)

      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ [protocol] Erreur handler:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Handler — succès sans Range
  // ═══════════════════════════════════════════════════════════════════

  describe('handler — succès sans Range', () => {
    let handler

    beforeEach(() => {
      registerLocalFileProtocol()
      handler = protocol.handle.mock.calls[0][1]
    })

    it('devrait retourner 200 pour un fichier autorisé', async () => {
      const req = makeRequest(makeFileUrl('/fake/userData/sounds/test.mp3'))
      const res = await handler(req)
      expect(res.status).toBe(200)
    })

    it('devrait définir Content-Length depuis la taille du fichier', async () => {
      fs.promises.stat.mockResolvedValue({ size: 2048 })
      const req = makeRequest(makeFileUrl('/fake/userData/sounds/test.mp3'))
      const res = await handler(req)
      expect(res.headers.get('content-length')).toBe('2048')
    })

    it('devrait définir Accept-Ranges: bytes', async () => {
      const req = makeRequest(makeFileUrl('/fake/userData/sounds/test.mp3'))
      const res = await handler(req)
      expect(res.headers.get('accept-ranges')).toBe('bytes')
    })

    it('devrait définir Cache-Control: no-store', async () => {
      const req = makeRequest(makeFileUrl('/fake/userData/sounds/test.mp3'))
      const res = await handler(req)
      expect(res.headers.get('cache-control')).toBe('no-store')
    })

    it('devrait définir Access-Control-Allow-Origin: *', async () => {
      const req = makeRequest(makeFileUrl('/fake/userData/sounds/test.mp3'))
      const res = await handler(req)
      expect(res.headers.get('access-control-allow-origin')).toBe('*')
    })

    it('devrait appeler fs.createReadStream', async () => {
      const req = makeRequest(makeFileUrl('/fake/userData/sounds/test.mp3'))
      await handler(req)
      expect(fs.createReadStream).toHaveBeenCalledTimes(1)
    })

    it('ne devrait PAS passer d\'options start/end sans Range', async () => {
      const req = makeRequest(makeFileUrl('/fake/userData/sounds/test.mp3'))
      await handler(req)
      const [, opts] = fs.createReadStream.mock.calls[0]
      expect(opts).toBeUndefined()
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Handler — MIME types
  // ═══════════════════════════════════════════════════════════════════

  describe('handler — MIME types', () => {
    let handler

    beforeEach(() => {
      registerLocalFileProtocol()
      handler = protocol.handle.mock.calls[0][1]
    })

    const mimeCases = [
      ['/fake/userData/sounds/test.mp3', 'audio/mpeg'],
      ['/fake/userData/sounds/test.wav', 'audio/wav'],
      ['/fake/userData/sounds/test.ogg', 'audio/ogg'],
      ['/fake/userData/sounds/test.flac', 'audio/flac'],
      ['/fake/userData/sounds/test.m4a', 'audio/mp4'],
      ['/fake/userData/images/test.png', 'image/png'],
      ['/fake/userData/images/test.jpg', 'image/jpeg'],
      ['/fake/userData/images/test.webp', 'image/webp'],
      ['/fake/userData/images/test.svg', 'image/svg+xml'],
      ['/fake/userData/sounds/test.xyz', 'application/octet-stream'],
    ]

    mimeCases.forEach(([filePath, expectedMime]) => {
      it(`devrait retourner "${expectedMime}" pour ${filePath.split('.').pop()}`, async () => {
        const req = makeRequest(makeFileUrl(filePath))
        const res = await handler(req)
        expect(res.headers.get('content-type')).toBe(expectedMime)
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Handler — Range requests
  // ═══════════════════════════════════════════════════════════════════

  describe('handler — Range requests', () => {
    let handler

    beforeEach(() => {
      registerLocalFileProtocol()
      handler = protocol.handle.mock.calls[0][1]
      fs.promises.stat.mockResolvedValue({ size: 1000 })
    })

    it('devrait retourner 206 pour Range valide', async () => {
      const req = makeRequest(
        makeFileUrl('/fake/userData/sounds/test.mp3'),
        'bytes=0-99'
      )
      const res = await handler(req)
      expect(res.status).toBe(206)
    })

    it('devrait retourner le Content-Range exact', async () => {
      const req = makeRequest(
        makeFileUrl('/fake/userData/sounds/test.mp3'),
        'bytes=100-199'
      )
      const res = await handler(req)
      expect(res.headers.get('content-range')).toBe('bytes 100-199/1000')
    })

    it('devrait retourner Content-Length = chunkSize', async () => {
      const req = makeRequest(
        makeFileUrl('/fake/userData/sounds/test.mp3'),
        'bytes=0-99'
      )
      const res = await handler(req)
      expect(res.headers.get('content-length')).toBe('100')
    })

    it('devrait passer start/end à createReadStream', async () => {
      const req = makeRequest(
        makeFileUrl('/fake/userData/sounds/test.mp3'),
        'bytes=100-199'
      )
      await handler(req)
      const [, opts] = fs.createReadStream.mock.calls[0]
      expect(opts).toEqual({ start: 100, end: 199 })
    })

    it('devrait clamper end à size-1 si end > size', async () => {
      const req = makeRequest(
        makeFileUrl('/fake/userData/sounds/test.mp3'),
        'bytes=0-99999'
      )
      const res = await handler(req)
      expect(res.headers.get('content-range')).toBe('bytes 0-999/1000')
    })

    it('devrait gérer "bytes=N-" (open-ended → size-1)', async () => {
      const req = makeRequest(
        makeFileUrl('/fake/userData/sounds/test.mp3'),
        'bytes=500-'
      )
      const res = await handler(req)
      expect(res.status).toBe(206)
      expect(res.headers.get('content-range')).toBe('bytes 500-999/1000')
    })

    it('devrait gérer "bytes=-N" (start=0)', async () => {
      const req = makeRequest(
        makeFileUrl('/fake/userData/sounds/test.mp3'),
        'bytes=-500'
      )
      const res = await handler(req)
      expect(res.status).toBe(206)
      expect(res.headers.get('content-range')).toBe('bytes 0-500/1000')
    })

    it('devrait retourner 416 si start >= size', async () => {
      const req = makeRequest(
        makeFileUrl('/fake/userData/sounds/test.mp3'),
        'bytes=2000-2100'
      )
      const res = await handler(req)
      expect(res.status).toBe(416)
    })

    it('devrait retourner Content-Range "bytes */size" sur 416', async () => {
      const req = makeRequest(
        makeFileUrl('/fake/userData/sounds/test.mp3'),
        'bytes=2000-2100'
      )
      const res = await handler(req)
      expect(res.headers.get('content-range')).toBe('bytes */1000')
    })

    it('devrait retourner 416 si start > end', async () => {
      const req = makeRequest(
        makeFileUrl('/fake/userData/sounds/test.mp3'),
        'bytes=500-100'
      )
      const res = await handler(req)
      expect(res.status).toBe(416)
    })

    it('devrait fallback en 200 si Range mal formé', async () => {
      const req = makeRequest(
        makeFileUrl('/fake/userData/sounds/test.mp3'),
        'not-a-valid-range'
      )
      const res = await handler(req)
      expect(res.status).toBe(200)
    })

    it('devrait fallback en 200 si Range a un préfixe inattendu', async () => {
      const req = makeRequest(
        makeFileUrl('/fake/userData/sounds/test.mp3'),
        'items=0-99'
      )
      const res = await handler(req)
      expect(res.status).toBe(200)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Handler — chemins autorisés (validation approfondie)
  // ═══════════════════════════════════════════════════════════════════

  describe('handler — chemins autorisés', () => {
    let handler

    beforeEach(() => {
      registerLocalFileProtocol()
      handler = protocol.handle.mock.calls[0][1]
    })

    const allowedPaths = [
      '/fake/userData/sounds/test.mp3',
      '/fake/userData/images/cover.png',
      '/fake/userData/plugins/my-plugin/index.js',
      '/fake/userData/exports/backup.zip',
      '/fake/userData/root-file.txt',
    ]

    allowedPaths.forEach((p) => {
      it(`devrait autoriser ${p}`, async () => {
        const req = makeRequest(makeFileUrl(p))
        const res = await handler(req)
        expect(res.status).toBe(200)
      })
    })

    const forbiddenPaths = [
      '/etc/passwd',
      '/Windows/System32/cmd.exe',
      '/root/.ssh/id_rsa',
    ]

    forbiddenPaths.forEach((p) => {
      it(`devrait bloquer ${p}`, async () => {
        const req = makeRequest(makeFileUrl(p))
        const res = await handler(req)
        expect(res.status).toBe(403)
      })
    })
  })
})