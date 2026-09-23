// src/shared/components/audio/Waveform.jsx
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { formatTime as formatTimeShared } from '@shared/utils/format'
import { buildFileUrl } from '@shared/utils/fileUrl'
// ✅ FIX 21 : utilise le module centralisé (avec withTemporaryAudioContext)
// au lieu de recréer un AudioContext qui fuyait en cas d'erreur
import { generateWaveformData } from '@shared/utils/waveformGenerator'

export default function Waveform({
  filePath,
  start = 0,
  end = null,
  currentTime = 0,
  duration = 0,
  onSeek = null,
  onStartChange = null,
  onEndChange = null,
  height = 80,
  showHandles = false,
  color = 'var(--accent)',
  colorSelected = 'rgba(124,111,247,0.8)',
  colorUnselected = 'rgba(124,111,247,0.25)'
}) {
  const { t } = useLanguage()
  const canvasRef = useRef(null)
  const [waveData, setWaveData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState(null)
  const containerRef = useRef(null)
  const fileUrl = filePath ? buildFileUrl(filePath) : null

  useEffect(() => {
    if (!filePath) return

    let mounted = true
    setLoading(true)
    setWaveData(null)

    generateWaveformData(filePath, 300)
      .then(data => {
        if (!mounted) return
        setWaveData(data)
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [filePath])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !waveData) return

    const ctx = canvas.getContext('2d')
    const { width, height: h } = canvas
    ctx.clearRect(0, 0, width, h)

    const endTime = end ?? duration
    const startRatio = duration > 0 ? start / duration : 0
    const endRatio = duration > 0 ? endTime / duration : 1
    const playRatio = duration > 0 ? currentTime / duration : 0

    const barWidth = width / waveData.length
    const centerY = h / 2

    waveData.forEach((val, i) => {
      const x = i * barWidth
      const ratio = i / waveData.length
      const barH = Math.max(2, val * h * 0.9)

      let fillColor
      if (showHandles) {
        if (ratio >= startRatio && ratio <= endRatio) {
          fillColor = ratio <= playRatio ? color : colorSelected
        } else {
          fillColor = colorUnselected
        }
      } else {
        fillColor = ratio <= playRatio ? color : colorUnselected
      }

      ctx.fillStyle = fillColor
      ctx.beginPath()
      ctx.roundRect(x + 0.5, centerY - barH / 2, Math.max(1, barWidth - 1), barH, 1)
      ctx.fill()
    })

    if (duration > 0) {
      const playX = playRatio * width
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.moveTo(playX, 0)
      ctx.lineTo(playX, h)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }, [waveData, start, end, currentTime, duration, showHandles, color, colorSelected, colorUnselected])

  const getPosFromEvent = (e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || !duration) return 0
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration
  }

  const handleMouseDown = (e) => {
    if (!duration) return
    const pos = getPosFromEvent(e)
    const endTime = end ?? duration
    const startRatio = start / duration
    const endRatio = endTime / duration
    const posRatio = pos / duration

    if (showHandles) {
      const distStart = Math.abs(posRatio - startRatio)
      const distEnd = Math.abs(posRatio - endRatio)
      if (distStart < 0.03) { setDragging('start'); return }
      if (distEnd < 0.03) { setDragging('end'); return }
    }
    setDragging('seek')
    onSeek?.(pos)
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging) return
      const pos = getPosFromEvent(e)
      if (dragging === 'seek') onSeek?.(pos)
      else if (dragging === 'start') onStartChange?.(Math.min(pos, (end ?? duration) - 0.1))
      else if (dragging === 'end') onEndChange?.(Math.max(pos, start + 0.1))
    }
    const handleMouseUp = () => setDragging(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, start, end, duration, onSeek, onStartChange, onEndChange])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height, cursor: 'crosshair', userSelect: 'none' }}
      onMouseDown={handleMouseDown}>

      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        style={{ width: '100%', height: '100%', display: loading ? 'none' : 'block', borderRadius: 8 }}
      />

      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'var(--bg-tertiary)', borderRadius: 8,
          gap: 8, color: 'var(--text-tertiary)', fontSize: 12
        }}>
          <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
          {t('waveformAnalyzing')}
        </div>
      )}

      {showHandles && duration > 0 && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${(start / duration) * 100}%`,
          width: 3, background: 'var(--accent)',
          cursor: 'ew-resize', transform: 'translateX(-1px)',
          boxShadow: '0 0 8px var(--accent)'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: -4, width: 10, height: 10,
            borderRadius: '50%', background: 'var(--accent)', border: '2px solid white'
          }} />
          <div style={{
            position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)',
            fontSize: 9, color: 'var(--accent)', whiteSpace: 'nowrap', fontFamily: 'monospace'
          }}>
            {formatTime(start)}
          </div>
        </div>
      )}

      {showHandles && duration > 0 && end != null && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${(end / duration) * 100}%`,
          width: 3, background: 'var(--accent)',
          cursor: 'ew-resize', transform: 'translateX(-1px)',
          boxShadow: '0 0 8px var(--accent)'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: -4, width: 10, height: 10,
            borderRadius: '50%', background: 'var(--accent)', border: '2px solid white'
          }} />
          <div style={{
            position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)',
            fontSize: 9, color: 'var(--accent)', whiteSpace: 'nowrap', fontFamily: 'monospace'
          }}>
            {formatTime(end)}
          </div>
        </div>
      )}


    </div>
  )
}

export function formatTime(s) {
  return formatTimeShared(s, { alwaysMMSS: true, decimals: 1 })
}