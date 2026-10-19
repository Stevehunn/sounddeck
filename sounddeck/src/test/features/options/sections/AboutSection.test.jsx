// src/test/features/options/sections/AboutSection.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

import AboutSection from '@features/options/sections/AboutSection'

describe('AboutSection', () => {
  let openExternal

  beforeEach(() => {
    openExternal = vi.fn()
    window.electronAPI = { openExternal }
  })

  const renderSection = () => {
    const sectionRef = { current: null }
    return render(<AboutSection sectionRef={sectionRef} />)
  }

  it('affiche la version', () => {
    renderSection()
    expect(screen.getByText(/v1\.4\.11/)).toBeInTheDocument()
  })

  it('affiche la licence MIT', () => {
    renderSection()
    expect(screen.getByText('aboutLicense')).toBeInTheDocument()
    expect(screen.getByText('aboutLicenseValue')).toBeInTheDocument()
  })

  it('affiche le bouton source code', () => {
    renderSection()
    expect(screen.getByText('aboutSourceCode')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
  })

  it('ouvre GitHub au clic', () => {
    renderSection()
    fireEvent.click(screen.getByText('GitHub'))
    expect(openExternal).toHaveBeenCalledWith(
      expect.stringContaining('github.com')
    )
  })

  it('affiche le message "made with love"', () => {
    renderSection()
    expect(screen.getByText('aboutMadeWith')).toBeInTheDocument()
    expect(screen.getByText('aboutOpenSource')).toBeInTheDocument()
  })
})