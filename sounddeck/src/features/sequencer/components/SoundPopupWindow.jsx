// src/features/sequencer/components/SoundPopupWindow.jsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { buildFileUrl } from '@shared/utils/fileUrl'

// ─── CONSTANTES ──────────────────────────────────────────────────────────
const AUTO_HIDE_DELAY = 4500 // ms (avant : 2500)

// ─── HELPERS ─────────────────────────────────────────────────────────────
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ─── THÈMES (miroir de src/index.css) ────────────────────────────────────
const BASE_DARK = {
  '--bg-primary': '#111113',
  '--bg-secondary': '#1a1a1e',
  '--bg-tertiary': '#222228',
  '--bg-hover': '#2a2a32',
  '--border': '#2e2e36',
  '--text-primary': '#f0f0f2',
  '--text-secondary': '#a0a0b0',
  '--text-tertiary': '#606070',
  '--accent': '#7C6FF7',
  '--accent-light': '#2d2855',
  '--accent-hover': '#9B96FF',
  '--success': '#1D9E75',
  '--warning': '#EF9F27',
  '--danger': '#E05252',
}

const BASE_LIGHT = {
  '--bg-primary': '#ffffff',
  '--bg-secondary': '#f4f4f8',
  '--bg-tertiary': '#e8e8f0',
  '--bg-hover': '#e0e0ea',
  '--border': '#d8d8e4',
  '--text-primary': '#111113',
  '--text-secondary': '#505060',
  '--text-tertiary': '#909098',
  '--accent': '#534AB7',
  '--accent-light': '#eeedf8',
  '--accent-hover': '#6B62D4',
  '--success': '#1D9E75',
  '--warning': '#EF9F27',
  '--danger': '#E05252',
}

const BASE_DARK_BLUE = {
  '--bg-primary': '#0d1117',
  '--bg-secondary': '#161b22',
  '--bg-tertiary': '#21262d',
  '--bg-hover': '#30363d',
  '--border': '#30363d',
  '--text-primary': '#e6edf3',
  '--text-secondary': '#8b949e',
  '--text-tertiary': '#484f58',
  '--accent': '#2f81f7',
  '--accent-light': '#0d2340',
  '--accent-hover': '#58a6ff',
  '--success': '#3fb950',
  '--warning': '#d29922',
  '--danger': '#f85149',
}

function buildThemeVars(theme, customTheme) {
  let vars
  if (theme === 'light') vars = { ...BASE_LIGHT }
  else if (theme === 'dark-blue') vars = { ...BASE_DARK_BLUE }
  else vars = { ...BASE_DARK }

  if (theme === 'custom' && customTheme) {
    const c = customTheme
    vars = {
      ...vars,
      '--bg-primary': c.bgPrimary || vars['--bg-primary'],
      '--bg-secondary': c.bgSecondary || vars['--bg-secondary'],
      '--bg-tertiary': c.bgTertiary || vars['--bg-tertiary'],
      '--bg-hover': c.bgHover || vars['--bg-hover'],
      '--border': c.border || vars['--border'],
      '--text-primary': c.textPrimary || vars['--text-primary'],
      '--text-secondary': c.textSecondary || vars['--text-secondary'],
      '--text-tertiary': c.textTertiary || vars['--text-tertiary'],
      '--accent': c.accent || vars['--accent'],
      '--accent-light': c.accentLight || vars['--accent-light'],
      '--accent-hover': c.accentHover || vars['--accent-hover'],
      '--success': c.success || vars['--success'],
      '--warning': c.warning || vars['--warning'],
      '--danger': c.danger || vars['--danger'],
    }
  }
  return vars
}

// ─── COMPOSANT ───────────────────────────────────────────────────────────

export default function SoundPopupWindow() {
  const [payload, setPayload] = useState(null)
  const [visible, setVisible] = useState(false)
  const [paused, setPaused] = useState(false)
  const [size, setSize] = useState('medium')
  const [themeVars, setThemeVars] = useState(() => buildThemeVars('dark', null))
  const hideTimerRef = useRef(null)
  const readySignaledRef = useRef(false)

  const scheduleAutoHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      setVisible(false)
      window.soundPopupAPI?.requestHide?.()
    }, AUTO_HIDE_DELAY)
  }, [])

  const cancelAutoHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const off = window.soundPopupAPI?.onUpdate?.((data) => {
      setPayload(data)
      setPaused(false)
      setSize(data.cardSize || 'medium')
      setThemeVars(buildThemeVars(data.theme || 'dark', data.customTheme || null))
      setVisible(true)
      readySignaledRef.current = false
      scheduleAutoHide()
    })
    return () => {
      off?.()
      cancelAutoHide()
    }
  }, [scheduleAutoHide, cancelAutoHide])

  // Signal "ready" au main process après le premier rendu visible
  useEffect(() => {
    if (!visible || !payload || readySignaledRef.current) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (readySignaledRef.current) return
        readySignaledRef.current = true
        window.soundPopupAPI?.sendReady?.()
      })
    })
    return () => cancelAnimationFrame(id)
  }, [visible, payload])

  const handleAction = (action) => {
    window.soundPopupAPI?.sendAction?.(action)
    if (action === 'pause') {
      setPaused((p) => !p)
      scheduleAutoHide()
    }
  }

  //  Hover : annule le timer local ET prévient le main process
  const handleMouseEnter = () => {
    cancelAutoHide()
    window.soundPopupAPI?.setHover?.(true)
  }

  const handleMouseLeave = () => {
    scheduleAutoHide()
    window.soundPopupAPI?.setHover?.(false)
  }

  if (!payload) {
    return <div className="sound-popup__placeholder" />
  }

  //  Utilise le helper canonique de l'app pour les URLs locales
  const imageUrl = payload.image ? buildFileUrl(payload.image) : null
  const duration = formatDuration(payload.duration)

  return (
    <div
      className={`sound-popup sound-popup--${size} ${visible ? 'visible' : 'hidden'}`}
      style={themeVars}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="sound-popup-window"
      data-size={size}
    >
      <div className="sound-popup__thumb">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            onError={(e) => {
              // Fallback emoji si l'image ne charge pas
              e.target.style.display = 'none'
              const parent = e.target.parentElement
              if (parent && !parent.querySelector('.sound-popup__thumb-fallback')) {
                const span = document.createElement('span')
                span.className = 'sound-popup__thumb-fallback'
                span.textContent = payload.emoji || '🔊'
                parent.appendChild(span)
              }
            }}
          />
        ) : (
          <span>{payload.emoji || '🔊'}</span>
        )}
      </div>

      <div className="sound-popup__info">
        <div className="sound-popup__name" title={payload.name}>
          {payload.name || '—'}
        </div>
        <div className="sound-popup__meta">
          <i className="ti ti-clock" style={{ fontSize: '0.9em' }} />
          <span>{duration}</span>
          {payload.index != null && payload.total != null && (
            <span className="sound-popup__counter">
              · {payload.index + 1}/{payload.total}
            </span>
          )}
        </div>
      </div>

      <div className="sound-popup__actions">
        <button
          type="button"
          onClick={() => handleAction('prev')}
          data-testid="sound-popup-prev"
          aria-label="Previous"
        >
          <i className="ti ti-player-skip-back-filled" />
        </button>
        <button
          type="button"
          onClick={() => handleAction('pause')}
          className="sound-popup__play"
          data-testid="sound-popup-pause"
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          <i
            className={`ti ${
              paused ? 'ti-player-play-filled' : 'ti-player-pause-filled'
            }`}
          />
        </button>
        <button
          type="button"
          onClick={() => handleAction('next')}
          data-testid="sound-popup-next"
          aria-label="Next"
        >
          <i className="ti ti-player-skip-forward-filled" />
        </button>
      </div>
    </div>
  )
}