// electron/modules/fileHandlers.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { registerFileHandlers } from './fileHandlers'
import { getIpcHandler, getRegisteredChannels } from './__test-helpers__'

describe('fileHandlers', () => {
  let fs
  let dialog
  let shell
  let childProcess
  let store

  const SOUNDS_DIR = '/fake/userData/sounds'

  beforeEach(() => {
    vi.clearAllMocks()
    fs = globalThis.__fsMock
    dialog = globalThis.__electronMock.dialog
    shell = globalThis.__electronMock.shell
    childProcess = globalThis.__childProcessMock
    store = globalThis.__storeMock

    // Par défaut : pas de fichier
    fs.existsSync.mockReturnValue(false)
    fs.promises.stat.mockResolvedValue({ size: 1024 })
    fs.statSync.mockReturnValue({ size: 1024 })

    // Dialog : cancel par défaut
    dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })
    dialog.showSaveDialog.mockResolvedValue({ canceled: true })

    registerFileHandlers(null, SOUNDS_DIR)
  })

  // ═══════════════════════════════════════════════════════════════════
  // Enregistrement
  // ═══════════════════════════════════════════════════════════════════

  describe('registerFileHandlers', () => {
    it('devrait enregistrer les handlers principaux', () => {
      const channels = getRegisteredChannels()
      expect(channels).toContain('open-file-dialog')
      expect(channels).toContain('open-image-dialog')
      expect(channels).toContain('open-directory-dialog')
      expect(channels).toContain('import-sound-file')
      expect(channels).toContain('import-image-file')
      expect(channels).toContain('delete-sound-file')
      expect(channels).toContain('file-exists')
      expect(channels).toContain('read-file')
      expect(channels).toContain('read-file-base64')
      expect(channels).toContain('write-sound-file')
      expect(channels).toContain('get-sounds-dir')
      expect(channels).toContain('export-json-file')
      expect(channels).toContain('write-dropped-file')
      expect(channels).toContain('save-file-dialog')
      expect(channels).toContain('download-sound-url')
      expect(channels).toContain('trim-sound-file')
      expect(channels).toContain('check-ytdlp')
      expect(channels).toContain('download-ytdlp')
      expect(channels).toContain('youtube-info')
      expect(channels).toContain('youtube-download')
      expect(channels).toContain('export-config')
      expect(channels).toContain('export-full')
      expect(channels).toContain('export-sounds-only')
      expect(channels).toContain('import-backup')
      expect(channels).toContain('export-profile')
      expect(channels).toContain('import-profile')
      expect(channels).toContain('spotify-track-info')
      expect(channels).toContain('soundcloud-track-info')
      expect(channels).toContain('download-platform-track')
      expect(channels).toContain('convert-audio')
      expect(channels).toContain('export-audio-file')
      expect(channels).toContain('install-virtual-driver')
      expect(channels).toContain('uninstall-virtual-driver')
      expect(channels).toContain('get-virtual-driver-status')
      expect(channels).toContain('download-thumbnail')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Dialogs
  // ═══════════════════════════════════════════════════════════════════

  describe('open-file-dialog', () => {
    it('devrait retourner [] si annulé', async () => {
      const handler = getIpcHandler('open-file-dialog')
      expect(await handler()).toEqual([])
    })

    it('devrait retourner filePaths si OK', async () => {
      dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/a.mp3', '/b.mp3'],
      })
      const handler = getIpcHandler('open-file-dialog')
      expect(await handler()).toEqual(['/a.mp3', '/b.mp3'])
    })

    it('devrait filtrer les extensions audio', async () => {
      const handler = getIpcHandler('open-file-dialog')
      await handler()
      const opts = dialog.showOpenDialog.mock.calls[0][1]
      expect(opts.filters[0].extensions).toContain('mp3')
      expect(opts.filters[0].extensions).toContain('wav')
      expect(opts.properties).toContain('openFile')
      expect(opts.properties).toContain('multiSelections')
    })
  })

  describe('open-image-dialog', () => {
    it('devrait retourner null si annulé', async () => {
      const handler = getIpcHandler('open-image-dialog')
      expect(await handler()).toBeNull()
    })

    it('devrait retourner le premier filePath si OK', async () => {
      dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/cover.png'],
      })
      const handler = getIpcHandler('open-image-dialog')
      expect(await handler()).toBe('/cover.png')
    })
  })

  describe('open-directory-dialog', () => {
    it('devrait retourner le résultat brut de showOpenDialog', async () => {
      const result = { canceled: false, filePaths: ['/dir'] }
      dialog.showOpenDialog.mockResolvedValue(result)
      const handler = getIpcHandler('open-directory-dialog')
      expect(await handler()).toEqual(result)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Import sound/image
  // ═══════════════════════════════════════════════════════════════════

  describe('import-sound-file', () => {
    it('devrait copier le fichier et retourner son chemin', async () => {
      fs.existsSync.mockReturnValue(false)
      const handler = getIpcHandler('import-sound-file')
      const result = await handler({}, '/src/test.mp3')

      expect(result.success).toBe(true)
      expect(result.path).toContain('test.mp3')
      expect(result.name).toBe('test')
      expect(fs.copyFileSync).toHaveBeenCalled()
    })

    it('devrait préfixer un timestamp en cas de collision', async () => {
      fs.existsSync.mockReturnValue(true)
      const handler = getIpcHandler('import-sound-file')
      const result = await handler({}, '/src/test.mp3')

      expect(result.success).toBe(true)
      expect(result.path).toMatch(/\d+_test\.mp3/)
    })

    it('devrait gérer une erreur de copie', async () => {
      fs.copyFileSync.mockImplementation(() => { throw new Error('access denied') })
      const handler = getIpcHandler('import-sound-file')
      const result = await handler({}, '/src/test.mp3')
      expect(result.success).toBe(false)
      expect(result.error).toBe('access denied')
    })
  })

  describe('import-image-file', () => {
    it('devrait créer le dossier images et copier', async () => {
      fs.existsSync.mockReturnValue(false)
      const handler = getIpcHandler('import-image-file')
      const result = await handler({}, '/src/cover.png')

      expect(result.success).toBe(true)
      expect(fs.mkdirSync).toHaveBeenCalled()
      expect(fs.copyFileSync).toHaveBeenCalled()
    })

    it('ne devrait PAS recréer le dossier s\'il existe', async () => {
      fs.existsSync.mockReturnValue(true)
      const handler = getIpcHandler('import-image-file')
      await handler({}, '/src/cover.png')
      expect(fs.mkdirSync).not.toHaveBeenCalled()
    })
  })

  describe('delete-sound-file', () => {
    it('devrait supprimer le fichier s\'il existe', async () => {
      fs.existsSync.mockReturnValue(true)
      const handler = getIpcHandler('delete-sound-file')
      const result = await handler({}, '/fake/test.mp3')

      expect(result.success).toBe(true)
      expect(fs.unlinkSync).toHaveBeenCalledWith('/fake/test.mp3')
    })

    it('ne devrait PAS appeler unlink si absent', async () => {
      fs.existsSync.mockReturnValue(false)
      const handler = getIpcHandler('delete-sound-file')
      await handler({}, '/fake/missing.mp3')
      expect(fs.unlinkSync).not.toHaveBeenCalled()
    })

    it('devrait gérer une erreur', async () => {
      fs.existsSync.mockReturnValue(true)
      fs.unlinkSync.mockImplementation(() => { throw new Error('locked') })
      const handler = getIpcHandler('delete-sound-file')
      const result = await handler({}, '/fake/locked.mp3')
      expect(result.success).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // file-exists / read-file / read-file-base64
  // ═══════════════════════════════════════════════════════════════════

  describe('file-exists', () => {
    it('devrait retourner true', () => {
      fs.existsSync.mockReturnValue(true)
      expect(getIpcHandler('file-exists')({}, '/path')).toBe(true)
    })

    it('devrait retourner false', () => {
      fs.existsSync.mockReturnValue(false)
      expect(getIpcHandler('file-exists')({}, '/path')).toBe(false)
    })

    it('devrait retourner false sur erreur', () => {
      fs.existsSync.mockImplementation(() => { throw new Error('boom') })
      expect(getIpcHandler('file-exists')({}, '/path')).toBe(false)
    })
  })

  describe('read-file', () => {
    it('devrait retourner les données en buffer', async () => {
      const buffer = Buffer.from('hello')
      fs.readFileSync.mockReturnValue(buffer)
      const handler = getIpcHandler('read-file')
      const result = await handler({}, '/fake/file.mp3')
      expect(result.success).toBe(true)
      expect(result.data).toBe(buffer.buffer)
    })

    it('devrait gérer une erreur', async () => {
      fs.readFileSync.mockImplementation(() => { throw new Error('ENOENT') })
      const handler = getIpcHandler('read-file')
      const result = await handler({}, '/fake/missing')
      expect(result.success).toBe(false)
    })
  })

  describe('read-file-base64', () => {
    it('devrait retourner la string base64', async () => {
      fs.readFileSync.mockReturnValue(Buffer.from('hello'))
      const handler = getIpcHandler('read-file-base64')
      const result = await handler({}, '/fake/file.txt')
      expect(result.success).toBe(true)
      expect(result.base64).toBe('aGVsbG8=')
    })

    it('devrait gérer une erreur', async () => {
      fs.readFileSync.mockImplementation(() => { throw new Error('ENOENT') })
      const handler = getIpcHandler('read-file-base64')
      const result = await handler({}, '/fake/missing')
      expect(result.success).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // write-sound-file / get-sounds-dir
  // ═══════════════════════════════════════════════════════════════════

  describe('write-sound-file', () => {
    it('devrait écrire le fichier avec un Uint8Array', async () => {
      const handler = getIpcHandler('write-sound-file')
      const data = [1, 2, 3]
      const result = await handler({}, '/fake/out.mp3', data)
      expect(result.success).toBe(true)
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('devrait gérer une erreur', async () => {
      fs.writeFileSync.mockImplementation(() => { throw new Error('full') })
      const handler = getIpcHandler('write-sound-file')
      const result = await handler({}, '/fake/out.mp3', [])
      expect(result.success).toBe(false)
    })
  })

  describe('get-sounds-dir', () => {
    it('devrait retourner le dossier fourni', () => {
      expect(getIpcHandler('get-sounds-dir')()).toBe(SOUNDS_DIR)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // export-json-file
  // ═══════════════════════════════════════════════════════════════════

  describe('export-json-file', () => {
    it('devrait annuler proprement', async () => {
      const handler = getIpcHandler('export-json-file')
      const result = await handler({}, '{}', 'test.json', 'Test')
      expect(result).toEqual({ success: false, canceled: true })
    })

    it('devrait écrire le JSON', async () => {
      dialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: '/fake/export.json',
      })
      const handler = getIpcHandler('export-json-file')
      const result = await handler({}, '{"x":1}', 'test.json', 'Test')
      expect(result.success).toBe(true)
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/fake/export.json',
        '{"x":1}',
        'utf-8'
      )
    })

    it('devrait utiliser des valeurs par défaut', async () => {
      dialog.showSaveDialog.mockResolvedValue({ canceled: true })
      const handler = getIpcHandler('export-json-file')
      await handler({}, '{}')
      const opts = dialog.showSaveDialog.mock.calls[0][1]
      expect(opts.defaultPath).toMatch(/sounddeck-export-.*\.json/)
      expect(opts.filters[0].extensions).toEqual(['json'])
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // write-dropped-file / save-file-dialog
  // ═══════════════════════════════════════════════════════════════════

  describe('write-dropped-file', () => {
    it('devrait nettoyer le nom et écrire', async () => {
      const handler = getIpcHandler('write-dropped-file')
      const result = await handler({}, 'file<script>.mp3', new ArrayBuffer(10))
      expect(result.success).toBe(true)
      expect(result.path).not.toContain('<')
    })

    it('devrait gérer une erreur', async () => {
      fs.writeFileSync.mockImplementation(() => { throw new Error('full') })
      const handler = getIpcHandler('write-dropped-file')
      const result = await handler({}, 'test.mp3', new ArrayBuffer(10))
      expect(result.success).toBe(false)
    })
  })

  describe('save-file-dialog', () => {
    it('devrait annuler proprement', async () => {
      const handler = getIpcHandler('save-file-dialog')
      const result = await handler({}, 'out.wav', new ArrayBuffer(10))
      expect(result.success).toBe(false)
      expect(result.canceled).toBeUndefined() // source ne retourne PAS canceled
    })

    it('devrait écrire si validé', async () => {
      dialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: '/fake/save.wav',
      })
      const handler = getIpcHandler('save-file-dialog')
      const result = await handler({}, 'out.wav', new ArrayBuffer(10))
      expect(result.success).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Spotify / Soundcloud / Platform
  // ═══════════════════════════════════════════════════════════════════

  describe('spotify-track-info', () => {
    it('devrait retourner des données factices', async () => {
      const handler = getIpcHandler('spotify-track-info')
      const result = await handler({}, 'track12345678')
      expect(result.success).toBe(true)
      expect(result.data.id).toBe('track12345678')
      expect(result.data.title).toContain('Spotify')
    })
  })

  describe('soundcloud-track-info', () => {
    it('devrait extraire l\'ID depuis l\'URL', async () => {
      const handler = getIpcHandler('soundcloud-track-info')
      const result = await handler({}, 'https://soundcloud.com/artist/my-track')
      expect(result.success).toBe(true)
      expect(result.data.id).toBe('my-track')
    })

    it('devrait retourner une erreur si URL invalide', async () => {
      const handler = getIpcHandler('soundcloud-track-info')
      const result = await handler({}, 'not-a-url')
      expect(result.success).toBe(false)
      expect(result.error).toContain('invalide')
    })
  })

  describe('download-platform-track', () => {
    it('devrait retourner non implémenté', async () => {
      const handler = getIpcHandler('download-platform-track')
      const result = await handler({}, { platform: 'spotify', url: 'x' })
      expect(result.success).toBe(false)
      expect(result.error).toContain('spotify')
    })

    it('devrait gérer params undefined', async () => {
      const handler = getIpcHandler('download-platform-track')
      const result = await handler({}, undefined)
      expect(result.success).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // check-ytdlp
  // ═══════════════════════════════════════════════════════════════════

  describe('check-ytdlp', () => {
    it('devrait retourner { available: false } si rien trouvé', async () => {
      fs.existsSync.mockReturnValue(false)
      childProcess.execSync.mockImplementation(() => { throw new Error('not found') })
      const handler = getIpcHandler('check-ytdlp')
      const result = await handler()
      expect(result.available).toBe(false)
    })

    it('devrait retourner { available: true } si dans userData', async () => {
      fs.existsSync.mockImplementation((p) => p.includes('yt-dlp.exe'))
      childProcess.execFile.mockImplementation((file, args, opts, cb) => {
        process.nextTick(() => cb(null, '2024.01.01', ''))
        return { on: vi.fn(), kill: vi.fn() }
      })
      const handler = getIpcHandler('check-ytdlp')
      const result = await handler()
      expect(result.available).toBe(true)
    })

    it('devrait unlink si la version échoue', async () => {
      fs.existsSync.mockReturnValue(true)
      childProcess.execFile.mockImplementation((file, args, opts, cb) => {
        process.nextTick(() => cb(new Error('corrupted'), '', ''))
        return { on: vi.fn(), kill: vi.fn() }
      })
      const handler = getIpcHandler('check-ytdlp')
      const result = await handler()
      expect(result.available).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // get-virtual-driver-status
  // ═══════════════════════════════════════════════════════════════════

  describe('get-virtual-driver-status', () => {
    it('devrait retourner downloaded: false / extracted: false', async () => {
      fs.existsSync.mockReturnValue(false)
      const handler = getIpcHandler('get-virtual-driver-status')
      const result = await handler()
      expect(result.success).toBe(true)
      expect(result.downloaded).toBe(false)
      expect(result.extracted).toBe(false)
    })

    it('devrait retourner downloaded: true si ZIP présent', async () => {
      fs.existsSync.mockImplementation((p) => p.endsWith('.zip'))
      const handler = getIpcHandler('get-virtual-driver-status')
      const result = await handler()
      expect(result.downloaded).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // uninstall-virtual-driver
  // ═══════════════════════════════════════════════════════════════════

  describe('uninstall-virtual-driver', () => {
    it('devrait ouvrir les paramètres Windows (platform win32)', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })

      const handler = getIpcHandler('uninstall-virtual-driver')
      const result = await handler()
      expect(result.success).toBe(true)
      expect(shell.openPath).toHaveBeenCalledWith('ms-settings:appsfeatures')

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    })

    it('devrait ouvrir le site VB-Audio sur Linux', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })

      const handler = getIpcHandler('uninstall-virtual-driver')
      const result = await handler()
      expect(result.success).toBe(true)
      expect(shell.openExternal).toHaveBeenCalledWith('https://vb-audio.com/Cable/')

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // convert-audio (child_process)
  // ═══════════════════════════════════════════════════════════════════

  describe('convert-audio', () => {
    it('devrait appeler ffmpeg et retourner le résultat', async () => {
      fs.existsSync.mockReturnValue(true)
      childProcess.execFile.mockImplementation((file, args, opts, cb) => {
        process.nextTick(() => cb(null, '', ''))
        return { on: vi.fn(), kill: vi.fn() }
      })

      const handler = getIpcHandler('convert-audio')
      const result = await handler({}, '/in.mp3', '/out.ogg', 'mp3', 192)
      expect(result.success).toBe(true)
      expect(childProcess.execFile).toHaveBeenCalled()
    })

    it('devrait gérer une erreur ffmpeg', async () => {
      fs.existsSync.mockReturnValue(true)
      childProcess.execFile.mockImplementation((file, args, opts, cb) => {
        process.nextTick(() => cb(new Error('codec error'), '', ''))
        return { on: vi.fn(), kill: vi.fn() }
      })

      const handler = getIpcHandler('convert-audio')
      const result = await handler({}, '/in.mp3', '/out.ogg', 'mp3')
      expect(result.success).toBe(false)
    })

    it('devrait retourner une erreur si fichier de sortie absent', async () => {
      fs.existsSync.mockReturnValue(false)
      childProcess.execFile.mockImplementation((file, args, opts, cb) => {
        process.nextTick(() => cb(null, '', ''))
        return { on: vi.fn(), kill: vi.fn() }
      })

      const handler = getIpcHandler('convert-audio')
      const result = await handler({}, '/in.mp3', '/out.ogg', 'mp3')
      expect(result.success).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // export-config
  // ═══════════════════════════════════════════════════════════════════

  describe('export-config', () => {
    it('devrait annuler proprement', async () => {
      const handler = getIpcHandler('export-config')
      const result = await handler()
      expect(result).toEqual({ success: false, canceled: true })
    })

    it('devrait écrire le JSON avec les données du store', async () => {
      dialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: '/fake/config.json',
      })
      store._data.set('profiles', [{ id: 'p1' }])
      store._data.set('sounds', [{ id: 's1' }])

      const handler = getIpcHandler('export-config')
      const result = await handler()
      expect(result.success).toBe(true)

      const [, content] = fs.writeFileSync.mock.calls[0]
      const data = JSON.parse(content)
      expect(data.profiles).toEqual([{ id: 'p1' }])
      expect(data.sounds).toEqual([{ id: 's1' }])
      expect(data.version).toBe('1.0')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // import-backup (JSON uniquement, ZIP = unzipper mocké)
  // ═══════════════════════════════════════════════════════════════════

  describe('import-backup', () => {
    it('devrait annuler proprement', async () => {
      const handler = getIpcHandler('import-backup')
      const result = await handler()
      expect(result).toEqual({ success: false, canceled: true })
    })

    it('devrait importer un JSON valide', async () => {
      dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/fake/backup.json'],
      })
      fs.readFileSync.mockReturnValue(JSON.stringify({
        profiles: [{ id: 'p1' }],
        sounds: [{ id: 's1' }],
        theme: 'light',
      }))

      const handler = getIpcHandler('import-backup')
      const result = await handler()
      expect(result.success).toBe(true)
      expect(result.type).toBe('json')
      expect(store._data.get('profiles')).toEqual([{ id: 'p1' }])
      expect(store._data.get('theme')).toBe('light')
    })

    it('devrait retourner une erreur pour format non supporté', async () => {
      dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/fake/backup.txt'],
      })
      const handler = getIpcHandler('import-backup')
      const result = await handler()
      expect(result.success).toBe(false)
      expect(result.error).toContain('non supporté')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // import-profile
  // ═══════════════════════════════════════════════════════════════════

  describe('import-profile', () => {
    it('devrait annuler proprement', async () => {
      const handler = getIpcHandler('import-profile')
      const result = await handler()
      expect(result).toEqual({ success: false, canceled: true })
    })

    it('devrait importer un profil', async () => {
      dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/fake/profile.json'],
      })
      fs.readFileSync.mockReturnValue(JSON.stringify({
        profile: { id: 'p1', name: 'New' },
        sounds: [{ id: 's1' }, { id: 's2' }],
      }))

      const handler = getIpcHandler('import-profile')
      const result = await handler()
      expect(result.success).toBe(true)
      expect(result.profileName).toBe('New')
      expect(result.soundCount).toBe(2)
    })

    it('devrait ignorer les profils déjà existants', async () => {
      dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/fake/profile.json'],
      })
      fs.readFileSync.mockReturnValue(JSON.stringify({
        profile: { id: 'existing', name: 'X' },
        sounds: [],
      }))
      store._data.set('profiles', [{ id: 'existing' }])

      const handler = getIpcHandler('import-profile')
      const result = await handler()
      expect(result.success).toBe(true)
      expect(store._data.get('profiles')).toHaveLength(1)
    })

    it('devrait rejeter un format invalide', async () => {
      dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/fake/profile.json'],
      })
      fs.readFileSync.mockReturnValue(JSON.stringify({ foo: 'bar' }))

      const handler = getIpcHandler('import-profile')
      const result = await handler()
      expect(result.success).toBe(false)
      expect(result.error).toContain('invalide')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // export-profile
  // ═══════════════════════════════════════════════════════════════════

  describe('export-profile', () => {
    it('devrait retourner une erreur si profil introuvable', async () => {
      store._data.set('profiles', [])
      const handler = getIpcHandler('export-profile')
      const result = await handler({}, 'unknown')
      expect(result.success).toBe(false)
      expect(result.error).toContain('non trouvé')
    })

    it('devrait annuler proprement', async () => {
      store._data.set('profiles', [{ id: 'p1', name: 'Test' }])
      store._data.set('sounds', [])
      const handler = getIpcHandler('export-profile')
      const result = await handler({}, 'p1')
      expect(result).toEqual({ success: false, canceled: true })
    })

    it('devrait exporter le profil + ses sons', async () => {
      store._data.set('profiles', [{ id: 'p1', name: 'Test' }])
      store._data.set('sounds', [
        { id: 's1', profiles: ['p1'] },
        { id: 's2', profiles: ['other'] },
      ])
      dialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: '/fake/profile.json',
      })
      fs.statSync.mockReturnValue({ size: 2048 })

      const handler = getIpcHandler('export-profile')
      const result = await handler({}, 'p1')

      expect(result.success).toBe(true)
      expect(result.soundCount).toBe(1)

      const [, content] = fs.writeFileSync.mock.calls[0]
      const data = JSON.parse(content)
      expect(data.profile.id).toBe('p1')
      expect(data.sounds).toHaveLength(1)
      expect(data.sounds[0].id).toBe('s1')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // trim-sound-file (ffmpeg)
  // ═══════════════════════════════════════════════════════════════════

  describe('trim-sound-file', () => {
    it('devrait retourner une erreur si fichier source absent', async () => {
      fs.existsSync.mockReturnValue(false)
      const handler = getIpcHandler('trim-sound-file')
      const result = await handler({}, '/missing.mp3', 0, 5)
      expect(result.success).toBe(false)
      expect(result.error).toContain('non trouvé')
    })

    it('devrait rejeter une durée invalide', async () => {
      fs.existsSync.mockReturnValue(true)
      const handler = getIpcHandler('trim-sound-file')
      const result = await handler({}, '/fake/a.mp3', 5, 5)
      expect(result.success).toBe(false)
      expect(result.error).toContain('invalide')
    })

    it('devrait utiliser ffmpeg et retourner le nouveau chemin', async () => {
      fs.existsSync.mockReturnValue(true)
      fs.statSync.mockReturnValue({ size: 2048 })
      childProcess.execFile.mockImplementation((file, args, opts, cb) => {
        process.nextTick(() => cb(null, '', ''))
        return { on: vi.fn(), kill: vi.fn() }
      })

      const handler = getIpcHandler('trim-sound-file')
      const result = await handler({}, '/fake/a.mp3', 0, 10)

      expect(result.success).toBe(true)
      expect(result.path).toMatch(/_trimmed_/)
    })

    it('devrait copier le fichier si ffmpeg indisponible', async () => {
      // Force "pas de ffmpeg" : existsSync false pour tout sauf la source
      fs.existsSync.mockImplementation((p) => p === '/fake/a.mp3')
      childProcess.execSync.mockImplementation(() => { throw new Error('not found') })

      const handler = getIpcHandler('trim-sound-file')
      const result = await handler({}, '/fake/a.mp3', 0, 10)

      expect(result.success).toBe(true)
      expect(result.warning).toContain('ffmpeg non disponible')
      expect(fs.copyFileSync).toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // export-audio-file
  // ═══════════════════════════════════════════════════════════════════

  describe('export-audio-file', () => {
    it('devrait annuler proprement', async () => {
      const handler = getIpcHandler('export-audio-file')
      const result = await handler({}, { data: [], fileName: 'out.wav' })
      expect(result.success).toBe(false)
      expect(result.canceled).toBe(true)
    })

    it('devrait écrire le fichier', async () => {
      dialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: '/fake/out.wav',
      })
      const handler = getIpcHandler('export-audio-file')
      const result = await handler({}, { data: [1, 2, 3], fileName: 'out.wav' })
      expect(result.success).toBe(true)
      expect(fs.writeFileSync).toHaveBeenCalled()
    })
  })
})