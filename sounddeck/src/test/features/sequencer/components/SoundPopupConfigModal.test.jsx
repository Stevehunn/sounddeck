// src/test/features/sequencer/components/SoundPopupConfigModal.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ─── MOCKS ─────────────────────────────────────────────────────────────
vi.mock('@core/services/SoundPopupService', () => ({
  POPUP_POSITIONS: [
    'top-left', 'top-center', 'top-right',
    'center-left', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right',
  ],
  previewSoundPopup: vi.fn(),
}))

// ✅ i18n mock returns the raw key so assertions are stable regardless
// of the active language. `t('cancel')` → `'cancel'`, etc.
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k) => k,
    currentLang: 'fr',
  }),
}))

import { previewSoundPopup } from '@core/services/SoundPopupService'
import SoundPopupConfigModal from '@features/sequencer/components/SoundPopupConfigModal'

const renderModal = (props = {}) => {
  const onValidate = vi.fn()
  const onClose = vi.fn()
  return {
    onValidate,
    onClose,
    ...render(
      <SoundPopupConfigModal
        initialPosition="top-right"
        cardSize="medium"
        theme="dark"
        customTheme={null}
        onValidate={onValidate}
        onClose={onClose}
        {...props}
      />
    ),
  }
}

beforeEach(() => {
  previewSoundPopup.mockReset()
})

// ═══════════════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════════════
describe('SoundPopupConfigModal > Rendu', () => {
  it('affiche les 8 boutons de position', () => {
    renderModal()

    const positions = [
      'top-left', 'top-center', 'top-right',
      'center-left', 'center-right',
      'bottom-left', 'bottom-center', 'bottom-right',
    ]
    for (const pos of positions) {
      expect(screen.getByTestId(`sound-popup-position-${pos}`)).toBeInTheDocument()
    }
  })

  it('affiche la grille de position', () => {
    renderModal()
    expect(screen.getByTestId('sound-popup-position-grid')).toBeInTheDocument()
  })

  it('affiche la taille de carte utilisée', () => {
    renderModal({ cardSize: 'large' })
    // The component maps `large` → i18n key `cardSizeLarge`. The test mock
    // returns the key as-is, so we assert on the key (same pattern as
    // `getByText('cancel')` below).
    expect(screen.getByText('cardSizeLarge')).toBeInTheDocument()
  })

  it('affiche le bouton Preview', () => {
    renderModal()
    expect(screen.getByTestId('sound-popup-preview-button')).toBeInTheDocument()
  })

  it('affiche le bouton Valider', () => {
    renderModal()
    expect(screen.getByTestId('sound-popup-validate-button')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// SELECTION
// ═══════════════════════════════════════════════════════════════════════
describe('SoundPopupConfigModal > Sélection', () => {
  it('initialPosition est sélectionnée par défaut', () => {
    renderModal({ initialPosition: 'bottom-left' })
    const btn = screen.getByTestId('sound-popup-position-bottom-left')
    expect(btn.style.border).toContain('var(--accent)')
  })

  it('fallback sur top-right si initialPosition invalide', () => {
    renderModal({ initialPosition: 'nope' })
    const btn = screen.getByTestId('sound-popup-position-top-right')
    expect(btn.style.border).toContain('var(--accent)')
  })

  it('clic sur une position change la sélection', () => {
    renderModal({ initialPosition: 'top-right' })
    fireEvent.click(screen.getByTestId('sound-popup-position-bottom-left'))

    const btn = screen.getByTestId('sound-popup-position-bottom-left')
    expect(btn.style.border).toContain('var(--accent)')

    const oldBtn = screen.getByTestId('sound-popup-position-top-right')
    expect(oldBtn.style.border).not.toContain('var(--accent)')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════
describe('SoundPopupConfigModal > Validation', () => {
  it('onValidate reçoit la position initiale si pas de changement', () => {
    const { onValidate } = renderModal({ initialPosition: 'top-left' })

    fireEvent.click(screen.getByTestId('sound-popup-validate-button'))
    expect(onValidate).toHaveBeenCalledWith('top-left')
  })

  it('onValidate reçoit la position sélectionnée', () => {
    const { onValidate } = renderModal({ initialPosition: 'top-right' })

    fireEvent.click(screen.getByTestId('sound-popup-position-bottom-center'))
    fireEvent.click(screen.getByTestId('sound-popup-validate-button'))

    expect(onValidate).toHaveBeenCalledWith('bottom-center')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// PREVIEW
// ═══════════════════════════════════════════════════════════════════════
describe('SoundPopupConfigModal > Preview', () => {
  it('appelle previewSoundPopup avec cardSize + theme', () => {
    renderModal({ cardSize: 'large', theme: 'light' })

    fireEvent.click(screen.getByTestId('sound-popup-preview-button'))

    expect(previewSoundPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        cardSize: 'large',
        theme: 'light',
      })
    )
  })

  it('envoie la position sélectionnée (pas la validée)', () => {
    renderModal({ initialPosition: 'top-right' })

    // The user clicks on top-left
    fireEvent.click(screen.getByTestId('sound-popup-position-top-left'))
    fireEvent.click(screen.getByTestId('sound-popup-preview-button'))

    expect(previewSoundPopup).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'top-left' })
    )
  })

  it('transmet le customTheme', () => {
    const customTheme = { accent: '#FF0000' }
    renderModal({ theme: 'custom', customTheme })

    fireEvent.click(screen.getByTestId('sound-popup-preview-button'))
    expect(previewSoundPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: 'custom',
        customTheme,
      })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════
// CLOSING
// ═══════════════════════════════════════════════════════════════════════
describe('SoundPopupConfigModal > Fermeture', () => {
  it('bouton Annuler appelle onClose', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByText('cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('overlay appelle onClose', () => {
    const { onClose, container } = renderModal()
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('clic sur modal ne ferme PAS', () => {
    const { onClose, container } = renderModal()
    fireEvent.click(container.querySelector('.modal'))
    expect(onClose).not.toHaveBeenCalled()
  })
})