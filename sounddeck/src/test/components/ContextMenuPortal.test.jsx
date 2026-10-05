// src/test/components/ContextMenuPortal.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ContextMenuPortal from '@shared/components/audio/SoundCard/ContextMenuPortal'

// Valeurs FR (mock i18n retourne les vraies traductions FR)
const FR = {
  menuFavoriteAdd: 'Ajouter aux favoris',
  menuFavoriteRemove: 'Retirer des favoris',
  menuRename: 'Renommer',
  menuVolume: 'Volume',
  menuChangeImage: 'Changer l\'image',
  menuChangeEmoji: 'Changer l\'emoji',
  menuRemoveFromProfile: 'Retirer du profil',
  menuDelete: 'Supprimer définitivement',
}

const defaultProps = (overrides = {}) => ({
  sound: { id: 's1', name: 'Airhorn', emoji: '🔊' },
  isFavorite: false,
  currentProfileId: 'all',
  onClose: vi.fn(),
  onToggleFavorite: vi.fn(),
  onRename: vi.fn(),
  onVolumeOpen: vi.fn(),
  onRemoveFromProfile: null,
  onDelete: vi.fn(),
  onChangeImage: vi.fn(),
  onChangeEmoji: vi.fn(),
  position: { top: 100, left: 100 },
  onHeightMeasured: vi.fn(),
  onDeleteWithConfirm: vi.fn(),
  onRemoveFromProfileWithConfirm: vi.fn(),
  ...overrides,
})

beforeEach(() => {
  global.requestAnimationFrame = vi.fn((cb) => {
    cb()
    return 0
  })
})

// ═══════════════════════════════════════════════════════════════════════
// RENDU
// ═══════════════════════════════════════════════════════════════════════
describe('ContextMenuPortal > Rendu', () => {
  it('affiche le conteneur avec data-testid="context-menu"', () => {
    render(<ContextMenuPortal {...defaultProps()} />)
    expect(screen.getByTestId('context-menu')).toBeInTheDocument()
  })

  it('affiche tous les items principaux', () => {
    render(<ContextMenuPortal {...defaultProps()} />)
    expect(screen.getByText(FR.menuFavoriteAdd)).toBeInTheDocument()
    expect(screen.getByText(FR.menuRename)).toBeInTheDocument()
    expect(screen.getByText(FR.menuVolume)).toBeInTheDocument()
    expect(screen.getByText(FR.menuChangeImage)).toBeInTheDocument()
    expect(screen.getByText(FR.menuChangeEmoji)).toBeInTheDocument()
  })

  it('affiche "Retirer des favoris" si isFavorite=true', () => {
    render(<ContextMenuPortal {...defaultProps({ isFavorite: true })} />)
    expect(screen.getByText(FR.menuFavoriteRemove)).toBeInTheDocument()
    expect(screen.queryByText(FR.menuFavoriteAdd)).not.toBeInTheDocument()
  })

  it('affiche le bouton supprimer', () => {
    render(<ContextMenuPortal {...defaultProps()} />)
    expect(screen.getByText(FR.menuDelete)).toBeInTheDocument()
  })

  it("n'affiche PAS removeFromProfile si currentProfileId === 'all'", () => {
    render(<ContextMenuPortal {...defaultProps({ currentProfileId: 'all' })} />)
    expect(screen.queryByText(FR.menuRemoveFromProfile)).not.toBeInTheDocument()
  })

  it("n'affiche PAS removeFromProfile si onRemoveFromProfile est null", () => {
    render(
      <ContextMenuPortal
        {...defaultProps({
          currentProfileId: 'p1',
          onRemoveFromProfile: null,
        })}
      />
    )
    expect(screen.queryByText(FR.menuRemoveFromProfile)).not.toBeInTheDocument()
  })

  it('affiche removeFromProfile si currentProfileId != "all" ET onRemoveFromProfile fourni', () => {
    render(
      <ContextMenuPortal
        {...defaultProps({
          currentProfileId: 'p1',
          onRemoveFromProfile: vi.fn(),
        })}
      />
    )
    expect(screen.getByText(FR.menuRemoveFromProfile)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════
describe('ContextMenuPortal > Actions', () => {
  it('clic sur favori appelle onToggleFavorite + onClose', () => {
    const onToggleFavorite = vi.fn()
    const onClose = vi.fn()
    render(<ContextMenuPortal {...defaultProps({ onToggleFavorite, onClose })} />)

    fireEvent.click(screen.getByText(FR.menuFavoriteAdd))
    expect(onToggleFavorite).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('clic sur Renommer appelle onRename + onClose', () => {
    const onRename = vi.fn()
    const onClose = vi.fn()
    render(<ContextMenuPortal {...defaultProps({ onRename, onClose })} />)

    fireEvent.click(screen.getByText(FR.menuRename))
    expect(onRename).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('clic sur Volume appelle onVolumeOpen + onClose', () => {
    const onVolumeOpen = vi.fn()
    const onClose = vi.fn()
    render(<ContextMenuPortal {...defaultProps({ onVolumeOpen, onClose })} />)

    fireEvent.click(screen.getByText(FR.menuVolume))
    expect(onVolumeOpen).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('clic sur Changer image appelle onChangeImage', () => {
    const onChangeImage = vi.fn()
    render(<ContextMenuPortal {...defaultProps({ onChangeImage })} />)

    fireEvent.click(screen.getByText(FR.menuChangeImage))
    expect(onChangeImage).toHaveBeenCalled()
  })

  it('clic sur Changer emoji appelle onChangeEmoji', () => {
    const onChangeEmoji = vi.fn()
    render(<ContextMenuPortal {...defaultProps({ onChangeEmoji })} />)

    fireEvent.click(screen.getByText(FR.menuChangeEmoji))
    expect(onChangeEmoji).toHaveBeenCalled()
  })

  it('clic sur Retirer du profil appelle onRemoveFromProfileWithConfirm', () => {
    const onRemoveFromProfileWithConfirm = vi.fn()
    render(
      <ContextMenuPortal
        {...defaultProps({
          currentProfileId: 'p1',
          onRemoveFromProfile: vi.fn(),
          onRemoveFromProfileWithConfirm,
        })}
      />
    )

    fireEvent.click(screen.getByText(FR.menuRemoveFromProfile))
    expect(onRemoveFromProfileWithConfirm).toHaveBeenCalled()
  })

  it('clic sur Supprimer appelle onClose + onDeleteWithConfirm', () => {
    const onClose = vi.fn()
    const onDeleteWithConfirm = vi.fn()
    render(
      <ContextMenuPortal {...defaultProps({ onClose, onDeleteWithConfirm })} />
    )

    fireEvent.click(screen.getByText(FR.menuDelete))
    expect(onClose).toHaveBeenCalled()
    expect(onDeleteWithConfirm).toHaveBeenCalled()
  })

  it('stopPropagation sur clic dans le menu', () => {
    const onClose = vi.fn()
    render(<ContextMenuPortal {...defaultProps({ onClose })} />)

    const menu = screen.getByTestId('context-menu')
    const stopPropagation = vi.fn()
    fireEvent.click(menu, { stopPropagation })
    expect(onClose).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// POSITIONNEMENT
// ═══════════════════════════════════════════════════════════════════════
describe('ContextMenuPortal > Positionnement', () => {
  it('applique les coordonnées de la position initiale', () => {
    render(
      <ContextMenuPortal {...defaultProps({ position: { top: 50, left: 75 } })} />
    )
    const menu = screen.getByTestId('context-menu')
    expect(menu.style.top).toBe('50px')
    expect(menu.style.left).toBe('75px')
  })

  it('mesure la hauteur via onHeightMeasured', async () => {
    const onHeightMeasured = vi.fn()
    const originalGetBCR = Element.prototype.getBoundingClientRect
    // ✅ Cohérent : right = left + width, bottom = top + height
    Element.prototype.getBoundingClientRect = function () {
      const top = parseInt(this.style.top) || 0
      const left = parseInt(this.style.left) || 0
      const width = 220
      const height = 300
      return {
        width, height, top, left,
        right: left + width,
        bottom: top + height,
        x: left, y: top,
      }
    }

    render(<ContextMenuPortal {...defaultProps({ onHeightMeasured })} />)

    await waitFor(() => {
      expect(onHeightMeasured).toHaveBeenCalledWith(300)
    })

    Element.prototype.getBoundingClientRect = originalGetBCR
  })

  it("repositionne si le menu dépasse à droite de l'écran", async () => {
    const origW = window.innerWidth
    const origH = window.innerHeight
    Object.defineProperty(window, 'innerWidth', { value: 300, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 500, configurable: true })

    const originalGetBCR = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      const top = parseInt(this.style.top) || 0
      const left = parseInt(this.style.left) || 0
      const width = 220
      const height = 300
      return {
        width, height, top, left,
        right: left + width,
        bottom: top + height,
        x: left, y: top,
      }
    }

    // Position initiale : left=250, donc right=470 > 300 → doit repositionner
    render(
      <ContextMenuPortal {...defaultProps({ position: { top: 100, left: 250 } })} />
    )

    const menu = screen.getByTestId('context-menu')
    await waitFor(() => {
      const left = parseInt(menu.style.left)
      // window.innerWidth=300 - width=220 - 10 = 70
      expect(left).toBeLessThanOrEqual(70)
    })

    Element.prototype.getBoundingClientRect = originalGetBCR
    Object.defineProperty(window, 'innerWidth', { value: origW, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: origH, configurable: true })
  })

  it('repositionne si le menu dépasse en bas', async () => {
    const origH = window.innerHeight
    Object.defineProperty(window, 'innerHeight', { value: 200, configurable: true })

    const originalGetBCR = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      const top = parseInt(this.style.top) || 0
      const left = parseInt(this.style.left) || 0
      const width = 220
      const height = 350
      return {
        width, height, top, left,
        right: left + width,
        bottom: top + height,
        x: left, y: top,
      }
    }

    // Position initiale : top=150, donc bottom=500 > 200 → doit repositionner
    render(
      <ContextMenuPortal {...defaultProps({ position: { top: 150, left: 50 } })} />
    )

    const menu = screen.getByTestId('context-menu')
    await waitFor(() => {
      const top = parseInt(menu.style.top)
      // window.innerHeight=200 - height=350 - 10 = -160 → Math.max(10, ...) = 10
      expect(top).toBeLessThanOrEqual(10)
    })

    Element.prototype.getBoundingClientRect = originalGetBCR
    Object.defineProperty(window, 'innerHeight', { value: origH, configurable: true })
  })
})