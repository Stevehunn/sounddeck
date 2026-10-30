/**
 * @file Export modal (format, bitrate, destination, profiles).
 *
 * Lets the user configure and trigger an export of the current mix:
 * - **Format** — WAV / MP3 / AAC / FLAC / OGG.
 * - **Bitrate** — hidden for lossless formats (WAV/FLAC).
 * - **Destination** — add to library only, save as file only, or both.
 * - **Profiles** — for library exports (default: all profiles selected).
 *
 * The actual export is delegated to the parent via `onExport(options)`.
 * The modal owns the local form state and validity, the parent does the
 * actual `mixdownProject` + `exportMixdown` calls.
 *
 * @see ../Editor.jsx — the caller
 * @see @shared/utils/mixdown.js — the actual export
 */

import { useState, useEffect } from 'react'

/** Supported output formats. `lossless` formats skip the bitrate selector. */
const FORMATS = [
  { value: 'wav', label: 'WAV (lossless)', lossless: true },
  { value: 'mp3', label: 'MP3' },
  { value: 'aac', label: 'AAC' },
  { value: 'flac', label: 'FLAC (lossless)', lossless: true },
  { value: 'ogg', label: 'OGG' },
]

/** Bitrate options (kbps) for lossy formats. */
const BITRATES = [96, 128, 192, 256, 320]

/** Export destination options. */
const EXPORT_LOCATIONS = [
  { value: 'library', icon: '📚' },
  { value: 'file', icon: '📁' },
  { value: 'both', icon: '📁📚' },
]

/** Filename sanitizer: keeps only `[a-zA-Z0-9]`, replaces the rest with `_`. */
const UNSAFE_FILENAME_CHARS = /[^a-zA-Z0-9]/g

/**
 * Export modal.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {(options: Object) => Promise<{success: boolean, results?: Array, error?: string}>} props.onExport
 * @param {number} [props.totalDuration]
 * @param {(key: string) => string} props.tr - i18n translator.
 * @param {{profiles?: Array<{id: string, name: string}>}} [props.store]
 * @param {string} [props.defaultName='']
 * @param {'wav'|'mp3'|'aac'|'flac'|'ogg'} [props.defaultFormat='mp3']
 * @param {number} [props.defaultBitrate=192]
 * @returns {JSX.Element|null}
 */
export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  totalDuration,
  tr,
  store,
  defaultName = '',
  defaultFormat = 'mp3',
  defaultBitrate = 192,
}) {
  const [name, setName] = useState(defaultName)
  const [format, setFormat] = useState(defaultFormat)
  const [bitrate, setBitrate] = useState(defaultBitrate)
  const [profiles, setProfiles] = useState([])
  const [selectedProfiles, setSelectedProfiles] = useState(['all'])
  const [isExporting, setIsExporting] = useState(false)
  const [exportLocation, setExportLocation] = useState('library')

  // Load the available profiles from the store on open.
  useEffect(() => {
    if (store?.profiles) {
      const allProfiles = store.profiles.filter((p) => p.id !== 'all')
      setProfiles(allProfiles)
      setSelectedProfiles(['all', ...allProfiles.map((p) => p.id)])
    }
  }, [store])

  if (!isOpen) return null

  const isLossless = FORMATS.find((f) => f.value === format)?.lossless

  /**
   * Submits the export form (builds the options and forwards to the
   * parent). Rejects empty names.
   *
   * @param {React.FormEvent} e
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
       
      alert(tr('editorNameRequired') || 'Please enter a name')
      return
    }

    setIsExporting(true)
    try {
      const safeName = name.trim().replace(UNSAFE_FILENAME_CHARS, '_')
      const extension = format === 'wav' ? 'wav' : format
      const outputPath = `${safeName}_${Date.now()}.${extension}`

      await onExport({
        name: name.trim(),
        format,
        bitrate,
        profiles: selectedProfiles,
        outputPath,
        exportLocation,
      })
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setIsExporting(false)
    }
  }

  /**
   * Toggles a profile in the "add to profiles" list.
   * @param {string} profileId
   * @returns {void}
   */
  const toggleProfile = (profileId) => {
    setSelectedProfiles((prev) => {
      if (prev.includes(profileId)) {
        return prev.filter((id) => id !== profileId)
      }
      return [...prev, profileId]
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 450, maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <i
            className="ti ti-file-export"
            style={{ color: 'var(--accent)' }}
          />
          {tr('editorExportTitle') || 'Export mix'}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {tr('editorExportNamePlaceholder') || 'Sound name'} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr('editorExportNamePlaceholder') || 'Sound name'}
              autoFocus
              required
              className="input-lg"
              style={{ borderRadius: 'var(--radius-md)' }}
            />
          </div>

          {/* Format + Bitrate */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                {tr('compressionFormat') || 'Format'}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                style={{ width: '100%' }}
                className="input-lg"
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {!isLossless && (
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  {tr('compressionBitrate') || 'Bitrate'}
                </label>
                <select
                  value={bitrate}
                  onChange={(e) => setBitrate(parseInt(e.target.value, 10))}
                  style={{ width: '100%' }}
                  className="input-lg"
                >
                  {BITRATES.map((br) => (
                    <option key={br} value={br}>
                      {br} kbps
                      {br === 192
                        ? ` ${tr('compressionBitrateRecommended') || '(recommended)'}`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Destination */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {tr('exportLocation') || 'Export location'}
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {EXPORT_LOCATIONS.map((loc) => {
                const labelKey = {
                  library: 'exportActionAddOnly',
                  file: 'exportActionExportOnly',
                  both: 'exportActionBoth',
                }[loc.value]
                return (
                  <label
                    key={loc.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${
                        exportLocation === loc.value
                          ? 'var(--accent)'
                          : 'var(--border)'
                      }`,
                      background:
                        exportLocation === loc.value
                          ? 'var(--accent-light)'
                          : 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="radio"
                      name="exportLocation"
                      value={loc.value}
                      checked={exportLocation === loc.value}
                      onChange={() => setExportLocation(loc.value)}
                      style={{
                        width: 'auto',
                        accentColor: 'var(--accent)',
                      }}
                    />
                    {tr(labelKey) || `${loc.icon} ${loc.value}`}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Profiles (only for library exports) */}
          {profiles.length > 0 && exportLocation !== 'file' && (
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                {tr('editorProfilesLabel') || 'Add to profile(s)'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profiles.map((p) => (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${
                        selectedProfiles.includes(p.id)
                          ? 'var(--accent)'
                          : 'var(--border)'
                      }`,
                      background: selectedProfiles.includes(p.id)
                        ? 'var(--accent-light)'
                        : 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProfiles.includes(p.id)}
                      onChange={() => toggleProfile(p.id)}
                      style={{
                        width: 'auto',
                        accentColor: 'var(--accent)',
                      }}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Help note */}
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 12,
              border: '1px solid var(--border)',
            }}
          >
            <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
            {exportLocation === 'file' &&
              (tr('exportFileOnlyNote') ||
                '📁 The file will be saved to your downloads folder.')}
            {exportLocation === 'library' &&
              (tr('exportLibraryOnlyNote') ||
                '📚 The sound will be added to your SoundDeck library.')}
            {exportLocation === 'both' &&
              (tr('exportBothNote') ||
                '📁📚 The file will be saved AND added to SoundDeck.')}
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isExporting}
              style={{
                fontSize: 13,
                padding: '8px 20px',
                minWidth: 100,
                minHeight: 40,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {tr('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isExporting || !name.trim()}
              style={{
                fontSize: 13,
                padding: '8px 20px',
                minWidth: 100,
                minHeight: 40,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {isExporting ? (
                <>
                  <i
                    className="ti ti-loader"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />{' '}
                  {tr('editorExporting') || 'Export...'}
                </>
              ) : (
                <>
                  <i className="ti ti-download" />{' '}
                  {tr('editorExport') || 'Export'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}