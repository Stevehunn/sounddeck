// src/shared/components/ui/ThemeToggle.jsx
import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

const STORAGE_KEY = 'autoTheme'

function msUntilNextThemeCheck() {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const second = now.getSeconds()

  // Prochain check à la minute 0 de la prochaine heure
  const msToNextHour =
    ((59 - minute) * 60 + (60 - second)) * 1000

  return Math.max(msToNextHour, 60000) // sécurité mini 1 min
}

export default function ThemeToggle({ currentTheme, onThemeChange, lang = 'fr' }) {
  const { t } = useLanguage()
  const [autoTheme, setAutoTheme] = useState(false)
  const [currentHour, setCurrentHour] = useState(new Date().getHours())
  const initializedRef = useRef(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const init = async () => {
      try {
        let saved = null

        if (window.electronAPI?.storeGet) {
          saved = await window.electronAPI.storeGet(STORAGE_KEY)
        }

        // Migration depuis localStorage (une seule fois)
        if (saved === undefined || saved === null) {
          const legacy = localStorage.getItem('sounddeck-auto-theme')
          if (legacy !== null) {
            saved = legacy === 'true'
            await window.electronAPI?.storeSet?.(STORAGE_KEY, saved)
            try { localStorage.removeItem('sounddeck-auto-theme') } catch (e) {}
          }
        }

        const isAuto = saved === true
        setAutoTheme(isAuto)

        if (isAuto) {
          applyAutoTheme()
        }
      } catch (e) {
        console.warn('[ThemeToggle] Erreur init:', e)
      }
    }

    init()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!autoTheme) return

    const scheduleNextCheck = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      timeoutRef.current = setTimeout(() => {
        const hour = new Date().getHours()
        setCurrentHour(hour)
        applyAutoTheme()
        scheduleNextCheck()
      }, msUntilNextThemeCheck())
    }

    scheduleNextCheck()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTheme])

  const applyAutoTheme = () => {
    const hour = new Date().getHours()
    const isNight = hour < 6 || hour > 19
    const theme = isNight ? 'dark' : 'light'
    onThemeChange(theme)
  }

  const toggleAutoTheme = async () => {
    const newState = !autoTheme
    setAutoTheme(newState)

    try {
      await window.electronAPI?.storeSet?.(STORAGE_KEY, newState)
    } catch (e) {
      console.warn('[ThemeToggle] Erreur save:', e)
    }

    if (newState) {
      applyAutoTheme()
    }
  }

  const hour = new Date().getHours()
  const isNight = hour < 6 || hour > 19
  const timeEmoji = isNight ? '🌙' : '☀️'

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        onClick={toggleAutoTheme}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 12,
          border: `2px solid ${autoTheme ? 'var(--accent)' : 'var(--border)'}`,
          background: autoTheme ? 'var(--accent-light)' : 'var(--bg-tertiary)',
          color: autoTheme ? 'var(--accent)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: autoTheme ? 600 : 400,
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ fontSize: 16 }}>{timeEmoji}</span>
        {autoTheme ? t('themeAutoOn') : t('themeAutoOff')}
        {autoTheme && (
          <span style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            background: 'var(--bg-tertiary)',
            padding: '0 6px',
            borderRadius: 10,
          }}>
            {isNight ? `🌙 ${t('themeNight')}` : `☀️ ${t('themeDay')}`}
          </span>
        )}
      </button>
    </div>
  )
}