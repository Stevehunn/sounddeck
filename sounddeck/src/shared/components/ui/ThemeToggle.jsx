// src/shared/components/ui/ThemeToggle.jsx
import { useState, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

export default function ThemeToggle({ currentTheme, onThemeChange, lang = 'fr' }) {
  const { t, currentLang } = useLanguage()
  const [autoTheme, setAutoTheme] = useState(false)
  const [currentHour, setCurrentHour] = useState(new Date().getHours())

  useEffect(() => {
    const savedAuto = localStorage.getItem('sounddeck-auto-theme') === 'true'
    setAutoTheme(savedAuto)

    if (savedAuto) {
      applyAutoTheme()
    }

    const interval = setInterval(() => {
      const hour = new Date().getHours()
      setCurrentHour(hour)
      if (autoTheme) {
        applyAutoTheme()
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const applyAutoTheme = () => {
    const hour = new Date().getHours()
    const isNight = hour < 6 || hour > 19
    const theme = isNight ? 'dark' : 'light'
    onThemeChange(theme)
  }

  const toggleAutoTheme = () => {
    const newState = !autoTheme
    setAutoTheme(newState)
    localStorage.setItem('sounddeck-auto-theme', String(newState))

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
          transition: 'all 0.15s ease'
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
            borderRadius: 10
          }}>
            {isNight ? `🌙 ${t('themeNight')}` : `☀️ ${t('themeDay')}`}
          </span>
        )}
      </button>
    </div>
  )
}