import { useState, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { playSound } from '../utils/audio'

export default function TwitchAlerts({ store, addToast, lang = 'fr' }) {
  const { t, currentLang } = useLanguage()
  const [alerts, setAlerts] = useState([])
  const [isEnabled, setIsEnabled] = useState(true)

  useEffect(() => {
    // Simuler des alertes de test
    if (isEnabled) {
      const timer = setTimeout(() => {
        addTestAlert()
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [isEnabled])

  const addTestAlert = () => {
    const alertTypes = ['follow', 'donation', 'sub']
    const type = alertTypes[Math.floor(Math.random() * alertTypes.length)]
    
    let alert = {
      id: Date.now(),
      type,
      timestamp: new Date().toISOString()
    }
    
    switch (type) {
      case 'follow':
        alert.username = ['Streamer', 'Gamer', 'Viewer'][Math.floor(Math.random() * 3)]
        alert.message = `${alert.username} a suivi la chaîne ! 🎉`
        break
      case 'donation':
        alert.username = ['Donateur', 'Sponsor', 'Follower'][Math.floor(Math.random() * 3)]
        alert.amount = (Math.random() * 10 + 1).toFixed(2)
        alert.message = `${alert.username} a fait un don de ${alert.amount}€ ! ❤️`
        break
      case 'sub':
        alert.username = ['Subscriber', 'Fan', 'Supporter'][Math.floor(Math.random() * 3)]
        alert.tier = ['Tier 1', 'Tier 2', 'Tier 3'][Math.floor(Math.random() * 3)]
        alert.message = `${alert.username} s'est abonné (${alert.tier}) ! 🎉`
        break
    }
    
    setAlerts(prev => [alert, ...prev].slice(0, 10))
    
    // Jouer un son d'alerte si disponible
    try {
      const alertSound = store.sounds.find(s => 
        s.name.toLowerCase().includes('alert') ||
        s.name.toLowerCase().includes('notification')
      )
      if (alertSound) {
        playSound(alertSound, store.audioDevice, store.volume, false, true)
      }
    } catch (e) {
      console.warn('Erreur lecture son d\'alerte:', e)
    }
  }

  const clearAlerts = () => {
    setAlerts([])
  }

  return (
    <div style={{
      padding: '12px',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-brand-twitch" style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {t('twitchAlerts')}
          </span>
          <span style={{
            fontSize: 10,
            color: isEnabled ? 'var(--success)' : 'var(--text-tertiary)',
            background: isEnabled ? 'rgba(29,158,117,0.1)' : 'var(--bg-tertiary)',
            padding: '2px 8px',
            borderRadius: 10
          }}>
            {isEnabled ? t('enabled') : t('disabled')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn-ghost btn-sm"
            onClick={() => setIsEnabled(!isEnabled)}
            style={{ fontSize: 12 }}
          >
            <i className={`ti ${isEnabled ? 'ti-eye' : 'ti-eye-off'}`} />
          </button>
          <button
            className="btn-ghost btn-sm"
            onClick={addTestAlert}
            style={{ fontSize: 12 }}
          >
            <i className="ti ti-test-pipe" />
          </button>
          <button
            className="btn-ghost btn-sm"
            onClick={clearAlerts}
            style={{ fontSize: 12 }}
          >
            <i className="ti ti-trash" />
          </button>
        </div>
      </div>

      <div style={{
        maxHeight: 200,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}>
        {alerts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 16,
            color: 'var(--text-tertiary)',
            fontSize: 12
          }}>
            {t('noAlerts')}
          </div>
        )}

        {alerts.map(alert => {
          const alertColors = {
            follow: 'var(--success)',
            donation: 'var(--warning)',
            sub: 'var(--accent)',
            raid: 'var(--danger)'
          }
          
          const alertIcons = {
            follow: 'ti-heart',
            donation: 'ti-coins',
            sub: 'ti-crown',
            raid: 'ti-rocket'
          }

          return (
            <div
              key={alert.id}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid ${alertColors[alert.type] || 'var(--accent)'}`,
                animation: 'slideInRight 0.3s ease'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12
              }}>
                <i className={`ti ${alertIcons[alert.type] || 'ti-bell'}`} 
                   style={{ color: alertColors[alert.type] || 'var(--accent)' }} />
                <span style={{ flex: 1 }}>{alert.message}</span>
                <span style={{
                  fontSize: 9,
                  color: 'var(--text-tertiary)'
                }}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{
        marginTop: 8,
        fontSize: 10,
        color: 'var(--text-tertiary)',
        textAlign: 'center'
      }}>
        {t('twitchAlertsDesc')}
      </div>
    </div>
  )
}