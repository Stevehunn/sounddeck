/**
 * @file Plugin installer modal.
 *
 * Two install methods:
 * 1. **From URL** — the URL is fetched via `fetch()`, converted to an
 *    `ArrayBuffer`, and passed to `electronAPI.installPluginFromBuffer`.
 * 2. **From file** — the user picks a `.sdplugin` / `.zip` file, which is
 *    read via `FileReader.arrayBuffer()` and passed to the same IPC.
 *
 * **Pro-gated**: if the user isn't Pro (`useLicense().isPro === false`),
 * the installer shows a lock screen that redirects to Options → Support.
 * The main process also validates the plugin manifest's `licenseRequired`
 * flag on install, so this is a UX convenience, not a security boundary.
 *
 * Progress: the UI shows a 0-100% bar during install (fake progress — the
 * actual work is done by the main process).
 *
 * @see electron/modules/fileHandlers.js — `installPluginFromBuffer` handler
 * @see @core/store/hooks/useLicense.js
 */

import { useState, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { useLicense } from '@core/store/hooks/useLicense'

/**
 * Plugin installer modal.
 *
 * @param {Object} props
 * @param {() => void} props.onClose - Called when the modal should close.
 * @param {(msg: string, type?: string) => void} props.addToast
 * @param {'fr'|'en'|'es'} [_lang] - Kept for API compatibility; the
 *   effective language comes from `useLanguage()`.
 * @param {(result: Object) => void} [props.onInstall] - Called after a
 *   successful install (before the modal auto-closes).
 * @returns {JSX.Element}
 */
export default function PluginInstaller({
  onClose,
  addToast,
  _lang,
  onInstall,
}) {
  const { t } = useLanguage()
  const { isPro, loading: licenseLoading } = useLicense()
  const [url, setUrl] = useState('')
  const [installing, setInstalling] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const fileInputRef = useRef(null)

  // ─── Pro gate ─────────────────────────────────────────────────────
  if (!licenseLoading && !isPro) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal"
          style={{ width: 480 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-title">
            <i className="ti ti-lock" style={{ color: 'var(--warning)' }} />
            {t('pluginsInstall')}
          </div>

          <div
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginBottom: 20,
              lineHeight: 1.6,
            }}
          >
            <p>Les plugins externes nécessitent une licence Pro.</p>
            <p style={{ marginTop: 8 }}>
              Rendez-vous dans <strong>Options → Soutenir SoundDeck</strong>{' '}
              pour faire un don ou activer votre clé existante.
            </p>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary btn-lg"
              onClick={onClose}
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /**
   * Installs a plugin from a URL.
   * @returns {Promise<void>}
   */
  const handleInstallFromUrl = async () => {
    if (!url.trim()) {
      addToast(t('pluginInvalidUrl'), 'error')
      return
    }

    setInstalling(true)
    setProgress(10)
    setStatus(t('pluginDownloading'))

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      setProgress(40)
      setStatus(t('pluginInstalling'))

      const arrayBuffer = await response.arrayBuffer()

      setProgress(70)
      setStatus(t('pluginExtracting'))

      const result = await window.electronAPI.installPluginFromBuffer?.(
        arrayBuffer,
        url.split('/').pop() || 'plugin.sdplugin'
      )

      setProgress(100)
      setStatus(t('pluginDone'))

      if (result?.success) {
        addToast(`✅ ${result.name}`, 'success')
        if (onInstall) onInstall(result)
        setTimeout(onClose, 1500)
      } else {
        addToast(`❌ ${result?.error || t('pluginInstallError')}`, 'error')
      }
    } catch (e) {
      setStatus(t('error'))
      addToast(`❌ ${e.message}`, 'error')
    } finally {
      setInstalling(false)
      setProgress(0)
      setStatus('')
    }
  }

  /**
   * Opens the native file picker.
   * @returns {void}
   */
  const handleInstallFromFile = () => {
    fileInputRef.current?.click()
  }

  /**
   * Reads the selected file and installs it.
   * @param {React.ChangeEvent<HTMLInputElement>} e
   * @returns {Promise<void>}
   */
  const handleFileSelected = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.sdplugin') && !file.name.endsWith('.zip')) {
      addToast(t('pluginUnsupportedFormat'), 'error')
      return
    }

    setInstalling(true)
    setProgress(20)
    setStatus(t('pluginReadingFile'))

    try {
      const arrayBuffer = await file.arrayBuffer()

      setProgress(50)
      setStatus(t('pluginInstalling'))

      const result = await window.electronAPI.installPluginFromBuffer?.(
        arrayBuffer,
        file.name
      )

      setProgress(100)
      setStatus(t('pluginDone'))

      if (result?.success) {
        addToast(`✅ ${result.name}`, 'success')
        if (onInstall) onInstall(result)
        setTimeout(onClose, 1500)
      } else {
        addToast(`❌ ${result?.error || t('pluginInstallError')}`, 'error')
      }
    } catch (err) {
      setStatus(t('error'))
      addToast(`❌ ${err.message}`, 'error')
    } finally {
      setInstalling(false)
      setProgress(0)
      setStatus('')
    }

    e.target.value = ''
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <i className="ti ti-puzzle" style={{ color: 'var(--accent)' }} />
          {t('pluginsInstall')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Method 1: URL */}
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              {t('pluginFromUrl')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemple.com/plugin.sdplugin"
                style={{ flex: 1 }}
                disabled={installing}
                onKeyDown={(e) => e.key === 'Enter' && handleInstallFromUrl()}
              />
              <button
                className="btn-primary btn-sm"
                onClick={handleInstallFromUrl}
                disabled={installing || !url.trim()}
                style={{ minWidth: 100 }}
              >
                {installing ? t('pluginInstalling') : t('pluginsInstallBtn')}
              </button>
            </div>
          </div>

          {/* Separator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'var(--text-tertiary)',
              fontSize: 11,
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            {t('or')}
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Method 2: File */}
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              {t('pluginFromFile')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-secondary"
                onClick={handleInstallFromFile}
                disabled={installing}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <i className="ti ti-folder-open" /> {t('pluginChooseFile')}
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

          {/* Progress bar */}
          {installing && (
            <div style={{ marginTop: 4 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  marginBottom: 4,
                }}
              >
                <span>{status}</span>
                <span>{progress}%</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 4,
                  background: 'var(--bg-tertiary)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Format info */}
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              padding: '10px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              lineHeight: 1.6,
              marginTop: 4,
            }}
          >
            <i
              className="ti ti-info-circle"
              style={{ marginRight: 4, color: 'var(--accent)' }}
            />
            <strong>{t('pluginFormatInfo')} :</strong> {t('pluginFormatDesc')}
            <code
              style={{
                background: 'var(--bg-secondary)',
                padding: '1px 6px',
                borderRadius: 3,
                margin: '0 4px',
                fontSize: 10,
              }}
            >
              plugin.json
            </code>
            + index.js
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button
            className="btn-secondary btn-lg"
            onClick={onClose}
            disabled={installing}
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}