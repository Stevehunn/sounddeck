// src/test/features/auth/AccountPanel.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

import AccountPanel from '@features/auth/AccountPanel'

const PRO_STATUS = {
  valid: true,
  tier: 'pro',
  rank: 10,
  donorId: 'abc-123',
  donorName: 'Steve',
  email: 'steve@x.com',
  issuedAt: 1735000000,
}

const DEV_STATUS = { ...PRO_STATUS, tier: 'dev' }

describe('AccountPanel', () => {
  let onLogout
  let onLoginClick
  let addToast

  beforeEach(() => {
    vi.clearAllMocks()
    onLogout = vi.fn()
    onLoginClick = vi.fn()
    addToast = vi.fn()
    window.electronAPI = {
      storeGet: vi.fn().mockResolvedValue('SDCK1.xyz.abc'),
    }
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue() },
    })
  })

  const renderPanel = (status) =>
    render(
      <AccountPanel
        status={status}
        onLogout={onLogout}
        onLoginClick={onLoginClick}
        addToast={addToast}
      />
    )

  // ─── RENDU ────────────────────────────────────────────────────────
  it('affiche "Pro" pour tier=pro', () => {
    renderPanel(PRO_STATUS)
    expect(screen.getByText('supportProActive')).toBeInTheDocument()
    expect(screen.getByText('tierPro')).toBeInTheDocument()
  })

  it('affiche "Dev" pour tier=dev', () => {
    renderPanel(DEV_STATUS)
    expect(screen.getByText('supportDevMode')).toBeInTheDocument()
    expect(screen.getByText('tierDev')).toBeInTheDocument()
  })

  it('affiche l\'email', () => {
    renderPanel(PRO_STATUS)
    expect(screen.getByText('steve@x.com')).toBeInTheDocument()
  })

  it('affiche "non connecté" si email null', () => {
    renderPanel({ ...PRO_STATUS, email: null })
    expect(screen.getByText('accountNotConnected')).toBeInTheDocument()
  })

  it('affiche la date d\'activation', () => {
    renderPanel(PRO_STATUS)
    const dateStr = new Date(1735000000 * 1000).toLocaleDateString()
    expect(screen.getByText(dateStr)).toBeInTheDocument()
  })

  // ─── TOKEN ────────────────────────────────────────────────────────
  it('cache le token par défaut', () => {
    renderPanel(PRO_STATUS)
    expect(screen.queryByText('SDCK1.xyz.abc')).not.toBeInTheDocument()
  })

  it('affiche le token au clic "Afficher"', async () => {
    renderPanel(PRO_STATUS)
    fireEvent.click(screen.getByText('accountTokenShow'))
    await waitFor(() => {
      expect(screen.getByText('SDCK1.xyz.abc')).toBeInTheDocument()
    })
  })

  it('copie le token dans le presse-papiers', async () => {
    renderPanel(PRO_STATUS)
    fireEvent.click(screen.getByText('accountTokenShow'))
    await waitFor(() => screen.getByText('SDCK1.xyz.abc'))

    fireEvent.click(screen.getByText('accountTokenCopy'))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('SDCK1.xyz.abc')
      expect(addToast).toHaveBeenCalledWith('accountTokenCopied', 'success')
    })
  })

  // ─── LOGOUT (double-clic pour confirmation) ──────────────────────
  it('appelle onLogout après 2 clics (confirmation)', async () => {
    renderPanel(PRO_STATUS)
    const btn = screen.getByTestId('account-logout-button')

    fireEvent.click(btn)
    expect(onLogout).not.toHaveBeenCalled() // 1er clic = confirmation

    fireEvent.click(btn)
    expect(onLogout).toHaveBeenCalled() // 2e clic = exécute
  })

  // ─── CHANGER DE COMPTE ────────────────────────────────────────────
  it('appelle onLoginClick au clic "Changer de compte"', () => {
    renderPanel(PRO_STATUS)
    fireEvent.click(screen.getByTestId('account-change-button'))
    expect(onLoginClick).toHaveBeenCalled()
  })

  it('appelle onLoginClick au clic "Se connecter" quand non connecté', () => {
    renderPanel({ ...PRO_STATUS, email: null })
    fireEvent.click(screen.getByTestId('account-connect-button'))
    expect(onLoginClick).toHaveBeenCalled()
  })

  // ─── AVERTISSEMENT ────────────────────────────────────────────────
  it('affiche le warning + la note logout', () => {
    renderPanel(PRO_STATUS)
    expect(screen.getByText('accountTokenWarning')).toBeInTheDocument()
    expect(screen.getByText('accountLogoutNote')).toBeInTheDocument()
  })
})