import { useState, useEffect } from 'react'
import { LANGUAGES } from '../i18n' // ✅ Plus que les données brutes
import { useLanguage } from '../context/LanguageContext' // ✅ Nouvel import

export default function WelcomeScreen({ onComplete }) {
  const { t, currentLang, changeLanguage } = useLanguage() // ✅ Utiliser useLanguage
  const [selectedLang, setSelectedLang] = useState('fr')
  const [keyboardLayout, setKeyboardLayout] = useState('qwerty')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSystemValues = async () => {
      try {
        const systemLang = await window.electronAPI.getSystemLanguage?.()
        if (systemLang) {
          setSelectedLang(systemLang)
          // ✅ Mettre à jour le contexte si la langue système est différente
          if (systemLang !== currentLang) {
            await changeLanguage(systemLang)
          }
        }
        
        const systemLayout = await window.electronAPI.getSystemKeyboardLayout?.()
        if (systemLayout) {
          setKeyboardLayout(systemLayout)
        }
      } catch (e) {
        console.warn('⚠️ Erreur récupération préférences système:', e)
      } finally {
        setLoading(false)
      }
    }
    getSystemValues()
  }, [])

  const handleConfirm = async () => {
    try {
        // ✅ Utiliser changeLanguage pour mettre à jour le contexte
        await changeLanguage(selectedLang)
        await window.electronAPI.storeSet('keyboardLayout', keyboardLayout)
        await window.electronAPI.storeSet('hasLaunchedBefore', true)
        await window.electronAPI.updateTrayLanguage?.(selectedLang)
        
        // ✅ Recharger l'application pour que l'écran de bienvenue disparaisse
        window.location.reload()
        
        // Si le reload ne fonctionne pas, on appelle onComplete
        // onComplete()
    } catch (e) {
        console.error('❌ Erreur sauvegarde préférences:', e)
    }
  }

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)'
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 24 }} />
      </div>
    )
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: 20
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 32,
        boxShadow: 'var(--shadow-xl)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <i className="ti ti-speakerphone" style={{ fontSize: 48, color: 'var(--accent)' }} />
          <h1 style={{ marginTop: 12, fontSize: 24, fontWeight: 700 }}>SoundDeck</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            {t('welcomeTitle')}
          </p>
        </div>

        {/* Langue */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            🌐 {t('welcomeLanguage')}
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => {
                  setSelectedLang(l.code)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  border: `2px solid ${selectedLang === l.code ? 'var(--accent)' : 'var(--border)'}`,
                  background: selectedLang === l.code ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  color: selectedLang === l.code ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: selectedLang === l.code ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span style={{ fontSize: 18 }}>{l.flag}</span>
                {l.label}
                {selectedLang === l.code && <i className="ti ti-check" style={{ fontSize: 14 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Layout clavier */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            ⌨️ {t('welcomeKeyboard')}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['qwerty', 'azerty'].map(layout => (
              <button
                key={layout}
                onClick={() => setKeyboardLayout(layout)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  border: `2px solid ${keyboardLayout === layout ? 'var(--accent)' : 'var(--border)'}`,
                  background: keyboardLayout === layout ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  color: keyboardLayout === layout ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: keyboardLayout === layout ? 600 : 400,
                  textTransform: 'uppercase'
                }}
              >
                {layout}
                {keyboardLayout === layout && <i className="ti ti-check" style={{ marginLeft: 6 }} />}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleConfirm}
          className="btn-primary btn-xl"
          style={{ width: '100%', justifyContent: 'center', minHeight: 48 }}
        >
          <i className="ti ti-arrow-right" /> {t('welcomeContinue')}
        </button>

        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 12 }}>
          {t('welcomeNote')}
        </p>

        {/* ✅ Bouton de débogage - visible uniquement en développement */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <button
              onClick={async () => {
                await window.electronAPI.storeDelete('hasLaunchedBefore')
                window.location.reload()
              }}
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                background: 'transparent',
                border: '1px dashed var(--border)',
                borderRadius: 4,
                padding: '4px 12px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              🔄 Réinitialiser et revoir l'écran de bienvenue (débogage)
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}