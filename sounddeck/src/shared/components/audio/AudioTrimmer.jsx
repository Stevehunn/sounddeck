/**
 * @file Audio trimmer UI — waveform preview + range selection + trim action.
 *
 * Renders an interactive waveform (`Waveform` in `showHandles` mode) with
 * two draggable handles for the start/end of the region, two range inputs
 * for precise adjustment, a "Play selection" button, and a "Confirm trim"
 * button that calls `electronAPI.trimSoundFile(path, start, end)`.
 *
 * When the trim succeeds but the audio is silent or the file has no useful
 * signal, `result.warning` is set and the UI shows a warning banner instead
 * of calling `onConfirm`.
 *
 * Errors (FFmpeg missing, trim exception) are surfaced as `trimWarning`
 * with a "install ffmpeg" hint below.
 *
 * @see ./Waveform.jsx — the interactive waveform renderer
 * @see electron/modules/fileHandlers.js — `trimSoundFile` IPC handler
 */

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { buildFileUrl } from '@shared/utils/fileUrl'
import Waveform from './Waveform'
import { logError } from '@shared/utils/logger'

/**
 * Formats a duration (in seconds) as "M:SS".
 *
 * @param {number} s - Duration in seconds.
 * @returns {string} Formatted duration (e.g. "1:23"). Returns "0:00" for
 *   invalid inputs.
 */
function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/**
 * Audio trimmer component.
 *
 * @param {Object} props
 * @param {string} props.filePath - Path to the source audio file.
 * @param {(newPath: string) => void} props.onConfirm - Called with the
 *   path of the trimmed file (empty when the user cancels).
 * @param {() => void} props.onCancel - Called when the user cancels.
 * @returns {JSX.Element}
 */
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

  // ─── Load metadata ────────────────────────────────────────────────
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

  // ─── Auto-stop at end of selection ────────────────────────────────
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

    // NOTE: `result` is assigned inside the try/catch and read below.
    // No initializer (was `= null`, unused — see no-useless-assignment).
    let result
    try {
      result = await window.electronAPI.trimSoundFile(filePath, start, end)
    } catch (e) {
      logError('AudioTrimmer', 'Exception trimSoundFile', e)
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
            start: fmtTime(start),
            end: fmtTime(end),
            duration: fmtTime(end - start),
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
        <span>{fmtTime(0)}</span>
        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
          {fmtTime(currentTime)}
        </span>
        <span>{fmtTime(duration)}</span>
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
            {t('trimmerStartLabel', { time: fmtTime(start) })}
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
            {t('trimmerEndLabel', { time: fmtTime(end) })}
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
    </div>
  )
}