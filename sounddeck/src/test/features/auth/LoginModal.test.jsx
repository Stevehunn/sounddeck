// src/test/features/auth/LoginModal.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@shared/utils/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

import LoginModal from '@features/auth/LoginModal'

describe('LoginModal', () => {
  let onClose
  let onActivated
  let addToast

  beforeEach(() => {
    vi.clearAllMocks()
    onClose = vi.fn()
    onActivated = vi.fn().mockResolvedValue({ success: true })
    addToast = vi.fn()
    global.fetch = vi.fn()
  })

  const renderModal = () =>
    render(<LoginModal onClose={onClose} onActivated={onActivated} addToast={addToast} />)

  // ─── RENDU ────────────────────────────────────────────────────────
  it('affiche le titre et les 3 onglets', () => {
    renderModal()
    expect(screen.getByText('authTitle')).toBeInTheDocument()
    expect(screen.getByText('authTabLogin')).toBeInTheDocument()
    expect(screen.getByText('authTabCode')).toBeInTheDocument()
    expect(screen.getByText('authTabKey')).toBeInTheDocument()
  })

  it('démarre sur l\'onglet login', () => {
    renderModal()
    expect(screen.getByPlaceholderText('authEmailPlaceholder')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('authPasswordPlaceholder')).toBeInTheDocument()
  })

  it('ferme au clic sur l\'overlay', () => {
    renderModal()
    fireEvent.click(document.body.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ne ferme PAS au clic sur la modale', () => {
    renderModal()
    fireEvent.click(document.body.querySelector('.modal'))
    expect(onClose).not.toHaveBeenCalled()
  })

  // ─── BASCULE D'ONGLET ────────────────────────────────────────────
  it('bascule sur l\'onglet "clé manuelle"', () => {
    renderModal()
    fireEvent.click(screen.getByText('authTabKey'))
    expect(screen.getByPlaceholderText('authManualPlaceholder')).toBeInTheDocument()
  })

  // ─── LOGIN ────────────────────────────────────────────────────────
  it('affiche erreur si email vide', () => {
    renderModal()
    fireEvent.click(screen.getByText('authLogin').closest('button'))
    expect(screen.getByText('authErrorEmailRequired')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('affiche erreur si password vide', () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('authEmailPlaceholder'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.click(screen.getByText('authLogin').closest('button'))
    expect(screen.getByText('authErrorPasswordRequired')).toBeInTheDocument()
  })

  it('appelle fetch avec email+password', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'SDCK1.fake.sig', email: 'a@b.com' }),
    })

    renderModal()
    fireEvent.change(screen.getByPlaceholderText('authEmailPlaceholder'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('authPasswordPlaceholder'), {
      target: { value: 'pwd123' },
    })
    fireEvent.click(screen.getByText('authLogin').closest('button'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'a@b.com', password: 'pwd123' }),
        })
      )
      expect(onActivated).toHaveBeenCalledWith('SDCK1.fake.sig', 'a@b.com')
    })
  })

  it('affiche erreur 401', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 401 })
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('authEmailPlaceholder'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('authPasswordPlaceholder'), {
      target: { value: 'wrong' },
    })
    fireEvent.click(screen.getByText('authLogin').closest('button'))

    await waitFor(() => {
      expect(screen.getByText('authErrorInvalidCredentials')).toBeInTheDocument()
    })
  })

  it('affiche erreur réseau si fetch throw', async () => {
    global.fetch.mockRejectedValue(new Error('network'))
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('authEmailPlaceholder'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('authPasswordPlaceholder'), {
      target: { value: 'pwd' },
    })
    fireEvent.click(screen.getByText('authLogin').closest('button'))

    await waitFor(() => {
      expect(screen.getByText('authErrorNetwork')).toBeInTheDocument()
    })
  })

  // ─── CLÉ MANUELLE ────────────────────────────────────────────────
  it('désactive le bouton activer si clé vide', () => {
    renderModal()
    fireEvent.click(screen.getByText('authTabKey'))
    const btn = screen.getByText('authManualActivate').closest('button')
    expect(btn).toBeDisabled()
  })

  it('appelle onActivated avec la clé', async () => {
    renderModal()
    fireEvent.click(screen.getByText('authTabKey'))

    const textarea = screen.getByPlaceholderText('authManualPlaceholder')
    fireEvent.change(textarea, { target: { value: '  SDCK1.fake.sig\n' } })

    fireEvent.click(screen.getByText('authManualActivate').closest('button'))

    await waitFor(() => {
      expect(onActivated).toHaveBeenCalledWith('SDCK1.fake.sig', null)
    })
  })

  it('affiche erreur si activation échoue', async () => {
    onActivated.mockResolvedValueOnce({ success: false, error: 'INVALID_SIGNATURE' })
    renderModal()
    fireEvent.click(screen.getByText('authTabKey'))
    fireEvent.change(screen.getByPlaceholderText('authManualPlaceholder'), {
      target: { value: 'bad-key' },
    })
    fireEvent.click(screen.getByText('authManualActivate').closest('button'))

    await waitFor(() => {
      expect(screen.getByText('authManualInvalid')).toBeInTheDocument()
    })
  })

  // ─── ONGLET CODE ───────────────────────────────────────────────────
  describe('Onglet "J\'ai un code"', () => {
    it('bascule sur l\'onglet code', () => {
      renderModal()
      fireEvent.click(screen.getByText('authTabCode'))
      expect(screen.getByTestId('login-modal-code-input')).toBeInTheDocument()
    })

    it('uppercase automatiquement le code', () => {
      renderModal()
      fireEvent.click(screen.getByText('authTabCode'))
      const input = screen.getByTestId('login-modal-code-input')
      fireEvent.change(input, { target: { value: 'sdck-abc1-def2-ghi3' } })
      expect(input.value).toBe('SDCK-ABC1-DEF2-GHI3')
    })

    it('désactive le bouton si code vide', () => {
      renderModal()
      fireEvent.click(screen.getByText('authTabCode'))
      const btn = screen.getByText('authCodeActivate').closest('button')
      expect(btn).toBeDisabled()
    })

    it('appelle /redeem avec email + password + code', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: 'SDCK1.fake.sig', email: 'x@y.z' }),
      })

      renderModal()
      fireEvent.click(screen.getByText('authTabCode'))
      fireEvent.change(screen.getByPlaceholderText('authEmailPlaceholder'), { target: { value: 'x@y.z' } })
      fireEvent.change(screen.getByPlaceholderText('authPasswordPlaceholder'), { target: { value: 'pass123' } })
      fireEvent.change(screen.getByTestId('login-modal-code-input'), { target: { value: 'SDCK-A3F7-K9M2-P4X8' } })
      fireEvent.click(screen.getByText('authCodeActivate').closest('button'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/redeem'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ email: 'x@y.z', password: 'pass123', code: 'SDCK-A3F7-K9M2-P4X8' }),
          })
        )
        expect(onActivated).toHaveBeenCalledWith('SDCK1.fake.sig', 'x@y.z')
      })
    })

    it('affiche "code expiré" sur code_expired', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 410, json: () => Promise.resolve({ error: 'code_expired' }) })

      renderModal()
      fireEvent.click(screen.getByText('authTabCode'))
      fireEvent.change(screen.getByPlaceholderText('authEmailPlaceholder'), { target: { value: 'x@y.z' } })
      fireEvent.change(screen.getByPlaceholderText('authPasswordPlaceholder'), { target: { value: 'pass123' } })
      fireEvent.change(screen.getByTestId('login-modal-code-input'), { target: { value: 'SDCK-A3F7-K9M2-P4X8' } })
      fireEvent.click(screen.getByText('authCodeActivate').closest('button'))

      await waitFor(() => {
        expect(screen.getByText('authCodeErrorExpired')).toBeInTheDocument()
      })
    })
  })
})