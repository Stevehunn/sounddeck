// src/test/features/options/sections/SupportSection.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

const { mockUseLicense } = vi.hoisted(() => ({
  mockUseLicense: vi.fn(),
}))

vi.mock('@core/store/hooks/useLicense', () => ({
  useLicense: mockUseLicense,
}))

vi.mock('@features/auth/LoginModal', () => ({
  default: ({ onClose, onActivated }) => (
    <div data-testid="login-modal">
      <button onClick={onClose}>close-modal</button>
      <button onClick={() => onActivated('SDCK1.fake', 'a@b.com')}>activate-key</button>
    </div>
  ),
}))

vi.mock('@features/auth/AccountPanel', () => ({
  default: ({ status }) => (
    <div data-testid="account-panel">Account {status?.email || 'no-email'}</div>
  ),
}))

import SupportSection from '@features/options/sections/SupportSection'

describe('SupportSection', () => {
  let addToast
  let activate
  let logout
  let openExternal

  beforeEach(() => {
    vi.clearAllMocks()
    addToast = vi.fn()
    activate = vi.fn().mockResolvedValue({ success: true })
    logout = vi.fn().mockResolvedValue()
    openExternal = vi.fn()
    window.electronAPI = { openExternal }
  })

  const makeFreeStatus = () => ({
    status: { valid: false, tier: 'free', email: null },
    isPro: false,
    loading: false,
    activate,
    logout,
  })

  const makeProStatus = () => ({
    status: { valid: true, tier: 'pro', email: 'a@b.com' },
    isPro: true,
    loading: false,
    activate,
    logout,
  })

  const renderSection = (license) => {
    mockUseLicense.mockReturnValue(license)
    const sectionRef = { current: null }
    return render(<SupportSection sectionRef={sectionRef} addToast={addToast} />)
  }

  // ─── ÉTAT FREE ────────────────────────────────────────────────────
  it('affiche le bouton GitHub Sponsors si pas Pro', () => {
    renderSection(makeFreeStatus())
    expect(screen.getByTestId('support-github-sponsor-btn')).toBeInTheDocument()
    expect(screen.getByText('supportGithubSponsor')).toBeInTheDocument()
  })

  it('affiche le bouton "j\'ai un code" si pas Pro', () => {
    renderSection(makeFreeStatus())
    expect(screen.getByTestId('support-activate-btn')).toBeInTheDocument()
    expect(screen.getByText('authTabCode')).toBeInTheDocument()
  })

  it('cache l\'AccountPanel si pas Pro', () => {
    renderSection(makeFreeStatus())
    expect(screen.queryByTestId('account-panel')).not.toBeInTheDocument()
  })

  it('ouvre l\'URL GitHub Sponsors au clic', () => {
    renderSection(makeFreeStatus())
    fireEvent.click(screen.getByTestId('support-github-sponsor-btn'))
    expect(openExternal).toHaveBeenCalledWith(
      expect.stringContaining('github.com/sponsors')
    )
  })

  it('ouvre la LoginModal au clic "j\'ai un code"', () => {
    renderSection(makeFreeStatus())
    expect(screen.queryByTestId('login-modal')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('support-activate-btn'))
    expect(screen.getByTestId('login-modal')).toBeInTheDocument()
  })

  // ─── ÉTAT PRO ─────────────────────────────────────────────────────
  it('affiche l\'AccountPanel si Pro', () => {
    renderSection(makeProStatus())
    expect(screen.getByTestId('account-panel')).toBeInTheDocument()
    expect(screen.getByText(/a@b\.com/)).toBeInTheDocument()
  })

  it('cache le bouton GitHub Sponsors si Pro', () => {
    renderSection(makeProStatus())
    expect(screen.queryByTestId('support-github-sponsor-btn')).not.toBeInTheDocument()
  })

  // ─── ACTIVATION ───────────────────────────────────────────────────
  it('appelle activate puis ferme la modal', async () => {
    renderSection(makeFreeStatus())

    fireEvent.click(screen.getByTestId('support-activate-btn'))
    expect(screen.getByTestId('login-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByText('activate-key'))

    await waitFor(() => {
      expect(activate).toHaveBeenCalledWith('SDCK1.fake', 'a@b.com')
      expect(addToast).toHaveBeenCalledWith('authManualSuccess', 'success')
    })

    await waitFor(() => {
      expect(screen.queryByTestId('login-modal')).not.toBeInTheDocument()
    })
  })
})