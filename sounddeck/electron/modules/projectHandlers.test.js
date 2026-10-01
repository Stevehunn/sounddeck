// electron/modules/projectHandlers.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ⚠️ fs et crypto sont mockés GLOBALEMENT dans setup-electron.js
// via Module._load. On récupère les instances partagées.

import { registerProjectHandlers } from './projectHandlers'
import { getIpcHandler, getRegisteredChannels } from './__test-helpers__'

let fs

function createMockStore(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    get: vi.fn((key, defaultValue) => {
      if (!data.has(key)) return defaultValue
      return data.get(key)
    }),
    set: vi.fn((key, value) => {
      data.set(key, value)
    }),
    delete: vi.fn((key) => {
      data.delete(key)
    }),
    has: vi.fn((key) => data.has(key)),
    _data: data,
  }
}

describe('projectHandlers', () => {
  let store

  const createProject = (o = {}) => ({
    id: 'p1',
    name: 'Test Project',
    tracks: [],
    markers: [],
    loops: { clips: {}, tracks: {}, timeline: {} },
    createdAt: 1000,
    updatedAt: 1000,
    ...o,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    fs = globalThis.__fsMock
    globalThis.__resetCryptoCounter()
    store = createMockStore({ editorProjects: {}, recentEditorProjects: [] })
    registerProjectHandlers(store)
  })

  // ═══════════════════════════════════════════════════════════════════
  // save-editor-project
  // ═══════════════════════════════════════════════════════════════════

  describe('save-editor-project', () => {
    it('devrait retourner une erreur si project invalide', async () => {
      const handler = getIpcHandler('save-editor-project')
      const result = await handler({}, null)
      expect(result.success).toBe(false)
      expect(result.error).toContain('invalides')
    })

    it("devrait retourner une erreur si pas d'id", async () => {
      const handler = getIpcHandler('save-editor-project')
      const result = await handler({}, { name: 'Test' })
      expect(result.success).toBe(false)
    })

    it('devrait sauvegarder le projet', async () => {
      const handler = getIpcHandler('save-editor-project')
      const project = createProject()
      const result = await handler({}, project)

      expect(result.success).toBe(true)
      expect(result.project.id).toBe('p1')
      expect(result.project.updatedAt).toBeGreaterThan(1000)
    })

    it('devrait mettre à jour currentEditorProjectId', async () => {
      const handler = getIpcHandler('save-editor-project')
      await handler({}, createProject())
      expect(store.set).toHaveBeenCalledWith('currentEditorProjectId', 'p1')
    })

    it('devrait ajouter à la liste des récents en tête', async () => {
      const handler = getIpcHandler('save-editor-project')
      store._data.set('recentEditorProjects', ['old'])
      await handler({}, createProject())

      const recent = store._data.get('recentEditorProjects')
      expect(recent[0]).toBe('p1')
      expect(recent).toContain('old')
    })

    it('devrait dédupliquer dans les récents', async () => {
      const handler = getIpcHandler('save-editor-project')
      store._data.set('recentEditorProjects', ['p1', 'p2'])
      await handler({}, createProject())

      const recent = store._data.get('recentEditorProjects')
      expect(recent.filter((id) => id === 'p1')).toHaveLength(1)
    })

    it('devrait limiter les récents à 20', async () => {
      const handler = getIpcHandler('save-editor-project')
      const oldRecent = Array.from({ length: 30 }, (_, i) => `p-${i}`)
      store._data.set('recentEditorProjects', oldRecent)
      await handler({}, createProject())

      const recent = store._data.get('recentEditorProjects')
      expect(recent.length).toBeLessThanOrEqual(20)
    })

    it('devrait gérer une exception', async () => {
      store.set.mockImplementation(() => {
        throw new Error('boom')
      })
      const handler = getIpcHandler('save-editor-project')
      const result = await handler({}, createProject())
      expect(result.success).toBe(false)
      expect(result.error).toBe('boom')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // load-editor-project
  // ═══════════════════════════════════════════════════════════════════

  describe('load-editor-project', () => {
    it('devrait retourner le projet existant', async () => {
      const project = createProject()
      store._data.set('editorProjects', { p1: project })

      const handler = getIpcHandler('load-editor-project')
      const result = await handler({}, 'p1')

      expect(result.success).toBe(true)
      expect(result.project).toEqual(project)
    })

    it('devrait retourner une erreur si projet inexistant', async () => {
      const handler = getIpcHandler('load-editor-project')
      const result = await handler({}, 'unknown')

      expect(result.success).toBe(false)
      expect(result.error).toContain('non trouvé')
    })

    it('devrait mettre à jour les récents', async () => {
      store._data.set('editorProjects', { p1: createProject() })

      const handler = getIpcHandler('load-editor-project')
      await handler({}, 'p1')

      expect(store.set).toHaveBeenCalledWith('currentEditorProjectId', 'p1')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // get-all-editor-projects
  // ═══════════════════════════════════════════════════════════════════

  describe('get-all-editor-projects', () => {
    it('devrait retourner un tableau vide si aucun projet', async () => {
      const handler = getIpcHandler('get-all-editor-projects')
      const result = await handler()
      expect(result).toEqual([])
    })

    it('devrait trier par updatedAt décroissant', async () => {
      store._data.set('editorProjects', {
        p1: createProject({ id: 'p1', updatedAt: 1000 }),
        p2: createProject({ id: 'p2', updatedAt: 3000 }),
        p3: createProject({ id: 'p3', updatedAt: 2000 }),
      })

      const handler = getIpcHandler('get-all-editor-projects')
      const result = await handler()

      expect(result.map((p) => p.id)).toEqual(['p2', 'p3', 'p1'])
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // get-recent-editor-projects
  // ═══════════════════════════════════════════════════════════════════

  describe('get-recent-editor-projects', () => {
    it('devrait retourner les projets récents triés', async () => {
      store._data.set('editorProjects', {
        p1: createProject({ id: 'p1' }),
        p2: createProject({ id: 'p2' }),
      })
      store._data.set('recentEditorProjects', ['p2', 'p1'])

      const handler = getIpcHandler('get-recent-editor-projects')
      const result = await handler()

      expect(result.map((p) => p.id)).toEqual(['p2', 'p1'])
    })

    it("devrait ignorer les ids qui n'existent plus", async () => {
      store._data.set('editorProjects', { p1: createProject({ id: 'p1' }) })
      store._data.set('recentEditorProjects', ['p1', 'ghost'])

      const handler = getIpcHandler('get-recent-editor-projects')
      const result = await handler()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p1')
    })

    it('devrait limiter à 10 items', async () => {
      const projects = {}
      const recentIds = []
      for (let i = 0; i < 20; i++) {
        projects[`p-${i}`] = createProject({ id: `p-${i}` })
        recentIds.push(`p-${i}`)
      }
      store._data.set('editorProjects', projects)
      store._data.set('recentEditorProjects', recentIds)

      const handler = getIpcHandler('get-recent-editor-projects')
      const result = await handler()

      expect(result.length).toBeLessThanOrEqual(10)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // delete-editor-project
  // ═══════════════════════════════════════════════════════════════════

  describe('delete-editor-project', () => {
    it('devrait supprimer le projet', async () => {
      store._data.set('editorProjects', { p1: createProject() })

      const handler = getIpcHandler('delete-editor-project')
      const result = await handler({}, 'p1')

      expect(result.success).toBe(true)
      expect(store._data.get('editorProjects').p1).toBeUndefined()
    })

    it('devrait retourner une erreur si projet absent', async () => {
      const handler = getIpcHandler('delete-editor-project')
      const result = await handler({}, 'unknown')
      expect(result.success).toBe(false)
    })

    it('devrait nettoyer les récents', async () => {
      store._data.set('editorProjects', { p1: createProject() })
      store._data.set('recentEditorProjects', ['p1', 'p2'])

      const handler = getIpcHandler('delete-editor-project')
      await handler({}, 'p1')

      const recent = store._data.get('recentEditorProjects')
      expect(recent).not.toContain('p1')
    })

    it("devrait supprimer currentEditorProjectId si c'est le même", async () => {
      store._data.set('editorProjects', { p1: createProject() })
      store._data.set('currentEditorProjectId', 'p1')

      const handler = getIpcHandler('delete-editor-project')
      await handler({}, 'p1')

      expect(store.delete).toHaveBeenCalledWith('currentEditorProjectId')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // export-editor-project
  // ═══════════════════════════════════════════════════════════════════

  describe('export-editor-project', () => {
    it('devrait écrire le fichier JSON', async () => {
      fs.existsSync.mockReturnValue(true)
      const handler = getIpcHandler('export-editor-project')
      const project = createProject()

      const result = await handler(
        {},
        { project, filePath: '/fake/export.json' }
      )

      expect(result.success).toBe(true)
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('devrait créer le dossier si absent', async () => {
      fs.existsSync.mockReturnValue(false)
      const handler = getIpcHandler('export-editor-project')
      await handler(
        {},
        { project: createProject(), filePath: '/fake/dir/export.json' }
      )
      expect(fs.mkdirSync).toHaveBeenCalled()
    })

    it('devrait retourner une erreur si pas de project', async () => {
      const handler = getIpcHandler('export-editor-project')
      const result = await handler(
        {},
        { project: null, filePath: '/fake/x.json' }
      )
      expect(result.success).toBe(false)
    })

    it('devrait inclure les métadonnées (version, type, exportedAt)', async () => {
      fs.existsSync.mockReturnValue(true)
      const handler = getIpcHandler('export-editor-project')
      await handler(
        {},
        { project: createProject(), filePath: '/fake/export.json' }
      )

      const written = fs.writeFileSync.mock.calls[0][1]
      const parsed = JSON.parse(written)
      expect(parsed.version).toBe('1.0.0')
      expect(parsed.type).toBe('sounddeck-project')
      expect(parsed.exportedAt).toBeDefined()
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // import-editor-project
  // ═══════════════════════════════════════════════════════════════════

  describe('import-editor-project', () => {
    it('devrait importer un projet valide', async () => {
      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue(
        JSON.stringify({
          version: '1.0.0',
          type: 'sounddeck-project',
          project: createProject(),
        })
      )

      const handler = getIpcHandler('import-editor-project')
      const result = await handler({}, '/fake/project.json')

      expect(result.success).toBe(true)
      expect(result.project).toBeDefined()
    })

    it("devrait régénérer l'id du projet importé", async () => {
      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'sounddeck-project',
          project: createProject({ id: 'original-id' }),
        })
      )

      const handler = getIpcHandler('import-editor-project')
      const result = await handler({}, '/fake/project.json')

      expect(result.project.id).not.toBe('original-id')
      expect(result.project.id).toMatch(/^uuid-/)
    })

    it('devrait retourner une erreur si type invalide', async () => {
      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue(JSON.stringify({ type: 'wrong-type' }))

      const handler = getIpcHandler('import-editor-project')
      const result = await handler({}, '/fake/project.json')

      expect(result.success).toBe(false)
      expect(result.error).toContain('invalide')
    })

    it('devrait retourner une erreur si fichier absent', async () => {
      fs.existsSync.mockReturnValue(false)
      const handler = getIpcHandler('import-editor-project')
      const result = await handler({}, '/fake/missing.json')
      expect(result.success).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // rename-editor-project
  // ═══════════════════════════════════════════════════════════════════

  describe('rename-editor-project', () => {
    it('devrait renommer le projet', async () => {
      store._data.set('editorProjects', { p1: createProject() })

      const handler = getIpcHandler('rename-editor-project')
      const result = await handler(
        {},
        { projectId: 'p1', newName: 'Nouveau nom' }
      )

      expect(result.success).toBe(true)
      expect(result.project.name).toBe('Nouveau nom')
    })

    it('devrait trimmer le nom', async () => {
      store._data.set('editorProjects', { p1: createProject() })

      const handler = getIpcHandler('rename-editor-project')
      const result = await handler(
        {},
        { projectId: 'p1', newName: '  Trimmed  ' }
      )

      expect(result.project.name).toBe('Trimmed')
    })

    it('devrait refuser un nom vide', async () => {
      const handler = getIpcHandler('rename-editor-project')
      const result = await handler({}, { projectId: 'p1', newName: '' })
      expect(result.success).toBe(false)
    })

    it('devrait refuser un nom whitespace', async () => {
      const handler = getIpcHandler('rename-editor-project')
      const result = await handler({}, { projectId: 'p1', newName: '   ' })
      expect(result.success).toBe(false)
    })

    it('devrait retourner une erreur si projet absent', async () => {
      const handler = getIpcHandler('rename-editor-project')
      const result = await handler({}, { projectId: 'unknown', newName: 'X' })
      expect(result.success).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // duplicate-editor-project
  // ═══════════════════════════════════════════════════════════════════

  describe('duplicate-editor-project', () => {
    it('devrait dupliquer un projet avec un nouvel ID', async () => {
      const original = createProject({ id: 'original' })
      store._data.set('editorProjects', { original })

      const handler = getIpcHandler('duplicate-editor-project')
      const result = await handler({}, 'original')

      expect(result.success).toBe(true)
      expect(result.project.id).not.toBe('original')
    })

    it('devrait ajouter " (copie)" au nom', async () => {
      const original = createProject({ id: 'original', name: 'Mon Projet' })
      store._data.set('editorProjects', { original })

      const handler = getIpcHandler('duplicate-editor-project')
      const result = await handler({}, 'original')

      expect(result.project.name).toBe('Mon Projet (copie)')
    })

    it('devrait régénérer les IDs des tracks et clips', async () => {
      const original = createProject({
        id: 'original',
        tracks: [
          {
            id: 'track-1',
            clips: [
              { id: 'clip-1', effects: [{ id: 'e1', type: 'volume' }] },
            ],
          },
        ],
      })
      store._data.set('editorProjects', { original })

      const handler = getIpcHandler('duplicate-editor-project')
      const result = await handler({}, 'original')

      expect(result.project.tracks[0].id).not.toBe('track-1')
      expect(result.project.tracks[0].clips[0].id).not.toBe('clip-1')
      expect(result.project.tracks[0].clips[0].effects[0].id).not.toBe('e1')
    })

    it('devrait retourner une erreur si projet absent', async () => {
      const handler = getIpcHandler('duplicate-editor-project')
      const result = await handler({}, 'unknown')
      expect(result.success).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // registerProjectHandlers
  // ═══════════════════════════════════════════════════════════════════

  describe('registerProjectHandlers', () => {
    it('devrait enregistrer tous les handlers', () => {
      const channels = getRegisteredChannels()
      expect(channels).toContain('save-editor-project')
      expect(channels).toContain('load-editor-project')
      expect(channels).toContain('get-all-editor-projects')
      expect(channels).toContain('get-recent-editor-projects')
      expect(channels).toContain('delete-editor-project')
      expect(channels).toContain('export-editor-project')
      expect(channels).toContain('import-editor-project')
      expect(channels).toContain('rename-editor-project')
      expect(channels).toContain('duplicate-editor-project')
    })
  })
})