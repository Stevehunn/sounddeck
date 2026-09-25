// src/shared/components/settings/OBSControl.jsx
import { useState, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import {
  connectOBS,
  disconnectOBS,
  getOBSStatus,
  startOBSRecording,
  stopOBSRecording,
  startOBSStreaming,
  stopOBSStreaming
} from '@shared/utils/obsIntegration'
import { logWarn } from '@shared/utils/logger'

export default function OBSControl({ lang = 'fr' }) {
  const { t, currentLang } = useLanguage()
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
    const checkStatus = () => {
      try {
        const obsStatus = getOBSStatus()
        setIsConnected(obsStatus.connected)
      } catch (e) {
        logWarn('OBSControl', 'Erreur vérification OBS', e)
      }
    }

    const interval = setInterval(checkStatus, 5000)
    checkStatus()

    return () => clearInterval(interval)
  }, [])

  const handleConnect = async () => {
    setIsLoading(true)
    setStatus(t('connecting') || t('loading'))

    try {
      const result = await connectOBS({ host, port, password })
      if (result.success) {
        setIsConnected(true)
        setStatus(t('obsConnected'))
      } else {
        setStatus(`${t('obsConnectionError')}: ${result.error}`)
      }
    } catch (e) {
      setStatus(`${t('obsConnectionError')}: ${e.message}`)
    }

    setIsLoading(false)
  }

  const handleDisconnect = () => {
    try {
      disconnectOBS()
      setIsConnected(false)
      setIsRecording(false)
      setIsStreaming(false)
      setStatus(t('obsDisconnected'))
    } catch (e) {
      setStatus(`${t('error')}: ${e.message}`)
    }
  }

  const handleToggleRecording = async () => {
    if (isRecording) {
      try {
        await stopOBSRecording()
        setIsRecording(false)
        setStatus(t('obsRecordingStopped'))
      } catch (e) {
        setStatus(`${t('error')}: ${e.message}`)
      }
    } else {
      try {
        await startOBSRecording()
        setIsRecording(true)
        setStatus(t('obsRecordingStarted'))
      } catch (e) {
        setStatus(`${t('error')}: ${e.message}`)
      }
    }
  }

  const handleToggleStreaming = async () => {
    if (isStreaming) {
      try {
        await stopOBSStreaming()
        setIsStreaming(false)
        setStatus(t('obsStreamingStopped'))
      } catch (e) {
        setStatus(`${t('error')}: ${e.message}`)
      }
    } else {
      try {
        await startOBSStreaming()
        setIsStreaming(true)
        setStatus(t('obsStreamingStarted'))
      } catch (e) {
        setStatus(`${t('error')}: ${e.message}`)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            {isConnected ? t('connected') : t('disconnected')}
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
              placeholder={t('obsHost')}
              className="input-sm"
              style={{ flex: 1 }}
            />
            <input
              value={port}
              onChange={e => setPort(Number(e.target.value))}
              placeholder={t('obsPort')}
              className="input-sm"
              style={{ width: 80 }}
            />
          </div>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('obsPassword')}
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
            <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('loading')}</>
          ) : (
            <><i className="ti ti-plug" /> {t('obsConnect')}</>
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
               style={{ color: 'var(--danger)' }} />
            {isRecording ? t('obsStopRecording') : t('obsStartRecording')}
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
            {isStreaming ? t('obsStopStreaming') : t('obsStartStreaming')}
          </button>

          <button
            className="btn-ghost"
            onClick={handleDisconnect}
            style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
          >
            <i className="ti ti-x" /> {t('disconnect') || t('close')}
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

      
    </div>
  )
}