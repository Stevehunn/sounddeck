import { useLanguage } from '../context/LanguageContext'
import { useState } from 'react'

export default function QuitConfirm({ onClose, lang = 'fr' }) {
  const { t, currentLang } = useLanguage()
  const [remember, setRemember] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleAction = async (action) => {
    if (processing) return
    setProcessing(true)
    
    try {
      // ✅ Si l'utilisateur choisit "Réduire", fermer la popup immédiatement
      if (action === 'minimize') {
        onClose()
      }

      const result = await window.electronAPI.confirmQuit(action, remember)
      
      if (result === 'cancel') {
        onClose()
      }
    } catch (e) {
      console.error('❌ Erreur lors de la confirmation:', e)
      onClose()
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={() => handleAction('cancel')}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ color: 'var(--warning)' }}>
          <i className="ti ti-alert-triangle" style={{ color: 'var(--warning)', marginRight: 8 }} />
          {t('quitConfirmTitle')}
        </div>
        
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
          {t('quitConfirmMessage')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button 
            className="btn-primary btn-xl"
            onClick={() => handleAction('quit')}
            disabled={processing}
            style={{ 
              width: '100%', 
              justifyContent: 'center',
              background: 'var(--danger)',
              borderColor: 'var(--danger)',
              minHeight: 48
            }}
          >
            <i className="ti ti-power" /> {t('quitConfirmQuit')}
          </button>
          
          <button 
            className="btn-secondary btn-xl"
            onClick={() => handleAction('minimize')}
            disabled={processing}
            style={{ width: '100%', justifyContent: 'center', minHeight: 48 }}
          >
            <i className="ti ti-arrow-bar-to-bottom" /> {t('quitConfirmMinimize')}
          </button>
          
          <button 
            className="btn-ghost"
            onClick={() => handleAction('cancel')}
            disabled={processing}
            style={{ width: '100%', justifyContent: 'center', minHeight: 34 }}
          >
            {t('quitConfirmCancel')}
          </button>
        </div>

        <div style={{ 
          marginTop: 16, 
          paddingTop: 12, 
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <input 
            type="checkbox" 
            id="rememberChoice" 
            checked={remember} 
            onChange={e => setRemember(e.target.checked)}
            style={{ width: 'auto', accentColor: 'var(--accent)' }}
          />
          <label htmlFor="rememberChoice" style={{ fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer' }}>
            {t('quitConfirmRemember')}
          </label>
        </div>
      </div>
    </div>
  )
}