import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n'
import {
  connectOBS,
  disconnectOBS,
  getOBSStatus,
  switchOBSScene,
  startOBSRecording,
  stopOBSRecording,
  startOBSStreaming,
  stopOBSStreaming
} from '../utils/obsIntegration'

export default function OBSControl({ lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState(4455)
  const [password, setPassword] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Vérifier l'état de la connexion
    const checkStatus = () => {
      try {
        const obsStatus = getOBSStatus()
        setIsConnected(obsStatus.connected)
      } catch (e) {
        console.warn('Erreur vérification OBS:', e)
      }
    }
    
    const interval = setInterval(checkStatus, 5000)
    checkStatus()
    
    return () => clearInterval(interval)
  }, [])

  const handleConnect = async () => {
    setIsLoading(true)
    setStatus(tr('connecting'))
    
    try {
      const result = await connectOBS({ host, port, password })
      if (result.success) {
        setIsConnected(true)
        setStatus(tr('obsConnected'))
      } else {
        setStatus(tr('obsConnectionError') + ': ' + result.error)
      }
    } catch (e) {
      setStatus(tr('obsConnectionError') + ': ' + e.message)
    }
    
    setIsLoading(false)
  }

  const handleDisconnect = () => {
    try {
      disconnectOBS()
      setIsConnected(false)
      setIsRecording(false)
      setIsStreaming(false)
      setStatus(tr('obsDisconnected'))
    } catch (e) {
      setStatus('Erreur: ' + e.message)
    }
  }

  const handleToggleRecording = async () => {
    if (isRecording) {
      try {
        await stopOBSRecording()
        setIsRecording(false)
        setStatus(tr('obsRecordingStopped'))
      } catch (e) {
        setStatus('Erreur: ' + e.message)
      }
    } else {
      try {
        await startOBSRecording()
        setIsRecording(true)
        setStatus(tr('obsRecordingStarted'))
      } catch (e) {
        setStatus('Erreur: ' + e.message)
      }
    }
  }

  const handleToggleStreaming = async () => {
    if (isStreaming) {
      try {
        await stopOBSStreaming()
        setIsStreaming(false)
        setStatus(tr('obsStreamingStopped'))
      } catch (e) {
        setStatus('Erreur: ' + e.message)
      }
    } else {
      try {
        await startOBSStreaming()
        setIsStreaming(true)
        setStatus(tr('obsStreamingStarted'))
      } catch (e) {
        setStatus('Erreur: ' + e.message)
      }
    }
  }

  return (
    <div style={{
      padding: '12px',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${isConnected ? 'var(--success)' : 'var(--border)'}`
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <i className="ti ti-brand-obs" style={{ 
            color: isConnected ? 'var(--success)' : 'var(--text-tertiary)' 
          }} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            OBS Studio
          </span>
          <span style={{
            fontSize: 10,
            color: isConnected ? 'var(--success)' : 'var(--text-tertiary)',
            background: isConnected ? 'rgba(29,158,117,0.1)' : 'var(--bg-tertiary)',
            padding: '2px 8px',
            borderRadius: 10
          }}>
            {isConnected ? tr('connected') : tr('disconnected')}
          </span>
        </div>

        <button
          className="btn-ghost btn-sm"
          onClick={() => setShowConfig(!showConfig)}
          style={{ fontSize: 12 }}
        >
          <i className={`ti ${showConfig ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
        </button>
      </div>

      {showConfig && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 10
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder={tr('obsHost')}
              className="input-sm"
              style={{ flex: 1 }}
            />
            <input
              value={port}
              onChange={e => setPort(Number(e.target.value))}
              placeholder={tr('obsPort')}
              className="input-sm"
              style={{ width: 80 }}
            />
          </div>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={tr('obsPassword')}
            type="password"
            className="input-sm"
          />
        </div>
      )}

      {!isConnected ? (
        <button
          className="btn-primary"
          onClick={handleConnect}
          disabled={isLoading}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {isLoading ? (
            <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('connecting')}</>
          ) : (
            <><i className="ti ti-plug" /> {tr('obsConnect')}</>
          )}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={handleToggleRecording}
            style={{
              flex: 1,
              justifyContent: 'center',
              borderColor: isRecording ? 'var(--danger)' : undefined,
              color: isRecording ? 'var(--danger)' : undefined
            }}
          >
            <i className={`ti ${isRecording ? 'ti-player-stop-filled' : 'ti-circle-filled'}`}
               style={{ color: isRecording ? 'var(--danger)' : 'var(--danger)' }} />
            {isRecording ? tr('obsStopRecording') : tr('obsStartRecording')}
          </button>

          <button
            className="btn-secondary"
            onClick={handleToggleStreaming}
            style={{
              flex: 1,
              justifyContent: 'center',
              borderColor: isStreaming ? 'var(--success)' : undefined,
              color: isStreaming ? 'var(--success)' : undefined
            }}
          >
            <i className={`ti ${isStreaming ? 'ti-player-stop-filled' : 'ti-player-play-filled'}`} />
            {isStreaming ? tr('obsStopStreaming') : tr('obsStartStreaming')}
          </button>

          <button
            className="btn-ghost"
            onClick={handleDisconnect}
            style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
          >
            <i className="ti ti-x" /> {tr('disconnect')}
          </button>
        </div>
      )}

      {status && (
        <div style={{
          fontSize: 11,
          color: 'var(--text-tertiary)',
          marginTop: 8,
          textAlign: 'center'
        }}>
          {status}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}