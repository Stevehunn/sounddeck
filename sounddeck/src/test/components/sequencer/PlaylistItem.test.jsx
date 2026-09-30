import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PlaylistItem from '@features/sequencer/components/PlaylistItem'

// ─── Mock i18n ──────────────────────────────────────────────────────────
vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => {
      const translations = {
        editorNoSound: 'Son introuvable',
        playing: 'En cours de lecture...',
        delayAfter: 'Délai après',
        delete: 'Supprimer',
      }
      return translations[key] || key
    },
    currentLang: 'fr',
    changeLanguage: vi.fn(),
    isLoading: false,
    subscribe: vi.fn(() => () => {}),
    languages: [],
  })),
}))

// ─── Mock buildFileUrl ──────────────────────────────────────────────────
vi.mock('@shared/utils/fileUrl', () => ({
  buildFileUrl: vi.fn((p) => (p ? `sounddeck-local://file/${p}` : null)),
}))

describe('PlaylistItem', () => {
  const defaultSound = {
    id: 'sound-1',
    name: 'Mon Son',
    emoji: '🔊',
    image: null,
  }

  const defaultItem = {
    id: 'item-1',
    soundId: 'sound-1',
    delay: 0,
  }

  const defaultProps = {
    item: defaultItem,
    idx: 0,
    sound: defaultSound,
    isActive: false,
    isDragOver: false,
    currentProgress: null,
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onDragOver: vi.fn(),
    onDragLeave: vi.fn(),
    onDrop: vi.fn(),
    onUpdateItem: vi.fn(),
    onRemove: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderItem = (props = {}) => {
    return render(<PlaylistItem {...defaultProps} {...props} />)
  }

  // ─── RENDU DE BASE ────────────────────────────────────────────────────

  it('devrait rendre le conteneur avec le bon data-testid', () => {
    renderItem()
    expect(screen.getByTestId('playlist-item-item-1')).toBeInTheDocument()
  })

  it('devrait afficher le nom du son', () => {
    renderItem()
    expect(screen.getByText('Mon Son')).toBeInTheDocument()
  })

  it('devrait afficher l\'emoji si pas d\'image', () => {
    renderItem()
    expect(screen.getByText('🔊')).toBeInTheDocument()
  })

  it('devrait afficher une image si le son en a une', () => {
    renderItem({
      sound: { ...defaultSound, image: 'C:/path/img.jpg' },
    })
    const img = document.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img.src).toContain('sounddeck-local://')
  })

  it('devrait afficher un emoji par défaut si sound.emoji absent', () => {
    renderItem({ sound: { ...defaultSound, emoji: null } })
    expect(screen.getByText('🔊')).toBeInTheDocument()
  })

  it('devrait afficher le numéro d\'index (idx+1)', () => {
    renderItem({ idx: 2 })
    // Le numéro apparaît dans un <span>
    const spans = document.querySelectorAll('span')
    const numberSpan = Array.from(spans).find((s) => s.textContent === '3')
    expect(numberSpan).toBeInTheDocument()
  })

  // ─── SON INTROUVABLE ──────────────────────────────────────────────────

  it('devrait afficher "editorNoSound" si sound absent', () => {
    renderItem({ sound: null })
    expect(screen.getByText('Son introuvable')).toBeInTheDocument()
  })

  it('devrait afficher un emoji par défaut si sound absent', () => {
    renderItem({ sound: null })
    expect(screen.getByText('🔊')).toBeInTheDocument()
  })

  // ─── DRAG & DROP ──────────────────────────────────────────────────────

  it('devrait être draggable', () => {
    renderItem()
    const el = screen.getByTestId('playlist-item-item-1')
    expect(el.getAttribute('draggable')).toBe('true')
  })

  it('devrait appeler onDragStart au début du drag', () => {
    const onDragStart = vi.fn()
    renderItem({ onDragStart })

    fireEvent.dragStart(screen.getByTestId('playlist-item-item-1'))
    expect(onDragStart).toHaveBeenCalledWith(expect.any(Object), 0)
  })

  it('devrait appeler onDragEnd à la fin du drag', () => {
    const onDragEnd = vi.fn()
    renderItem({ onDragEnd })

    fireEvent.dragEnd(screen.getByTestId('playlist-item-item-1'))
    expect(onDragEnd).toHaveBeenCalled()
  })

  it('devrait appeler onDragOver', () => {
    const onDragOver = vi.fn()
    renderItem({ onDragOver })

    fireEvent.dragOver(screen.getByTestId('playlist-item-item-1'))
    expect(onDragOver).toHaveBeenCalledWith(expect.any(Object), 0)
  })

  it('devrait appeler onDragLeave', () => {
    const onDragLeave = vi.fn()
    renderItem({ onDragLeave })

    fireEvent.dragLeave(screen.getByTestId('playlist-item-item-1'))
    expect(onDragLeave).toHaveBeenCalled()
  })

  it('devrait appeler onDrop avec le bon index', () => {
    const onDrop = vi.fn()
    renderItem({ onDrop, idx: 3 })

    fireEvent.drop(screen.getByTestId('playlist-item-item-1'))
    expect(onDrop).toHaveBeenCalledWith(expect.any(Object), 3)
  })

  // ─── IS DRAG OVER ─────────────────────────────────────────────────────

  it('devrait appliquer la classe "drag-over" si isDragOver=true', () => {
    renderItem({ isDragOver: true })
    const el = screen.getByTestId('playlist-item-item-1')
    expect(el.className).toContain('drag-over')
  })

  it('devrait afficher l\'indicateur visuel en drag-over', () => {
    renderItem({ isDragOver: true })
    // L'indicateur a un style particulier (border-top -2px)
    const el = screen.getByTestId('playlist-item-item-1')
    const indicator = el.querySelector('div[style*="height: 3px"]')
    expect(indicator).toBeInTheDocument()
  })

  // ─── IS ACTIVE ────────────────────────────────────────────────────────

  it('devrait appliquer la classe "active" si isActive=true', () => {
    renderItem({ isActive: true })
    const el = screen.getByTestId('playlist-item-item-1')
    expect(el.className).toContain('active')
  })

  it('devrait afficher "playing" si isActive', () => {
    renderItem({ isActive: true })
    expect(screen.getByText('En cours de lecture...')).toBeInTheDocument()
  })

  it('ne devrait PAS afficher "playing" si !isActive', () => {
    renderItem()
    expect(screen.queryByText('En cours de lecture...')).not.toBeInTheDocument()
  })

  it('devrait afficher la progress bar si isActive + currentProgress', () => {
    renderItem({
      isActive: true,
      currentProgress: { current: 2, duration: 5, ratio: 0.4 },
    })
    const progressFill = document.querySelector('.progress-bar .fill')
    expect(progressFill).toBeInTheDocument()
    expect(progressFill.style.width).toBe('40%')
  })

  it('ne devrait PAS afficher la progress bar si !currentProgress', () => {
    renderItem({ isActive: true, currentProgress: null })
    expect(document.querySelector('.progress-bar')).not.toBeInTheDocument()
  })

  // ─── INPUT DÉLAI ──────────────────────────────────────────────────────

  it('devrait afficher un input number avec la valeur delay', () => {
    renderItem({ item: { ...defaultItem, delay: 2.5 } })
    const input = document.querySelector('input[type="number"]')
    expect(input.value).toBe('2.5')
  })

  it('devrait appeler onUpdateItem au changement de delay', () => {
    const onUpdateItem = vi.fn()
    renderItem({ onUpdateItem })

    const input = document.querySelector('input[type="number"]')
    fireEvent.change(input, { target: { value: '5' } })

    expect(onUpdateItem).toHaveBeenCalledWith(0, { delay: 5 })
  })

  it('devrait clamper à 0 les délais négatifs', () => {
    const onUpdateItem = vi.fn()
    renderItem({ onUpdateItem })

    const input = document.querySelector('input[type="number"]')
    fireEvent.change(input, { target: { value: '-10' } })

    expect(onUpdateItem).toHaveBeenCalledWith(0, { delay: 0 })
  })

  it('ne devrait pas propager le click sur l\'input (stopPropagation)', () => {
    renderItem()
    const input = document.querySelector('input[type="number"]')
    // Le composant définit onClick avec stopPropagation — on vérifie juste
    // que ça ne throw pas
    fireEvent.click(input)
    expect(input).toBeInTheDocument()
  })

  // ─── BOUTON SUPPRESSION ──────────────────────────────────────────────

  it('devrait afficher le bouton de suppression (trash)', () => {
    renderItem()
    expect(document.querySelector('.ti-trash')).toBeInTheDocument()
  })

  it('devrait appeler onRemove avec l\'index au clic', () => {
    const onRemove = vi.fn()
    renderItem({ onRemove, idx: 4 })

    const trashBtn = document.querySelector('.ti-trash').closest('button')
    fireEvent.click(trashBtn)

    expect(onRemove).toHaveBeenCalledWith(4)
  })

  it('devrait avoir un title "Supprimer"', () => {
    renderItem()
    const trashBtn = document.querySelector('.ti-trash').closest('button')
    expect(trashBtn.title).toBe('Supprimer')
  })

  // ─── HOVER SUR TRASH ──────────────────────────────────────────────────

  it('devrait changer le style au hover de la trash', () => {
    renderItem()
    const trashBtn = document.querySelector('.ti-trash').closest('button')

    fireEvent.mouseEnter(trashBtn)
    expect(trashBtn.style.color).toBe('var(--danger)')

    fireEvent.mouseLeave(trashBtn)
    expect(trashBtn.style.color).toBe('var(--text-tertiary)')
  })

  // ─── DRAG HANDLE ──────────────────────────────────────────────────────

  it('devrait afficher le grip vertical', () => {
    renderItem()
    expect(document.querySelector('.ti-grip-vertical')).toBeInTheDocument()
  })
})