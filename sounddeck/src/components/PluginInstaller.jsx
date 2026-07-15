import { useState, useRef } from 'react'
import { useTranslation } from '../i18n'

export default function PluginInstaller({ onClose, addToast, lang, onInstall }) {
  const tr = useTranslation(lang)
  const [url, setUrl] = useState('')
  const [installing, setInstalling] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const fileInputRef = useRef(null)

  console.log('🔧 PluginInstaller monté')

  const handleInstallFromUrl = async () => {
    if (!url.trim()) {
      addToast('Veuillez entrer une URL valide', 'error')
      return
    }

    console.log('📥 Installation depuis URL:', url)
    setInstalling(true)
    setProgress(10)
    setStatus('Téléchargement du plugin...')

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      console.log('✅ Fichier téléchargé, taille:', response.headers.get('content-length'))

      setProgress(40)
      setStatus('Installation en cours...')

      const arrayBuffer = await response.arrayBuffer()
      console.log('📦 Buffer taille:', arrayBuffer.byteLength)

      setProgress(70)
      setStatus('Extraction des fichiers...')

      // ✅ Passer le buffer directement
      const result = await window.electronAPI.installPluginFromBuffer?.(arrayBuffer, url.split('/').pop() || 'plugin.sdplugin')

      setProgress(100)
      setStatus('Terminé !')

      if (result?.success) {
        addToast(`✅ Plugin "${result.name}" installé avec succès !`, 'success')
        if (onInstall) onInstall(result)
        setTimeout(onClose, 1500)
      } else {
        addToast(`❌ Erreur: ${result?.error || 'Installation échouée'}`, 'error')
      }
    } catch (e) {
      console.error('❌ Erreur:', e)
      setStatus('Erreur')
      addToast(`❌ Erreur: ${e.message}`, 'error')
    } finally {
      setInstalling(false)
      setProgress(0)
      setStatus('')
    }
  }

  const handleInstallFromFile = () => {
    console.log('📁 Ouverture du dialogue de fichier')
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files[0]
    if (!file) {
      console.log('❌ Aucun fichier sélectionné')
      return
    }

    console.log('📁 Fichier sélectionné:', file.name, 'taille:', file.size, 'type:', file.type)

    // Vérifier l'extension
    if (!file.name.endsWith('.sdplugin') && !file.name.endsWith('.zip')) {
      addToast('Format non supporté. Utilisez un fichier .sdplugin ou .zip', 'error')
      return
    }

    setInstalling(true)
    setProgress(20)
    setStatus('Lecture du fichier...')

    try {
      // ✅ Lire le fichier comme ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      console.log('📦 Buffer taille:', arrayBuffer.byteLength)

      setProgress(50)
      setStatus('Installation en cours...')

      // ✅ Passer le buffer directement au main process
      const result = await window.electronAPI.installPluginFromBuffer?.(arrayBuffer, file.name)

      console.log('📤 Résultat installation:', result)

      setProgress(100)
      setStatus('Terminé !')

      if (result?.success) {
        addToast(`✅ Plugin "${result.name}" installé avec succès !`, 'success')
        if (onInstall) onInstall(result)
        setTimeout(onClose, 1500)
      } else {
        addToast(`❌ Erreur: ${result?.error || 'Installation échouée'}`, 'error')
      }
    } catch (err) {
      console.error('❌ Erreur installation:', err)
      setStatus('Erreur')
      addToast(`❌ Erreur: ${err.message}`, 'error')
    } finally {
      setInstalling(false)
      setProgress(0)
      setStatus('')
    }

    e.target.value = ''
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-puzzle" style={{ color: 'var(--accent)' }} />
          Installer un plugin
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Méthode 1: URL */}
          <div>
            <div style={{ 
              fontSize: 12, 
              fontWeight: 600, 
              color: 'var(--text-secondary)',
              marginBottom: 6
            }}>
              📡 Installer depuis une URL
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://exemple.com/plugin.sdplugin"
                style={{ flex: 1 }}
                disabled={installing}
                onKeyDown={e => e.key === 'Enter' && handleInstallFromUrl()}
              />
              <button 
                className="btn-primary btn-sm"
                onClick={handleInstallFromUrl}
                disabled={installing || !url.trim()}
                style={{ minWidth: 100 }}
              >
                {installing ? 'Installation...' : 'Installer'}
              </button>
            </div>
          </div>

          {/* Séparateur */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
            color: 'var(--text-tertiary)',
            fontSize: 11
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            OU
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Méthode 2: Fichier */}
          <div>
            <div style={{ 
              fontSize: 12, 
              fontWeight: 600, 
              color: 'var(--text-secondary)',
              marginBottom: 6
            }}>
              📁 Installer depuis un fichier
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn-secondary"
                onClick={handleInstallFromFile}
                disabled={installing}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <i className="ti ti-folder-open" /> Choisir un fichier .sdplugin
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".sdplugin,.zip"
                onChange={handleFileSelected}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Barre de progression */}
          {installing && (
            <div style={{ marginTop: 4 }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--text-secondary)',
                marginBottom: 4
              }}>
                <span>{status}</span>
                <span>{progress}%</span>
              </div>
              <div style={{
                width: '100%',
                height: 4,
                background: 'var(--bg-tertiary)',
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

          {/* Info */}
          <div style={{ 
            fontSize: 11, 
            color: 'var(--text-tertiary)',
            padding: '10px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            lineHeight: 1.6,
            marginTop: 4
          }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
            <strong>Format .sdplugin :</strong> Une archive ZIP contenant un fichier 
            <code style={{ 
              background: 'var(--bg-secondary)', 
              padding: '1px 6px', 
              borderRadius: 3,
              margin: '0 4px',
              fontSize: 10
            }}>plugin.json</code> 
            et le code du plugin.
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button 
            className="btn-secondary btn-lg" 
            onClick={onClose}
            disabled={installing}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}