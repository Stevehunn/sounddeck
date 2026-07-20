import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

const FEEDBACK_TYPES = [
  { id: 'bug', labelKey: 'feedbackBug', icon: 'ti-bug' },
  { id: 'feature', labelKey: 'feedbackFeature', icon: 'ti-lightbulb' },
  { id: 'question', labelKey: 'feedbackQuestion', icon: 'ti-help' },
  { id: 'praise', labelKey: 'feedbackPraise', icon: 'ti-heart' },
]

export default function FeedbackModal({ onClose, lang = 'fr', onSubmit, store }) {
  const { t, currentLang } = useLanguage()
  const [type, setType] = useState('bug')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [includeLogs, setIncludeLogs] = useState(false)
  const [includeScreenshot, setIncludeScreenshot] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError(t('feedbackMessageRequired'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Récupérer les logs si demandé
      let logs = null
      if (includeLogs) {
        try {
          logs = await window.electronAPI.storeGet('errorLogs') || []
        } catch (e) {
          console.warn('Impossible de récupérer les logs:', e)
        }
      }

      // Récupérer une capture d'écran si demandé
      let screenshot = null
      if (includeScreenshot) {
        try {
          // Utiliser l'API Screenshot de l'application
          screenshot = await window.electronAPI.captureScreen?.()
        } catch (e) {
          console.warn('Impossible de capturer l\'écran:', e)
        }
      }

      // Construire le feedback
      const feedback = {
        type,
        message: message.trim(),
        email: email.trim() || undefined,
        logs: logs || undefined,
        screenshot: screenshot || undefined,
        timestamp: new Date().toISOString(),
        version: await window.electronAPI.storeGet('version') || '1.3.0',
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        soundCount: store?.sounds?.length || 0,
        profileCount: store?.profiles?.length || 0
      }

      // Envoyer le feedback
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
      console.error('Erreur envoi feedback:', e)
      setError(t('feedbackError') + ': ' + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fonction d'envoi du feedback
  const submitFeedback = async (feedback) => {
    // Option 1: Envoyer à un service de bug tracking (ex: Sentry, BugSnag)
    // Option 2: Envoyer à un serveur backend
    // Option 3: Ouvrir une issue GitHub
    
    console.log('📤 Feedback envoyé:', feedback)
    
    // Simuler un délai
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Ouvrir une issue GitHub pour les bugs
    if (feedback.type === 'bug') {
      const title = encodeURIComponent(`[Bug] ${feedback.message.slice(0, 50)}`)
      const body = encodeURIComponent(`
## Description
${feedback.message}

## Informations
- Version: ${feedback.version}
- Plateforme: ${feedback.platform}
- Navigateur: ${feedback.userAgent}
- Email: ${feedback.email || 'Non renseigné'}
- Sons: ${feedback.soundCount}
- Profils: ${feedback.profileCount}

${feedback.logs ? `## Logs\n\`\`\`json\n${JSON.stringify(feedback.logs.slice(0, 10), null, 2)}\n\`\`\`` : ''}
      `)
      window.open(`https://github.com/steve833/sounddeck/issues/new?title=${title}&body=${body}`, '_blank')
    }
  }

  if (isSuccess) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <i className="ti ti-check" style={{ fontSize: 32, color: 'white' }} />
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

  const selectedType = FEEDBACK_TYPES.find(t => t.id === type)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 460, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" id="modal-title">
          <i className="ti ti-message" style={{ color: 'var(--accent)' }} />
          {t('feedbackTitle')}
        </div>

        <div id="modal-desc" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Type de feedback */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              {t('feedbackType')}
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FEEDBACK_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    border: `2px solid ${type === t.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: type === t.id ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                    color: type === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <i className={`ti ${t.icon}`} />
                  {tr(t.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              {t('feedbackMessage')} *
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t('feedbackPlaceholder')}
              rows={4}
              className="input-lg"
              style={{ borderRadius: 'var(--radius-md)', resize: 'vertical', minHeight: 80 }}
              aria-required="true"
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              {t('feedbackEmail')} <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>({t('feedbackEmailOptional')})</span>
            </label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="input-lg"
              style={{ borderRadius: 'var(--radius-md)' }}
              type="email"
            />
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeLogs}
                onChange={e => setIncludeLogs(e.target.checked)}
                style={{ width: 'auto', accentColor: 'var(--accent)' }}
                aria-label={t('feedbackIncludeLogs')}
              />
              <span style={{ fontSize: 12 }}>
                <i className="ti ti-file-text" style={{ marginRight: 4 }} />
                {t('feedbackIncludeLogs')}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeScreenshot}
                onChange={e => setIncludeScreenshot(e.target.checked)}
                style={{ width: 'auto', accentColor: 'var(--accent)' }}
                aria-label={t('feedbackIncludeScreenshot')}
              />
              <span style={{ fontSize: 12 }}>
                <i className="ti ti-camera" style={{ marginRight: 4 }} />
                {t('feedbackIncludeScreenshot')}
              </span>
            </label>
          </div>

          {/* Erreur */}
          {error && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(224,82,82,0.1)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              color: 'var(--danger)'
            }}>
              <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
              {error}
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button 
            className="btn-secondary btn-lg" 
            onClick={onClose} 
            disabled={isSubmitting} 
            style={{ borderRadius: 'var(--radius-md)' }}
            aria-label={t('cancel')}
          >
            {t('cancel')}
          </button>
          <button
            className="btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim()}
            style={{ borderRadius: 'var(--radius-md)' }}
            aria-label={t('feedbackSend')}
          >
            {isSubmitting ? (
              <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('feedbackSending')}</>
            ) : (
              <><i className="ti ti-send" /> {t('feedbackSend')}</>
            )}
          </button>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}