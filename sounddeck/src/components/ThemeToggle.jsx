import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n'

export default function ThemeToggle({ currentTheme, onThemeChange, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [autoTheme, setAutoTheme] = useState(false)
  
  useEffect(() => {
    // Vérifier si le thème automatique est activé
    const savedAuto = localStorage.getItem('sounddeck-auto-theme') === 'true'
    setAutoTheme(savedAuto)
    
    if (savedAuto) {
      applyAutoTheme()
    }
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
  
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        onClick={toggleAutoTheme}
        style={{
          padding: '6px 12px',
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
        <i className="ti ti-sun-moon" style={{ fontSize: 14 }} />
        {autoTheme ? tr('themeAutoOn') : tr('themeAutoOff')}
      </button>
    </div>
  )
}