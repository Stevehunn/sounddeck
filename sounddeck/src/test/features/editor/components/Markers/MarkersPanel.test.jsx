import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

// Mock appStorage
const mockGetBoolean = vi.hoisted(() => vi.fn().mockResolvedValue(false))
const mockSetItem = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@shared/utils/appStorage', () => ({
  getBoolean: mockGetBoolean,
  setItem: mockSetItem,
}))

// Mock MarkerItem
vi.mock('@features/editor/components/Markers/MarkerItem', () => ({
  default: ({ marker, onRemove, onUpdate, onNavigate }) => (
    <div data-testid={`mock-marker-${marker.id}`}>
      {marker.name}@{marker.time}
      <button
        data-testid={`mock-marker-${marker.id}-remove`}
        onClick={() => onRemove?.(marker.id)}
      >
        rm
      </button>
      <button
        data-testid={`mock-marker-${marker.id}-update`}
        onClick={() => onUpdate?.(marker.id, { name: 'Updated' })}
      >
        upd
      </button>
      <button
        data-testid={`mock-marker-${marker.id}-nav`}
        onClick={() => onNavigate?.(marker.time)}
      >
        nav
      </button>
    </div>
  ),
}))

import MarkersPanel from '@features/editor/components/Markers/MarkersPanel'

describe('MarkersPanel', () => {
  let tr
  let onAddMarker
  let onRemoveMarker
  let onUpdateMarker
  let onNavigateToMarker
  let onAutoOpenChange

  const defaultProps = () => ({
    markers: [],
    onAddMarker,
    onRemoveMarker,
    onUpdateMarker,
    onNavigateToMarker,
    currentTime: 0,
    totalDuration: 60,
    tr,
    onAutoOpenChange,
  })

  // ✅ FIX : helper pour récupérer uniquement les wrappers de markers
  //    (pas les boutons internes `mock-marker-m1-remove` etc.)
  const getMarkerWrappers = (container) =>
    Array.from(
      container.querySelectorAll('[data-testid^="mock-marker-"]')
    ).filter((el) => {
      const tid = el.getAttribute('data-testid')
      return (
        !tid.endsWith('-remove') &&
        !tid.endsWith('-update') &&
        !tid.endsWith('-nav')
      )
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBoolean.mockResolvedValue(false)
    mockSetItem.mockResolvedValue(undefined)

    tr = vi.fn((key, params) => {
      if (params && typeof params === 'object') {
        return `${key}:${JSON.stringify(params)}`
      }
      return key
    })
    onAddMarker = vi.fn()
    onRemoveMarker = vi.fn()
    onUpdateMarker = vi.fn()
    onNavigateToMarker = vi.fn()
    onAutoOpenChange = vi.fn()
  })

  // ─── État sans onAddMarker ─────────────────────────────────────

  describe('sans onAddMarker', () => {
    it('devrait afficher un message "not available"', () => {
      const { container } = render(
        <MarkersPanel {...defaultProps()} onAddMarker={undefined} />
      )
      expect(container.textContent).toContain('editorMarkersNotAvailable')
    })
  })

  // ─── Rendu de base ─────────────────────────────────────────────

  describe('rendu de base', () => {
    it('devrait afficher le titre Marqueurs', () => {
      const { container } = render(<MarkersPanel {...defaultProps()} />)
      expect(container.textContent).toContain('editorMarkers')
    })

    it('devrait afficher le compteur (0)', () => {
      const { container } = render(<MarkersPanel {...defaultProps()} />)
      expect(container.textContent).toContain('(0)')
    })

    it('devrait avoir un bouton Ajouter', () => {
      const { getByTestId } = render(<MarkersPanel {...defaultProps()} />)
      expect(getByTestId('editor-markers-add-button')).toBeInTheDocument()
    })

    it('devrait afficher "Aucun marqueur" si markers vide', () => {
      const { container } = render(<MarkersPanel {...defaultProps()} />)
      expect(container.textContent).toContain('markersEmpty')
    })

    it('devrait afficher le hint Ctrl+M', () => {
      const { container } = render(<MarkersPanel {...defaultProps()} />)
      expect(container.textContent).toContain('editorAddMarkerHint')
    })
  })

  // ─── Liste de markers ──────────────────────────────────────────

  describe('liste de markers', () => {
    const markers = [
      { id: 'm1', name: 'Intro', time: 5, color: '#3b82f6' },
      { id: 'm2', name: 'Drop', time: 15, color: '#ef4444' },
      { id: 'm3', name: 'Refrain', time: 10, color: '#22c55e' },
    ]

    it('devrait rendre chaque marker via MarkerItem', () => {
      const { getByTestId } = render(
        <MarkersPanel {...defaultProps()} markers={markers} />
      )
      expect(getByTestId('mock-marker-m1')).toBeInTheDocument()
      expect(getByTestId('mock-marker-m2')).toBeInTheDocument()
      expect(getByTestId('mock-marker-m3')).toBeInTheDocument()
    })

    // ✅ FIX : filtrer les wrappers pour ne garder que les markers
    it('devrait trier par time croissant', () => {
      const { container } = render(
        <MarkersPanel {...defaultProps()} markers={markers} />
      )
      const items = getMarkerWrappers(container)
      // Ordre attendu : m1 (5s), m3 (10s), m2 (15s)
      expect(items[0].getAttribute('data-testid')).toBe('mock-marker-m1')
      expect(items[1].getAttribute('data-testid')).toBe('mock-marker-m3')
      expect(items[2].getAttribute('data-testid')).toBe('mock-marker-m2')
    })

    it('devrait afficher le compteur actualisé', () => {
      const { container } = render(
        <MarkersPanel {...defaultProps()} markers={markers} />
      )
      expect(container.textContent).toContain('(3)')
    })

    it('devrait transmettre onRemoveMarker', () => {
      const { getByTestId } = render(
        <MarkersPanel {...defaultProps()} markers={markers} />
      )
      fireEvent.click(getByTestId('mock-marker-m1-remove'))
      expect(onRemoveMarker).toHaveBeenCalledWith('m1')
    })

    it('devrait transmettre onUpdateMarker', () => {
      const { getByTestId } = render(
        <MarkersPanel {...defaultProps()} markers={markers} />
      )
      fireEvent.click(getByTestId('mock-marker-m1-update'))
      expect(onUpdateMarker).toHaveBeenCalledWith('m1', { name: 'Updated' })
    })

    it('devrait transmettre onNavigateToMarker', () => {
      const { getByTestId } = render(
        <MarkersPanel {...defaultProps()} markers={markers} />
      )
      fireEvent.click(getByTestId('mock-marker-m1-nav'))
      expect(onNavigateToMarker).toHaveBeenCalledWith(5)
    })
  })

  // ─── Formulaire d'ajout ────────────────────────────────────────

  describe('formulaire d\'ajout', () => {
    it('devrait afficher le formulaire au click Ajouter', () => {
      const { getByTestId } = render(<MarkersPanel {...defaultProps()} />)
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const input = getByTestId('editor-marker-name-input')
      expect(input).toBeInTheDocument()
    })

    it('devrait pré-remplir le nom avec Marker N', () => {
      const { getByTestId } = render(
        <MarkersPanel
          {...defaultProps()}
          markers={[{ id: 'm1' }, { id: 'm2' }]}
        />
      )
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const input = getByTestId('editor-marker-name-input')
      expect(input.value).toBe('Marker 3')
    })

    it('devrait init le temps à currentTime', () => {
      const { getByTestId, container } = render(
        <MarkersPanel {...defaultProps()} currentTime={12.5} />
      )
      fireEvent.click(getByTestId('editor-markers-add-button'))

      expect(container.textContent).toContain('12.5')
    })

    it('devrait masquer le formulaire au click Annuler', () => {
      const { getByTestId, queryByTestId } = render(
        <MarkersPanel {...defaultProps()} />
      )
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const cancelBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent === 'cancel'
      )
      fireEvent.click(cancelBtn)

      expect(queryByTestId('editor-marker-name-input')).toBeNull()
    })

    it('devrait valider au Enter dans le nom', () => {
      const { getByTestId } = render(
        <MarkersPanel {...defaultProps()} currentTime={5} />
      )
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const input = getByTestId('editor-marker-name-input')
      fireEvent.change(input, { target: { value: 'Mon marker' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onAddMarker).toHaveBeenCalledWith({
        name: 'Mon marker',
        time: 5,
        color: '#3b82f6',
      })
    })

    it('devrait annuler au Escape dans le nom', () => {
      const { getByTestId, queryByTestId } = render(
        <MarkersPanel {...defaultProps()} />
      )
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const input = getByTestId('editor-marker-name-input')
      fireEvent.keyDown(input, { key: 'Escape' })

      expect(queryByTestId('editor-marker-name-input')).toBeNull()
    })

    it('devrait clamper le time à [0, totalDuration]', () => {
      const { getByTestId } = render(
        <MarkersPanel {...defaultProps()} currentTime={999} totalDuration={60} />
      )
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const input = getByTestId('editor-marker-name-input')
      fireEvent.change(input, { target: { value: 'X' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onAddMarker).toHaveBeenCalledWith(
        expect.objectContaining({ time: 60 })
      )
    })

    it('devrait utiliser "Marker N" si nom vide', () => {
      const { getByTestId } = render(<MarkersPanel {...defaultProps()} />)
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const input = getByTestId('editor-marker-name-input')
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onAddMarker).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Marker 1' })
      )
    })

    it('devrait fermer le formulaire après ajout', () => {
      const { getByTestId, queryByTestId } = render(
        <MarkersPanel {...defaultProps()} />
      )
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const input = getByTestId('editor-marker-name-input')
      fireEvent.change(input, { target: { value: 'X' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(queryByTestId('editor-marker-name-input')).toBeNull()
    })
  })

  // ─── Sélection de couleur ──────────────────────────────────────

  describe('sélection de couleur', () => {
    it('devrait avoir 10 couleurs par défaut', () => {
      const { getByTestId, container } = render(
        <MarkersPanel {...defaultProps()} />
      )
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const colorBtns = container.querySelectorAll('button[title="red"]')
      expect(colorBtns.length).toBeGreaterThan(0)
    })

    it('devrait changer la couleur au click', () => {
      const { getByTestId } = render(<MarkersPanel {...defaultProps()} />)
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const redBtn = document.querySelector('button[title="red"]')
      fireEvent.click(redBtn)

      const input = getByTestId('editor-marker-name-input')
      fireEvent.change(input, { target: { value: 'X' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onAddMarker).toHaveBeenCalledWith(
        expect.objectContaining({ color: '#ef4444' })
      )
    })

    it('devrait avoir un bouton "+" pour couleur personnalisée', () => {
      const { getByTestId } = render(<MarkersPanel {...defaultProps()} />)
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const customBtn = document.querySelector(
        'button[title="Couleur personnalisée"]'
      )
      expect(customBtn).not.toBeNull()
    })

    it('devrait afficher le color picker au click sur "+"', () => {
      const { getByTestId, container } = render(
        <MarkersPanel {...defaultProps()} />
      )
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const customBtn = document.querySelector(
        'button[title="Couleur personnalisée"]'
      )
      fireEvent.click(customBtn)

      const colorInput = container.querySelector('input[type="color"]')
      expect(colorInput).not.toBeNull()
    })
  })

  // ─── Radio "Position" ──────────────────────────────────────────

  describe('radio position', () => {
    it('devrait avoir 2 radios (currentTime / custom)', () => {
      const { getByTestId, container } = render(
        <MarkersPanel {...defaultProps()} />
      )
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const radios = container.querySelectorAll('input[type="radio"]')
      expect(radios.length).toBe(2)
    })

    it('devrait avoir "Position actuelle" coché par défaut', () => {
      const { getByTestId, container } = render(
        <MarkersPanel {...defaultProps()} />
      )
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const radios = container.querySelectorAll('input[type="radio"]')
      expect(radios[0].checked).toBe(true)
    })

    it('devrait afficher un input number si mode custom', () => {
      const { getByTestId, container } = render(
        <MarkersPanel {...defaultProps()} />
      )
      fireEvent.click(getByTestId('editor-markers-add-button'))

      const radios = container.querySelectorAll('input[type="radio"]')
      fireEvent.click(radios[1])

      const numberInput = container.querySelector('input[type="number"]')
      expect(numberInput).not.toBeNull()
    })
  })

  // ─── Auto-open toggle ──────────────────────────────────────────

  describe('auto-open toggle', () => {
    it('devrait charger la valeur depuis appStorage au mount', async () => {
      mockGetBoolean.mockResolvedValue(true)

      const { container } = render(<MarkersPanel {...defaultProps()} />)

      await act(async () => {
        await Promise.resolve()
      })

      expect(mockGetBoolean).toHaveBeenCalledWith(
        'sounddeck_markers_auto_open',
        false
      )
      expect(container.textContent).toContain('🟢 ON')
    })

    it('devrait appeler setItem au toggle', async () => {
      const { container } = render(<MarkersPanel {...defaultProps()} />)

      await act(async () => {
        await Promise.resolve()
      })

      const checkbox = container.querySelector('input[type="checkbox"]')
      fireEvent.click(checkbox)

      await act(async () => {
        await Promise.resolve()
      })

      expect(mockSetItem).toHaveBeenCalledWith(
        'sounddeck_markers_auto_open',
        true
      )
    })

    // ✅ FIX : flush plus de microtasks après le click (handler async)
    it('devrait appeler onAutoOpenChange au toggle', async () => {
      const { container } = render(<MarkersPanel {...defaultProps()} />)

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      const checkbox = container.querySelector('input[type="checkbox"]')

      await act(async () => {
        fireEvent.click(checkbox)
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(onAutoOpenChange).toHaveBeenCalledWith(true)
    })

    it('ne devrait PAS appeler onAutoOpenChange au mount', async () => {
      render(<MarkersPanel {...defaultProps()} />)

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(onAutoOpenChange).not.toHaveBeenCalled()
    })

    it('devrait gérer une erreur setItem sans crash', async () => {
      mockSetItem.mockRejectedValue(new Error('storage error'))
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { container } = render(<MarkersPanel {...defaultProps()} />)

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      const checkbox = container.querySelector('input[type="checkbox"]')

      await act(async () => {
        fireEvent.click(checkbox)
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(container.textContent).toContain('🟢 ON')
      consoleSpy.mockRestore()
    })

    it('devrait afficher OFF par défaut', async () => {
      const { container } = render(<MarkersPanel {...defaultProps()} />)

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(container.textContent).toContain('🔴 OFF')
    })
  })

  // ─── displayName ───────────────────────────────────────────────

  it('devrait avoir displayName MarkersPanel', () => {
    expect(MarkersPanel.displayName).toBe('MarkersPanel')
  })
})