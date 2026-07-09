import { useTranslation } from '../i18n'
import { useState } from 'react'

export default function QuitConfirm({ onClose, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [remember, setRemember] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleAction = async (action) => {
    console.log(`📌 [QUIT] handleAction - action: ${action}`)
    if (processing) return
    setProcessing(true)
    
    try {
      // ✅ Si l'utilisateur choisit "Réduire", fermer la popup IMMÉDIATEMENT
      if (action === 'minimize') {
        console.log(`📌 [QUIT] minimize - fermeture immédiate`)
        onClose()
      }

      console.log(`📌 [QUIT] Appel de confirmQuit avec action: ${action}, remember: ${remember}`)
      const result = await window.electronAPI.confirmQuit(action, remember)
      console.log(`📤 [QUIT] Résultat confirmQuit: ${result}`)
      
      if (result === 'cancel') {
        console.log(`📌 [QUIT] cancel - fermeture`)
        onClose()
      }
    } catch (e) {
      console.error('❌ Erreur lors de la confirmation:', e)
      onClose()
    } finally {
      setProcessing(false)
    }
  }

  console.log(`🎨 [QUIT] Rendu de la popup`)

  return (
    <div className="modal-overlay" onClick={() => handleAction('cancel')}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ color: 'var(--warning)' }}>
          <i className="ti ti-alert-triangle" style={{ color: 'var(--warning)', marginRight: 8 }} />
          {tr('quitConfirmTitle')}
        </div>
        
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
          {tr('quitConfirmMessage')}
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
            <i className="ti ti-power" /> {tr('quitConfirmQuit')}
          </button>
          
          <button 
            className="btn-secondary btn-xl"
            onClick={() => handleAction('minimize')}
            disabled={processing}
            style={{ width: '100%', justifyContent: 'center', minHeight: 48 }}
          >
            <i className="ti ti-arrow-bar-to-bottom" /> {tr('quitConfirmMinimize')}
          </button>
          
          <button 
            className="btn-ghost"
            onClick={() => handleAction('cancel')}
            disabled={processing}
            style={{ width: '100%', justifyContent: 'center', minHeight: 34 }}
          >
            {tr('quitConfirmCancel')}
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
            {tr('quitConfirmRemember')}
          </label>
        </div>
      </div>
    </div>
  )
}