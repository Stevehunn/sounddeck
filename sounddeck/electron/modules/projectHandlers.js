// electron/modules/projectHandlers.js
const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

function registerProjectHandlers(store) {
  console.log('🔧 [projectHandlers] Enregistrement des handlers...')

  // ─── SAUVEGARDER UN PROJET ─────────────────────────────────────────────
  ipcMain.handle('save-editor-project', async (event, projectData) => {
    console.log('💾 [projectHandlers] save-editor-project:', projectData?.name)

    try {
      if (!projectData || !projectData.id) {
        return { success: false, error: 'Données de projet invalides' }
      }

      const updatedProject = {
        ...projectData,
        updatedAt: Date.now(),
      }

      const projects = store.get('editorProjects', {})
      projects[projectData.id] = updatedProject
      store.set('editorProjects', projects)
      store.set('currentEditorProjectId', projectData.id)

      const recent = store.get('recentEditorProjects', [])
      const filtered = recent.filter((id) => id !== projectData.id)
      filtered.unshift(projectData.id)
      store.set('recentEditorProjects', filtered.slice(0, 20))

      console.log(`✅ Projet "${projectData.name}" sauvegardé`)
      return { success: true, project: updatedProject }
    } catch (e) {
      console.error('❌ Erreur sauvegarde projet:', e)
      return { success: false, error: e.message }
    }
  })

  // ─── CHARGER UN PROJET ──────────────────────────────────────────────────
  ipcMain.handle('load-editor-project', async (event, projectId) => {
    console.log('📂 [projectHandlers] load-editor-project:', projectId)

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

      console.log(`✅ Projet "${project.name}" chargé`)
      return { success: true, project }
    } catch (e) {
      console.error('❌ Erreur chargement projet:', e)
      return { success: false, error: e.message }
    }
  })

  // ─── OBTENIR TOUS LES PROJETS ──────────────────────────────────────────
  ipcMain.handle('get-all-editor-projects', async () => {
    console.log('📋 [projectHandlers] get-all-editor-projects')

    try {
      const projects = store.get('editorProjects', {})
      const result = Object.values(projects).sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
      )
      console.log(`📋 ${result.length} projets trouvés`)
      return result
    } catch (e) {
      console.error('❌ Erreur récupération projets:', e)
      return []
    }
  })

  // ─── OBTENIR LES PROJETS RÉCENTS ──────────────────────────────────────
  ipcMain.handle('get-recent-editor-projects', async () => {
    console.log('🔄 [projectHandlers] get-recent-editor-projects')

    try {
      const recentIds = store.get('recentEditorProjects', [])
      const projects = store.get('editorProjects', {})

      const result = recentIds
        .map((id) => projects[id])
        .filter(Boolean)
        .slice(0, 10)
      console.log(`🔄 ${result.length} projets récents`)
      return result
    } catch (e) {
      console.error('❌ Erreur récupération projets récents:', e)
      return []
    }
  })

  // ─── SUPPRIMER UN PROJET ───────────────────────────────────────────────
  ipcMain.handle('delete-editor-project', async (event, projectId) => {
    console.log('🗑️ [projectHandlers] delete-editor-project:', projectId)

    try {
      const projects = store.get('editorProjects', {})

      if (!projects[projectId]) {
        return { success: false, error: 'Projet non trouvé' }
      }

      delete projects[projectId]
      store.set('editorProjects', projects)

      const recent = store.get('recentEditorProjects', [])
      store.set(
        'recentEditorProjects',
        recent.filter((id) => id !== projectId)
      )

      if (store.get('currentEditorProjectId') === projectId) {
        store.delete('currentEditorProjectId')
      }

      console.log(`✅ Projet supprimé`)
      return { success: true }
    } catch (e) {
      console.error('❌ Erreur suppression projet:', e)
      return { success: false, error: e.message }
    }
  })

  // ─── EXPORTER UN PROJET ─────────────────────────────────────────────────
  ipcMain.handle(
    'export-editor-project',
    async (event, { project, filePath }) => {
      console.log('📤 [projectHandlers] export-editor-project:', project?.name)

      try {
        if (!project) {
          return { success: false, error: 'Aucun projet à exporter' }
        }

        const exportData = {
          version: '1.0.0',
          type: 'sounddeck-project',
          exportedAt: Date.now(),
          project: {
            ...project,
            exportedAt: Date.now(),
          },
        }

        const dir = path.dirname(filePath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }

        fs.writeFileSync(
          filePath,
          JSON.stringify(exportData, null, 2),
          'utf-8'
        )

        console.log(`✅ Projet exporté vers: ${filePath}`)
        return { success: true, path: filePath }
      } catch (e) {
        console.error('❌ Erreur export projet:', e)
        return { success: false, error: e.message }
      }
    }
  )

  // ─── IMPORTER UN PROJET ─────────────────────────────────────────────────
  ipcMain.handle('import-editor-project', async (event, filePath) => {
    console.log('📥 [projectHandlers] import-editor-project:', filePath)

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

      const importedProject = {
        ...data.project,
        id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        importedAt: Date.now(),
        updatedAt: Date.now(),
      }

      const projects = store.get('editorProjects', {})
      projects[importedProject.id] = importedProject
      store.set('editorProjects', projects)

      const recent = store.get('recentEditorProjects', [])
      recent.unshift(importedProject.id)
      store.set('recentEditorProjects', recent.slice(0, 20))

      console.log(`✅ Projet importé: "${importedProject.name}"`)
      return { success: true, project: importedProject }
    } catch (e) {
      console.error('❌ Erreur import projet:', e)
      return { success: false, error: e.message }
    }
  })

  // ─── RENOMMER UN PROJET ─────────────────────────────────────────────────
  ipcMain.handle(
    'rename-editor-project',
    async (event, { projectId, newName }) => {
      console.log(
        '✏️ [projectHandlers] rename-editor-project:',
        projectId,
        '->',
        newName
      )

      try {
        if (!newName || !newName.trim()) {
          return { success: false, error: 'Nom invalide' }
        }

        const projects = store.get('editorProjects', {})
        const project = projects[projectId]

        if (!project) {
          return { success: false, error: 'Projet non trouvé' }
        }

        // ✅ Mise à jour du nom + timestamp
        project.name = newName.trim()
        project.updatedAt = Date.now()

        // ✅ Sauvegarde dans le store
        store.set('editorProjects', projects)

        // ✅ FIX : suppression de l'écriture orpheline `currentEditorProject`
        // Le projet "actuel" est identifié via `currentEditorProjectId` uniquement.
        // Le store n'a pas besoin d'une copie séparée du projet en cours.

        console.log(`✅ Projet renommé: "${newName}"`)
        return { success: true, project }
      } catch (e) {
        console.error('❌ Erreur renommage projet:', e)
        return { success: false, error: e.message }
      }
    }
  )

  // ─── DUPLIQUER UN PROJET ──────────────────────────────────────────────
  ipcMain.handle('duplicate-editor-project', async (event, projectId) => {
    console.log('📋 [projectHandlers] duplicate-editor-project:', projectId)

    try {
      const projects = store.get('editorProjects', {})
      const project = projects[projectId]

      if (!project) {
        return { success: false, error: 'Projet non trouvé' }
      }

      const duplicatedProject = {
        ...project,
        id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${project.name} (copie)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      projects[duplicatedProject.id] = duplicatedProject
      store.set('editorProjects', projects)

      // ✅ Cohérence avec save/load/import : on ajoute aux récents
      const recent = store.get('recentEditorProjects', [])
      const filtered = recent.filter((id) => id !== duplicatedProject.id)
      filtered.unshift(duplicatedProject.id)
      store.set('recentEditorProjects', filtered.slice(0, 20))

      console.log(`✅ Projet dupliqué: "${duplicatedProject.name}"`)
      return { success: true, project: duplicatedProject }
    } catch (e) {
      console.error('❌ Erreur duplication projet:', e)
      return { success: false, error: e.message }
    }
  })

  console.log('✅ [projectHandlers] Tous les handlers enregistrés')
}

module.exports = { registerProjectHandlers }