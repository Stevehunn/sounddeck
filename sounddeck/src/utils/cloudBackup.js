// Sauvegarde vers le cloud

/**
 * Sauvegarde vers Google Drive
 * Note: Nécessite une configuration OAuth
 */
export async function backupToGoogleDrive(store, config) {
  try {
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('gdrive_token')
    if (!token) {
      // Rediriger vers l'authentification
      const authUrl = await getGoogleDriveAuthUrl()
      window.open(authUrl, '_blank')
      return { success: false, error: 'Authentification requise' }
    }

    // Récupérer les données
    const data = {
      profiles: store.profiles,
      sounds: store.sounds,
      shortcuts: store.shortcuts,
      tags: store.tags,
      timestamp: Date.now()
    }

    // Sauvegarder
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `sounddeck-backup-${new Date().toISOString().slice(0,10)}.json`,
        mimeType: 'application/json'
      })
    })

    if (!response.ok) {
      throw new Error('Erreur upload')
    }

    return { success: true }
  } catch (e) {
    console.error('Erreur sauvegarde Google Drive:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Sauvegarde vers Dropbox
 */
export async function backupToDropbox(store, config) {
  try {
    const token = localStorage.getItem('dropbox_token')
    if (!token) {
      // Rediriger vers l'authentification
      const authUrl = await getDropboxAuthUrl()
      window.open(authUrl, '_blank')
      return { success: false, error: 'Authentification requise' }
    }

    const data = {
      profiles: store.profiles,
      sounds: store.sounds,
      shortcuts: store.shortcuts,
      tags: store.tags,
      timestamp: Date.now()
    }

    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: `/sounddeck-backup-${new Date().toISOString().slice(0,10)}.json`,
          mode: 'add',
          autorename: true
        })
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('Erreur upload')
    }

    return { success: true }
  } catch (e) {
    console.error('Erreur sauvegarde Dropbox:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Récupère les sauvegardes depuis Google Drive
 */
export async function listGoogleDriveBackups() {
  try {
    const token = localStorage.getItem('gdrive_token')
    if (!token) {
      return { success: false, error: 'Authentification requise' }
    }

    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=name contains 'sounddeck-backup'&orderBy=createdTime desc",
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    const data = await response.json()
    return { success: true, files: data.files || [] }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

/**
 * Récupère les sauvegardes depuis Dropbox
 */
export async function listDropboxBackups() {
  try {
    const token = localStorage.getItem('dropbox_token')
    if (!token) {
      return { success: false, error: 'Authentification requise' }
    }

    const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: '',
        recursive: false
      })
    })

    const data = await response.json()
    const files = data.entries?.filter(f => 
      f.name.includes('sounddeck-backup') && f['.tag'] === 'file'
    ) || []

    return { success: true, files }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

/**
 * URL d'authentification Google Drive
 */
function getGoogleDriveAuthUrl() {
  const clientId = process.env.GOOGLE_CLIENT_ID || 'VOTRE_CLIENT_ID'
  const redirectUri = encodeURIComponent('http://localhost:5173/auth/callback')
  const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file')
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`
}

/**
 * URL d'authentification Dropbox
 */
function getDropboxAuthUrl() {
  const clientId = process.env.DROPBOX_APP_KEY || 'VOTRE_APP_KEY'
  const redirectUri = encodeURIComponent('http://localhost:5173/auth/callback')
  return `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token`
}