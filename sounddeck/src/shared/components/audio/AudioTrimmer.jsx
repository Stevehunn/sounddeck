// src/shared/components/audio/AudioTrimmer.jsx
import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { buildFileUrl } from '@shared/utils/fileUrl'
import Waveform from './Waveform'

export default function AudioTrimmer({ filePath, onConfirm, onCancel }) {
  const { t } = useLanguage()
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [trimming, setTrimming] = useState(false)
  const [trimWarning, setTrimWarning] = useState('')

  const audioRef = useRef(null)

  const fileUrl = buildFileUrl(filePath)

  useEffect(() => {
    const audio = new Audio(fileUrl)
    audioRef.current = audio
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
      setEnd(audio.duration)
    })
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
    audio.addEventListener('ended', () => {
      setPlaying(false)
      setCurrentTime(0)
    })
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [fileUrl])

  useEffect(() => {
    if (audioRef.current && currentTime >= end && playing) {
      audioRef.current.pause()
      audioRef.current.currentTime = start
      setCurrentTime(start)
      setPlaying(false)
    }
  }, [currentTime, end, start, playing])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.currentTime = start
      audio.play()
      setPlaying(true)
    }
  }

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleSeek = (pos) => {
    if (audioRef.current) audioRef.current.currentTime = pos
    setCurrentTime(pos)
  }

  const handleTrim = async () => {
    setTrimming(true)
    setTrimWarning('')

    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
    }

    let result = null
    try {
      result = await window.electronAPI.trimSoundFile(filePath, start, end)
    } catch (e) {
      console.error('❌ [AudioTrimmer] Exception trimSoundFile:', e)
      setTrimming(false)
      setTrimWarning(t('trimmerErrorWithDetail', { error: e.message }))
      return
    }

    setTrimming(false)

    if (!result || !result.success) {
      setTrimWarning(
        t('trimmerErrorWithDetail', {
          error: result?.error || 'Unknown error',
        })
      )
      return
    }

    if (result.warning) {
      setTrimWarning(result.warning)
      return
    }

    onConfirm(result.path)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <i className="ti ti-cut" style={{ color: 'var(--accent)' }} />
        {t('trimmerTrimTitle')}
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontWeight: 400,
            marginLeft: 4,
          }}
        >
          {t('trimmerRegionSelectedWithDuration', {
            start: formatTime(start),
            end: formatTime(end),
            duration: formatTime(end - start),
          })}
        </span>
      </div>

      <div style={{ marginBottom: 4 }}>
        <Waveform
          filePath={filePath}
          start={start}
          end={end}
          currentTime={currentTime}
          duration={duration}
          height={80}
          showHandles
          onSeek={handleSeek}
          onStartChange={(pos) => setStart(Math.max(0, pos))}
          onEndChange={(pos) => setEnd(Math.min(duration, pos))}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--text-tertiary)',
        }}
      >
        <span>{formatTime(0)}</span>
        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
          {formatTime(currentTime)}
        </span>
        <span>{formatTime(duration)}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 3,
            }}
          >
            {t('trimmerStartLabel', { time: formatTime(start) })}
          </label>
          <input
            type="range"
            min="0"
            max={duration}
            step="0.01"
            value={start}
            onChange={(e) =>
              setStart(Math.min(Number(e.target.value), end - 0.1))
            }
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 3,
            }}
          >
            {t('trimmerEndLabel', { time: formatTime(end) })}
          </label>
          <input
            type="range"
            min="0"
            max={duration}
            step="0.01"
            value={end}
            onChange={(e) =>
              setEnd(Math.max(Number(e.target.value), start + 0.1))
            }
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={togglePlay}
          className="btn-secondary"
          style={{ gap: 6 }}
        >
          <i className={`ti ${playing ? 'ti-player-pause' : 'ti-player-play'}`} />
          {playing ? t('trimmerPause') : t('trimmerPlaySelection')}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} className="btn-secondary">
            {t('back')}
          </button>
          <button
            onClick={handleTrim}
            className="btn-primary"
            disabled={trimming}
          >
            {trimming ? (
              <>
                <i
                  className="ti ti-loader"
                  style={{ animation: 'spin 1s linear infinite' }}
                />{' '}
                {t('trimmerProcessing')}
              </>
            ) : (
              <>
                <i className="ti ti-check" /> {t('trimmerConfirm')}
              </>
            )}
          </button>
        </div>
      </div>

      {trimWarning ? (
        <div
          style={{
            fontSize: 11,
            color: 'var(--warning)',
            padding: '10px 12px',
            background: 'rgba(239,159,39,0.1)',
            borderRadius: 6,
            border: '1px solid var(--warning)',
            lineHeight: 1.5,
          }}
        >
          <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
          <strong>{t('trimmerError')} :</strong> {trimWarning}
        </div>
      ) : (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            padding: '8px 10px',
            background: 'var(--bg-tertiary)',
            borderRadius: 6,
          }}
        >
          <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
          {t('trimmerInstallFfmpeg')}
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}