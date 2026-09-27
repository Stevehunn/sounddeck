// src/shared/components/modals/FeedbackModal.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { logError, logWarn, logInfo } from '@shared/utils/logger'

const FEEDBACK_TYPES = [
  { id: 'bug', labelKey: 'feedbackBug', icon: 'ti-bug' },
  { id: 'feature', labelKey: 'feedbackFeature', icon: 'ti-lightbulb' },
  { id: 'question', labelKey: 'feedbackQuestion', icon: 'ti-help' },
  { id: 'praise', labelKey: 'feedbackPraise', icon: 'ti-heart' },
]

const DEFAULT_FEEDBACK_EMAIL = 'feedback@sounddeck.app'
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB

// ─── RÉSOLUTION DU WEBHOOK ────────────────────────────────────────────────
async function resolveWebhookUrl(type) {
  try {
    const perType = await window.electronAPI?.storeGet?.('feedbackWebhookUrls')
    if (perType && typeof perType === 'object' && perType[type]) {
      return perType[type]
    }
  } catch (e) {
    // silencieux
  }
  try {
    const def = await window.electronAPI?.storeGet?.('feedbackWebhookUrl')
    return def || null
  } catch (e) {
    return null
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
function base64ToBlob(base64, mime) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

const MIME_BY_EXT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
}

function mimeFromPath(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase()
  return MIME_BY_EXT[ext] || 'image/png'
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function FeedbackModal({
  onClose,
  lang = 'fr',
  onSubmit,
  store,
  addToast,
}) {
  const { t } = useLanguage()
  const [type, setType] = useState('bug')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [includeLogs, setIncludeLogs] = useState(false)
  const [attachedImage, setAttachedImage] = useState(null)
  const [isAttaching, setIsAttaching] = useState(false)
  const [attachError, setAttachError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState(null)

  // ─── PIÈCE JOINTE IMAGE ────────────────────────────────────────────────
  const handleAttachImage = async () => {
    setIsAttaching(true)
    setAttachError(null)

    try {
      const filePath = await window.electronAPI?.openImageDialog?.()
      if (!filePath) {
        // Annulé par l'utilisateur
        setIsAttaching(false)
        return
      }

      if (typeof window.electronAPI?.readFileBase64 !== 'function') {
        throw new Error('readFileBase64 non disponible (redémarre l\'app)')
      }

      const readResult = await window.electronAPI.readFileBase64(filePath)
      if (!readResult?.success) {
        throw new Error(readResult?.error || 'Lecture impossible')
      }

      const base64 = readResult.base64
      const sizeApprox = Math.floor((base64.length * 3) / 4)

      if (sizeApprox > MAX_IMAGE_SIZE) {
        throw new Error(
          `Image trop lourde (${formatBytes(sizeApprox)} > ${formatBytes(
            MAX_IMAGE_SIZE
          )})`
        )
      }

      const mime = mimeFromPath(filePath)
      const blob = base64ToBlob(base64, mime)
      const previewUrl = URL.createObjectURL(blob)
      const name = filePath.split(/[\\/]/).pop() || 'image.png'

      // Révoque l'ancien URL si on remplace
      if (attachedImage?.previewUrl) {
        URL.revokeObjectURL(attachedImage.previewUrl)
      }

      setAttachedImage({
        name,
        path: filePath,
        blob,
        previewUrl,
        size: blob.size,
        mime,
      })

      logInfo(
        'FeedbackModal',
        `✅ Image attachée : ${name} (${formatBytes(blob.size)})`
      )
    } catch (e) {
      logError('FeedbackModal', 'Erreur pièce jointe', e)
      setAttachError(e.message || 'Impossible d\'attacher l\'image')
    } finally {
      setIsAttaching(false)
    }
  }

  const handleRemoveImage = () => {
    if (attachedImage?.previewUrl) {
      URL.revokeObjectURL(attachedImage.previewUrl)
    }
    setAttachedImage(null)
    setAttachError(null)
  }

  // ─── SUBMIT ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!message.trim()) {
      setError(t('feedbackMessageRequired'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      let logs = null
      if (includeLogs) {
        try {
          logs = (await window.electronAPI.storeGet('errorLogs')) || []
        } catch (e) {
          logWarn('FeedbackModal', 'Impossible de récupérer les logs', e)
        }
      }

      let appVersion = '1.3.0'
      try {
        const storedVersion = await window.electronAPI.storeGet('appVersion')
        if (storedVersion) appVersion = storedVersion
      } catch (e) {
        /* silencieux */
      }

      const feedback = {
        type,
        message: message.trim(),
        email: email.trim() || undefined,
        logs: logs || undefined,
        image: attachedImage
          ? {
              blob: attachedImage.blob,
              name: attachedImage.name,
              mime: attachedImage.mime,
              size: attachedImage.size,
            }
          : undefined,
        timestamp: new Date().toISOString(),
        version: appVersion,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        soundCount: store?.sounds?.length || 0,
        profileCount: store?.profiles?.length || 0,
      }

      if (onSubmit) {
        await onSubmit(feedback)
      } else {
        await submitFeedback(feedback)
      }

      setIsSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (e) {
      logError('FeedbackModal', 'Erreur envoi feedback', e)
      setError(t('feedbackError') + ': ' + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitFeedback = async (feedback) => {
    const webhookUrl = await resolveWebhookUrl(feedback.type)

    if (webhookUrl) {
      logInfo(
        'FeedbackModal',
        `Envoi feedback type="${feedback.type}" vers webhook`
      )
      const ok = await sendToDiscordWebhook(webhookUrl, feedback)
      if (ok) return
      logWarn('FeedbackModal', 'Webhook échoué, fallback mailto')
    } else {
      logInfo(
        'FeedbackModal',
        `Aucun webhook configuré pour type="${feedback.type}", fallback mailto`
      )
    }

    openMailto(feedback)
  }

  const sendToDiscordWebhook = async (webhookUrl, feedback) => {
    try {
      const typeLabel = t(
        `feedback${feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}`
      )

      const embed = {
        title: `📬 Nouveau feedback : ${typeLabel}`,
        description: feedback.message,
        color: feedback.type === 'bug' ? 0xef4444 : 0x7c6ff7,
        timestamp: feedback.timestamp,
        fields: [
          { name: 'Version', value: feedback.version, inline: true },
          {
            name: 'Plateforme',
            value: feedback.platform || 'N/A',
            inline: true,
          },
          { name: 'Sons', value: String(feedback.soundCount), inline: true },
          {
            name: 'Profils',
            value: String(feedback.profileCount),
            inline: true,
          },
        ],
        footer: { text: 'SoundDeck Feedback' },
      }

      if (feedback.email) {
        embed.fields.push({
          name: 'Email',
          value: feedback.email,
          inline: false,
        })
      }

      if (feedback.userAgent) {
        embed.fields.push({
          name: 'User Agent',
          value: feedback.userAgent.slice(0, 200),
          inline: false,
        })
      }

      const payload = {
        username: 'SoundDeck Feedback',
        embeds: [embed],
      }

      const hasLogs = feedback.logs && feedback.logs.length > 0
      const hasImage = !!feedback.image

      let body
      const headers = {}

      if (hasLogs || hasImage) {
        const formData = new FormData()
        formData.append('payload_json', JSON.stringify(payload))

        let fileIndex = 0

        if (hasLogs) {
          formData.append(
            `files[${fileIndex++}]`,
            new Blob([JSON.stringify(feedback.logs, null, 2)], {
              type: 'application/json',
            }),
            'error-logs.json'
          )
        }

        if (hasImage) {
          formData.append(
            `files[${fileIndex++}]`,
            feedback.image.blob,
            feedback.image.name
          )
        }

        body = formData
      } else {
        body = JSON.stringify(payload)
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body,
      })

      if (!response.ok) {
        logWarn('FeedbackModal', 'Webhook HTTP error:', response.status)
        return false
      }

      logInfo('FeedbackModal', '✅ Feedback envoyé via Discord webhook')
      return true
    } catch (e) {
      logError('FeedbackModal', 'Erreur webhook Discord', e)
      return false
    }
  }

  const openMailto = (feedback) => {
    const typeLabel = t(
      `feedback${feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}`
    )

    const subject = `[SoundDeck ${typeLabel}] ${feedback.message.slice(0, 60)}`

    const bodyLines = [
      `Type : ${typeLabel}`,
      `Version : ${feedback.version}`,
      `Plateforme : ${feedback.platform}`,
      `Sons : ${feedback.soundCount} · Profils : ${feedback.profileCount}`,
      '',
      '--- Message ---',
      feedback.message,
      '',
    ]

    if (feedback.email) {
      bodyLines.push('--- Email ---', feedback.email, '')
    }

    if (feedback.image) {
      bodyLines.push(
        '--- Pièce jointe ---',
        `(${feedback.image.name} — pense à joindre le fichier manuellement)`,
        ''
      )
    }

    if (feedback.logs && feedback.logs.length > 0) {
      bodyLines.push(
        '--- Logs (10 dernières erreurs) ---',
        JSON.stringify(feedback.logs.slice(0, 10), null, 2),
        ''
      )
    }

    const body = encodeURIComponent(bodyLines.join('\n'))
    const url = `mailto:${DEFAULT_FEEDBACK_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${body}`

    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url)
    } else {
      window.location.href = url
    }
  }

  if (isSuccess) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal"
          style={{ width: 420 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <i
                className="ti ti-check"
                style={{ fontSize: 32, color: 'white' }}
              />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {t('feedbackThankYou')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('feedbackThankYouDesc')}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 500, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <i className="ti ti-message" style={{ color: 'var(--accent)' }} />
          {t('feedbackTitle')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* TYPE */}
          <div>
            <label
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              {t('feedbackType')}
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FEEDBACK_TYPES.map((feedbackType) => (
                <button
                  key={feedbackType.id}
                  onClick={() => setType(feedbackType.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    border: `2px solid ${
                      type === feedbackType.id
                        ? 'var(--accent)'
                        : 'var(--border)'
                    }`,
                    background:
                      type === feedbackType.id
                        ? 'var(--accent-light)'
                        : 'var(--bg-tertiary)',
                    color:
                      type === feedbackType.id
                        ? 'var(--accent)'
                        : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <i className={`ti ${feedbackType.icon}`} />
                  {t(feedbackType.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* MESSAGE */}
          <div>
            <label
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              {t('feedbackMessage')} *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('feedbackPlaceholder')}
              rows={4}
              className="input-lg"
              style={{
                borderRadius: 'var(--radius-md)',
                resize: 'vertical',
                minHeight: 80,
              }}
              aria-required="true"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              {t('feedbackEmail')}{' '}
              <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                ({t('feedbackEmailOptional')})
              </span>
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="input-lg"
              style={{ borderRadius: 'var(--radius-md)' }}
              type="email"
            />
          </div>

          {/* PIÈCE JOINTE IMAGE */}
          <div>
            <label
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              {t('feedbackAttachImage') || 'Pièce jointe (optionnel)'}
            </label>

            {!attachedImage && (
              <button
                className="btn-secondary"
                onClick={handleAttachImage}
                disabled={isAttaching}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: 12,
                  minHeight: 36,
                  gap: 6,
                }}
              >
                {isAttaching ? (
                  <>
                    <i
                      className="ti ti-loader"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    {t('feedbackAttachImageLoading') || 'Chargement...'}
                  </>
                ) : (
                  <>
                    <i className="ti ti-photo-up" />
                    {t('feedbackAttachImageBtn') || 'Joindre une image'}
                  </>
                )}
              </button>
            )}

            {attachedImage && (
              <div
                style={{
                  padding: 10,
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--success)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    fontSize: 11,
                    color: 'var(--success)',
                    gap: 8,
                  }}
                >
                  <span
                    style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}
                  >
                    <i className="ti ti-check" />
                    <span
                      style={{
                        fontFamily: 'monospace',
                        maxWidth: 240,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={attachedImage.name}
                    >
                      {attachedImage.name}
                    </span>
                    <span style={{ opacity: 0.7 }}>
                      ({formatBytes(attachedImage.size)})
                    </span>
                  </span>
                  <button
                    onClick={handleRemoveImage}
                    className="btn-ghost btn-sm"
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      color: 'var(--danger)',
                      flexShrink: 0,
                    }}
                    title={
                      t('feedbackAttachImageRemove') || 'Retirer l\'image'
                    }
                  >
                    <i className="ti ti-x" />{' '}
                    {t('feedbackAttachImageRemoveShort') || 'Retirer'}
                  </button>
                </div>
                <img
                  src={attachedImage.previewUrl}
                  alt="Aperçu"
                  style={{
                    width: '100%',
                    maxHeight: 160,
                    objectFit: 'contain',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                  }}
                />
              </div>
            )}

            {attachError && (
              <div
                style={{
                  marginTop: 6,
                  padding: '6px 10px',
                  background: 'rgba(224,82,82,0.1)',
                  border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className="ti ti-alert-triangle" />
                <span style={{ flex: 1 }}>{attachError}</span>
                <button
                  onClick={handleAttachImage}
                  className="btn-secondary btn-sm"
                  style={{ fontSize: 10, padding: '2px 8px' }}
                >
                  <i className="ti ti-refresh" /> {t('retry') || 'Réessayer'}
                </button>
              </div>
            )}
          </div>

          {/* LOGS */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={includeLogs}
              onChange={(e) => setIncludeLogs(e.target.checked)}
              style={{ width: 'auto', accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 12 }}>
              <i className="ti ti-file-text" style={{ marginRight: 4 }} />
              {t('feedbackIncludeLogs')}
            </span>
          </label>

          {/* ERREUR */}
          {error && (
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(224,82,82,0.1)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                color: 'var(--danger)',
              }}
            >
              <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
              {error}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button
            className="btn-secondary btn-lg"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            {t('cancel')}
          </button>
          <button
            className="btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim() || isAttaching}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            {isSubmitting ? (
              <>
                <i
                  className="ti ti-loader"
                  style={{ animation: 'spin 1s linear infinite' }}
                />{' '}
                {t('feedbackSending')}
              </>
            ) : (
              <>
                <i className="ti ti-send" /> {t('feedbackSend')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}