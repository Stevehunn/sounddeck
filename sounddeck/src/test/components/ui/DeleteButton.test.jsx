import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import DeleteButton from '@shared/components/ui/DeleteButton'

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key, params) => {
      const translations = {
        delete: 'Supprimer',
        cancel: 'Annuler',
        confirmDeleteSound: 'Confirmer la suppression',
        confirmDeleteMessage: 'Cette action est irréversible. Voulez-vous vraiment continuer ?',
      }
      let result = translations[key] || key
      if (params && typeof params === 'object') {
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        }
      }
      return result
    },
    currentLang: 'fr',
    changeLanguage: vi.fn(),
    isLoading: false,
    subscribe: vi.fn(() => () => {}),
    languages: [],
  })),
}))

// ─── Mock useConfirm ────────────────────────────────────────────────────
const mockConfirm = vi.fn()
vi.mock('@shared/hooks/useConfirm', () => ({
  default: vi.fn(() => ({
    confirm: mockConfirm,
    ConfirmWrapper: () => null,
  })),
}))

describe('DeleteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(true)
  })

  const defaultProps = {
    onDelete: vi.fn(),
  }

  const renderButton = (props = {}) => {
    return render(<DeleteButton {...defaultProps} {...props} />)
  }

  // ─── RENDU DE BASE ────────────────────────────────────────────────────

  it('devrait rendre le bouton avec la classe delete-button', () => {
    renderButton()
    expect(document.querySelector('.delete-button')).toBeInTheDocument()
  })

  it('devrait afficher l\'icône ti-trash par défaut', () => {
    renderButton()
    expect(document.querySelector('.ti-trash')).toBeInTheDocument()
  })

  it('devrait avoir un title "Supprimer" par défaut', () => {
    renderButton()
    const button = document.querySelector('.delete-button')
    expect(button.title).toBe('Supprimer')
  })

  it('ne devrait pas afficher le label par défaut (showLabel=false)', () => {
    renderButton()
    // Le title existe mais pas le texte visible
    const button = document.querySelector('.delete-button')
    expect(button.textContent.trim()).toBe('')
  })

  // ─── VARIANTES ────────────────────────────────────────────────────────

  it('devrait appliquer le variant "ghost-danger" par défaut', () => {
    renderButton()
    const button = document.querySelector('.delete-button')
    // Variant ghost-danger → borderRadius + padding spécifiques
    expect(button.style.padding).toBe('4px 8px')
  })

  it('devrait appliquer le variant "outline"', () => {
    renderButton({ variant: 'outline' })
    const button = document.querySelector('.delete-button')
    expect(button.style.borderColor).toBe('var(--danger)')
  })

  it('devrait appliquer le variant "danger"', () => {
    renderButton({ variant: 'danger' })
    const button = document.querySelector('.delete-button')
    // Variant danger → background var(--danger)
    expect(button.style.backgroundColor).toBe('var(--danger)')
  })

  // ─── TAILLES ──────────────────────────────────────────────────────────

  it('devrait appliquer la taille "lg"', () => {
    renderButton({ size: 'lg' })
    const button = document.querySelector('.delete-button')
    expect(button.style.padding).toBe('8px 16px')
  })

  it('devrait appliquer la taille "md"', () => {
    renderButton({ size: 'md' })
    const button = document.querySelector('.delete-button')
    expect(button.style.padding).toBe('6px 12px')
  })

  it('devrait utiliser la taille "sm" par défaut', () => {
    renderButton()
    const button = document.querySelector('.delete-button')
    expect(button.style.padding).toBe('4px 8px')
  })

  // ─── ICÔNE ET LABEL ───────────────────────────────────────────────────

  it('devrait accepter une icône custom', () => {
    renderButton({ icon: 'ti-x' })
    expect(document.querySelector('.ti-x')).toBeInTheDocument()
  })

  it('devrait afficher le label si showLabel=true', () => {
    renderButton({ showLabel: true })
    const button = document.querySelector('.delete-button')
    expect(button.textContent).toContain('Supprimer')
  })

  it('devrait utiliser label custom si fourni', () => {
    renderButton({ label: 'Retirer', showLabel: true })
    const button = document.querySelector('.delete-button')
    expect(button.textContent).toContain('Retirer')
  })

  // ─── DISABLED ─────────────────────────────────────────────────────────

  it('devrait être désactivé si disabled=true', () => {
    renderButton({ disabled: true })
    const button = document.querySelector('.delete-button')
    expect(button).toBeDisabled()
  })

  it('devrait avoir opacity 0.5 si désactivé', () => {
    renderButton({ disabled: true })
    const button = document.querySelector('.delete-button')
    expect(button.style.opacity).toBe('0.5')
  })

  // ─── FLOW DE CONFIRMATION ─────────────────────────────────────────────

  it('devrait appeler confirm au clic', async () => {
    renderButton()

    await act(async () => {
      fireEvent.click(document.querySelector('.delete-button'))
    })

    expect(mockConfirm).toHaveBeenCalled()
  })

  it('devrait appeler onDelete si confirm retourne true', async () => {
    const onDelete = vi.fn()
    mockConfirm.mockResolvedValue(true)
    renderButton({ onDelete })

    await act(async () => {
      fireEvent.click(document.querySelector('.delete-button'))
    })

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledTimes(1)
    })
  })

  it('ne devrait PAS appeler onDelete si confirm retourne false', async () => {
    const onDelete = vi.fn()
    mockConfirm.mockResolvedValue(false)
    renderButton({ onDelete })

    await act(async () => {
      fireEvent.click(document.querySelector('.delete-button'))
    })

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled()
    })
    expect(onDelete).not.toHaveBeenCalled()
  })

  // ─── CALLBACKS ────────────────────────────────────────────────────────

  it('devrait appeler onConfirmStart et onConfirmEnd', async () => {
    const onConfirmStart = vi.fn()
    const onConfirmEnd = vi.fn()
    renderButton({ onConfirmStart, onConfirmEnd })

    await act(async () => {
      fireEvent.click(document.querySelector('.delete-button'))
    })

    expect(onConfirmStart).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(onConfirmEnd).toHaveBeenCalledTimes(1)
    })
  })

  // ─── INTERPOLATION DU MESSAGE ─────────────────────────────────────────

  it('devrait interpoler {name} dans le message de confirmation', async () => {
    renderButton({
      itemName: 'Mon Son',
      confirmMessage: 'Supprimer {name} ?',
    })

    await act(async () => {
      fireEvent.click(document.querySelector('.delete-button'))
    })

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Supprimer Mon Son ?',
      })
    )
  })

  it('devrait ajouter le nom à la fin si pas de placeholder', async () => {
    renderButton({
      itemName: 'Mon Son',
      confirmMessage: 'Voulez-vous continuer ?',
    })

    await act(async () => {
      fireEvent.click(document.querySelector('.delete-button'))
    })

    const callArg = mockConfirm.mock.calls[0][0]
    expect(callArg.message).toContain('Mon Son')
  })

  // ─── STYLE CUSTOM ─────────────────────────────────────────────────────

  it('devrait fusionner le style custom', () => {
    renderButton({ style: { marginTop: 10 } })
    const button = document.querySelector('.delete-button')
    expect(button.style.marginTop).toBe('10px')
  })

  it('devrait accepter une className custom', () => {
    renderButton({ className: 'my-custom-class' })
    expect(document.querySelector('.my-custom-class')).toBeInTheDocument()
  })
})