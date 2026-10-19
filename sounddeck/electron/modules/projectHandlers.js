// electron/modules/projectHandlers.js
const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { randomUUID } = require('crypto')

/**
 * régénère TOUS les IDs (project, tracks, clips, effets, markers)
 * + remap loopState.tracks/clips pour préserver les boucles.
 * Évite les collisions d'ID quand on duplique/importe un projet.
 * @param project
 */
function regenerateProjectIds(project) {
  const trackIdMap = new Map()
  const clipIdMap = new Map()

  const newTracks = (project.tracks || []).map((track) => {
    const newTrackId = randomUUID()
    trackIdMap.set(track.id, newTrackId)

    return {
      ...track,
      id: newTrackId,
      clips: (track.clips || []).map((clip) => {
        const newClipId = randomUUID()
        clipIdMap.set(clip.id, newClipId)
        return {
          ...clip,
          id: newClipId,
          effects: (clip.effects || []).map((eff) => ({
            ...eff,
            id: randomUUID(),
          })),
        }
      }),
    }
  })

  const newMarkers = (project.markers || []).map((m) => ({
    ...m,
    id: randomUUID(),
  }))

  // Remap loopState
  const oldLoops = project.loops || { clips: {}, tracks: {}, timeline: {} }
  const newLoops = {
    clips: {},
    tracks: {},
    timeline: oldLoops.timeline ? { ...oldLoops.timeline } : {},
  }
  for (const [oldClipId, loopData] of Object.entries(oldLoops.clips || {})) {
    const newClipId = clipIdMap.get(oldClipId)
    if (newClipId) newLoops.clips[newClipId] = { ...loopData }
  }
  for (const [oldTrackId, loopData] of Object.entries(oldLoops.tracks || {})) {
    const newTrackId = trackIdMap.get(oldTrackId)
    if (newTrackId) newLoops.tracks[newTrackId] = { ...loopData }
  }

  return {
    ...project,
    id: randomUUID(),
    tracks: newTracks,
    markers: newMarkers,
    loops: newLoops,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/**
 *
 * @param store
 */
function registerProjectHandlers(store) {
  console.log('🔧 [projectHandlers] Enregistrement des handlers...')

  // ─── SAUVEGARDER UN PROJET ────────────────────────────────────────────
  ipcMain.handle('save-editor-project', async (event, projectData) => {
    try {
      if (!projectData || !projectData.id) {
        return { success: false, error: 'Données de projet invalides' }
      }

      const updatedProject = { ...projectData, updatedAt: Date.now() }

      const projects = store.get('editorProjects', {})
      projects[projectData.id] = updatedProject
      store.set('editorProjects', projects)
      store.set('currentEditorProjectId', projectData.id)

      const recent = store.get('recentEditorProjects', [])
      const filtered = recent.filter((id) => id !== projectData.id)
      filtered.unshift(projectData.id)
      store.set('recentEditorProjects', filtered.slice(0, 20))

      return { success: true, project: updatedProject }
    } catch (e) {
      console.error('❌ Erreur sauvegarde projet:', e)
      return { success: false, error: e.message }
    }
  })

  // ─── CHARGER UN PROJET ────────────────────────────────────────────────
  ipcMain.handle('load-editor-project', async (event, projectId) => {
    try {
      const projects = store.get('editorProjects', {})
      const project = projects[projectId]

      if (!project) {
        return { success: false, error: 'Projet non trouvé' }
      }

      const recent = store.get('recentEditorProjects', [])
      const filtered = recent.filter((id) => id !== projectId)
      filtered.unshift(projectId)
      store.set('recentEditorProjects', filtered.slice(0, 20))
      store.set('currentEditorProjectId', projectId)

      return { success: true, project }
    } catch (e) {
      console.error('❌ Erreur chargement projet:', e)
      return { success: false, error: e.message }
    }
  })

  // ─── OBTENIR TOUS LES PROJETS ─────────────────────────────────────────
  ipcMain.handle('get-all-editor-projects', async () => {
    try {
      const projects = store.get('editorProjects', {})
      return Object.values(projects).sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
      )
    } catch (e) {
      console.error('❌ Erreur récupération projets:', e)
      return []
    }
  })

  // ─── OBTENIR LES PROJETS RÉCENTS ──────────────────────────────────────
  ipcMain.handle('get-recent-editor-projects', async () => {
    try {
      const recentIds = store.get('recentEditorProjects', [])
      const projects = store.get('editorProjects', {})
      return recentIds
        .map((id) => projects[id])
        .filter(Boolean)
        .slice(0, 10)
    } catch (e) {
      console.error('❌ Erreur récupération projets récents:', e)
      return []
    }
  })

  // ─── SUPPRIMER UN PROJET ──────────────────────────────────────────────
  ipcMain.handle('delete-editor-project', async (event, projectId) => {
    try {
      const projects = store.get('editorProjects', {})

      if (!projects[projectId]) {
        return { success: false, error: 'Projet non trouvé' }
      }

      delete projects[projectId]
      store.set('editorProjects', projects)

      const recent = store.get('recentEditorProjects', [])
      store.set('recentEditorProjects', recent.filter((id) => id !== projectId))

      if (store.get('currentEditorProjectId') === projectId) {
        store.delete('currentEditorProjectId')
      }

      return { success: true }
    } catch (e) {
      console.error('❌ Erreur suppression projet:', e)
      return { success: false, error: e.message }
    }
  })

  // ─── EXPORTER UN PROJET ───────────────────────────────────────────────
  ipcMain.handle('export-editor-project', async (event, { project, filePath }) => {
    try {
      if (!project) {
        return { success: false, error: 'Aucun projet à exporter' }
      }

      const exportData = {
        version: '1.0.0',
        type: 'sounddeck-project',
        exportedAt: Date.now(),
        project: { ...project, exportedAt: Date.now() },
      }

      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8')
      return { success: true, path: filePath }
    } catch (e) {
      console.error('❌ Erreur export projet:', e)
      return { success: false, error: e.message }
    }
  })

  // ─── IMPORTER UN PROJET ───────────────────────────────────────────────
  ipcMain.handle('import-editor-project', async (event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Fichier non trouvé' }
      }

      const content = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)

      if (data.type !== 'sounddeck-project') {
        return { success: false, error: 'Format de projet invalide' }
      }

      if (!data.project || !data.project.id) {
        return { success: false, error: 'Données de projet invalides' }
      }

      // régénère tous les IDs pour éviter les collisions
      const importedProject = {
        ...regenerateProjectIds(data.project),
        importedAt: Date.now(),
      }

      const projects = store.get('editorProjects', {})
      projects[importedProject.id] = importedProject
      store.set('editorProjects', projects)

      const recent = store.get('recentEditorProjects', [])
      recent.unshift(importedProject.id)
      store.set('recentEditorProjects', recent.slice(0, 20))

      return { success: true, project: importedProject }
    } catch (e) {
      console.error('❌ Erreur import projet:', e)
      return { success: false, error: e.message }
    }
  })

  // ─── RENOMMER UN PROJET ───────────────────────────────────────────────
  ipcMain.handle('rename-editor-project', async (event, { projectId, newName }) => {
    try {
      if (!newName || !newName.trim()) {
        return { success: false, error: 'Nom invalide' }
      }

      const projects = store.get('editorProjects', {})
      const project = projects[projectId]

      if (!project) {
        return { success: false, error: 'Projet non trouvé' }
      }

      project.name = newName.trim()
      project.updatedAt = Date.now()
      store.set('editorProjects', projects)

      return { success: true, project }
    } catch (e) {
      console.error('❌ Erreur renommage projet:', e)
      return { success: false, error: e.message }
    }
  })

  // ─── DUPLIQUER UN PROJET ──────────────────────────────────────────────
  ipcMain.handle('duplicate-editor-project', async (event, projectId) => {
    try {
      const projects = store.get('editorProjects', {})
      const project = projects[projectId]

      if (!project) {
        return { success: false, error: 'Projet non trouvé' }
      }

      // régénère tous les IDs + remap loopState
      const duplicatedProject = {
        ...regenerateProjectIds(project),
        name: `${project.name} (copie)`,
      }

      projects[duplicatedProject.id] = duplicatedProject
      store.set('editorProjects', projects)

      const recent = store.get('recentEditorProjects', [])
      const filtered = recent.filter((id) => id !== duplicatedProject.id)
      filtered.unshift(duplicatedProject.id)
      store.set('recentEditorProjects', filtered.slice(0, 20))

      return { success: true, project: duplicatedProject }
    } catch (e) {
      console.error('❌ Erreur duplication projet:', e)
      return { success: false, error: e.message }
    }
  })

  console.log('✅ [projectHandlers] Tous les handlers enregistrés')
}

module.exports = { registerProjectHandlers }