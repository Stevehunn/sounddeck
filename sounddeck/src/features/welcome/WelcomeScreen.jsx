/**
 * @file First-launch welcome screen.
 *
 * Shown once when the app starts for the first time (`hasLaunchedBefore`
 * is `false` in the store). Lets the user pick:
 * - Their UI language (auto-detected from the OS on first load)
 * - Their keyboard layout (QWERTY / AZERTY, auto-detected from the OS)
 *
 * On "Continue":
 * 1. Calls `changeLanguage(selectedLang)` (persists + updates i18n).
 * 2. Saves `keyboardLayout` and `hasLaunchedBefore = true`.
 * 3. Updates the tray icon language.
 * 4. Reloads the window (so everything is re-rendered with the new locale).
 *
 * @see @core/i18n/LanguageContext.jsx
 * @see @core/i18n/constants.js (`LANGUAGES`)
 */

import { useState, useEffect } from 'react'
import { LANGUAGES } from '@core/i18n/constants'
import { useLanguage } from '@core/i18n/LanguageContext'

/**
 * First-launch welcome screen.
 *
 * @param {Object} props
 * @param {() => void} props.onComplete - Kept for API compatibility; the
 *   actual "done" is signaled by reloading the window.
 * @returns {JSX.Element}
 */
export default function WelcomeScreen({ onComplete: _onComplete }) {
  const { t, currentLang, changeLanguage } = useLanguage()
  const [selectedLang, setSelectedLang] = useState('fr')
  const [keyboardLayout, setKeyboardLayout] = useState('qwerty')
  const [loading, setLoading] = useState(true)

  // Detect OS language + keyboard layout on mount (best-effort).
  // `changeLanguage`/`currentLang` are intentionally excluded from the
  // dep array — this effect must run exactly once so the user's later
  // clicks on language buttons aren't overwritten by a re-detection.
  useEffect(() => {
    const getSystemValues = async () => {
      try {
        const systemLang = await window.electronAPI?.getSystemLanguage?.()
        if (systemLang) {
          setSelectedLang(systemLang)
          if (systemLang !== currentLang) {
            await changeLanguage(systemLang)
          }
        }

        const systemLayout =
          await window.electronAPI?.getSystemKeyboardLayout?.()
        if (systemLayout) {
          setKeyboardLayout(systemLayout)
        }
      } catch (e) {
        console.warn('⚠️ Failed to read system preferences:', e)
      } finally {
        setLoading(false)
      }
    }
    getSystemValues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Persists the user's choices and reloads the window.
   * @returns {Promise<void>}
   */
  const handleConfirm = async () => {
    try {
      await changeLanguage(selectedLang)
      await window.electronAPI.storeSet('keyboardLayout', keyboardLayout)
      await window.electronAPI.storeSet('hasLaunchedBefore', true)
      await window.electronAPI?.updateTrayLanguage?.(selectedLang)
      window.location.reload()
    } catch (e) {
      console.error('❌ Failed to save preferences:', e)
    }
  }

  if (loading) {
    return (
      <div
        data-testid="welcome-loading"
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
        }}
      >
        <i
          className="ti ti-loader"
          style={{ animation: 'spin 1s linear infinite', fontSize: 24 }}
        />
      </div>
    )
  }

  return (
    <div
      data-testid="welcome-container"
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 32,
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <i
            className="ti ti-speakerphone"
            style={{ fontSize: 48, color: 'var(--accent)' }}
          />
          <h1 style={{ marginTop: 12, fontSize: 24, fontWeight: 700 }}>
            SoundDeck
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            {t('welcomeTitle')}
          </p>
        </div>

        {/* Language */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            🌐 {t('welcomeLanguage')}
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                data-testid={`welcome-lang-${l.code}`}
                onClick={() => setSelectedLang(l.code)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  border: `2px solid ${
                    selectedLang === l.code ? 'var(--accent)' : 'var(--border)'
                  }`,
                  background:
                    selectedLang === l.code
                      ? 'var(--accent-light)'
                      : 'var(--bg-tertiary)',
                  color:
                    selectedLang === l.code
                      ? 'var(--accent)'
                      : 'var(--text-secondary)',
                  fontWeight: selectedLang === l.code ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 18 }}>{l.flag}</span>
                {l.label}
                {selectedLang === l.code && (
                  <i className="ti ti-check" style={{ fontSize: 14 }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Keyboard layout */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            ⌨️ {t('welcomeKeyboard')}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['qwerty', 'azerty'].map((layout) => (
              <button
                key={layout}
                data-testid={`welcome-keyboard-${layout}`}
                onClick={() => setKeyboardLayout(layout)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  border: `2px solid ${
                    keyboardLayout === layout
                      ? 'var(--accent)'
                      : 'var(--border)'
                  }`,
                  background:
                    keyboardLayout === layout
                      ? 'var(--accent-light)'
                      : 'var(--bg-tertiary)',
                  color:
                    keyboardLayout === layout
                      ? 'var(--accent)'
                      : 'var(--text-secondary)',
                  fontWeight: keyboardLayout === layout ? 600 : 400,
                  textTransform: 'uppercase',
                }}
              >
                {layout}
                {keyboardLayout === layout && (
                  <i className="ti ti-check" style={{ marginLeft: 6 }} />
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          data-testid="welcome-continue"
          onClick={handleConfirm}
          className="btn-primary btn-xl"
          style={{ width: '100%', justifyContent: 'center', minHeight: 48 }}
        >
          <i className="ti ti-arrow-right" /> {t('welcomeContinue')}
        </button>

        <p
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            marginTop: 12,
          }}
        >
          {t('welcomeNote')}
        </p>
      </div>
    </div>
  )
}