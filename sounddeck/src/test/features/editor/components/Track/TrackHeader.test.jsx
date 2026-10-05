// src/test/features/editor/components/Track/TrackHeader.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@shared/components/ui', () => ({
  DeleteButton: ({ onDelete }) => (
    <button data-testid="delete-track-btn" onClick={onDelete}>del</button>
  ),
}))

import TrackHeader from '@features/editor/components/Track/TrackHeader'

const makeTrack = (overrides = {}) => ({
  id: 't1',
  name: 'Piste 1',
  clips: [],
  ...overrides,
})

const tr = (k) => {
  const FR = {
    editorDoubleClickToRename: 'Double-cliquer pour renommer',
    confirmDeleteTrack: 'Confirmer la suppression de la piste',
    confirmDeleteTrackMessage: 'Voulez-vous vraiment supprimer cette piste ?',
  }
  return FR[k] || k
}

const defaultProps = (overrides = {}) => ({
  track: makeTrack(),
  trackIndex: 0,
  trackColor: '#7c6ff7',
  isHovering: false,
  selectedTrackId: null,
  onTrackRemove: vi.fn(),
  onRenameTrack: vi.fn(),
  tr,
  ...overrides,
})

const renderHeader = (props = {}) => render(<TrackHeader {...defaultProps(props)} />)

describe('TrackHeader', () => {
  describe('Rendu', () => {
    it('affiche le nom de la piste', () => {
      renderHeader()
      expect(screen.getByText('Piste 1')).toBeInTheDocument()
    })

    it('affiche "Piste N+1" si track.name absent', () => {
      renderHeader({ track: makeTrack({ name: null }), trackIndex: 2 })
      expect(screen.getByText('Piste 3')).toBeInTheDocument()
    })

    it('affiche la barre de couleur', () => {
      const { container } = renderHeader({ trackColor: '#ff0000' })
      const colorBar = container.querySelector('div[style*="width: 3px"]')
      expect(colorBar).toBeInTheDocument()
    })

    it('affiche le bouton supprimer', () => {
      renderHeader()
      expect(screen.getByTestId('delete-track-btn')).toBeInTheDocument()
    })
  })

  describe('Renommage', () => {
    it('double-clic ouvre le mode édition (input)', () => {
      const { container } = renderHeader()
      const nameEl = screen.getByText('Piste 1')
      fireEvent.doubleClick(nameEl)

      const input = container.querySelector('input[type="text"]')
      expect(input).toBeInTheDocument()
      expect(input.value).toBe('Piste 1')
    })

    it('Enter valide le renommage', () => {
      const onRenameTrack = vi.fn()
      const { container } = renderHeader({ onRenameTrack })

      fireEvent.doubleClick(screen.getByText('Piste 1'))
      const input = container.querySelector('input[type="text"]')

      fireEvent.change(input, { target: { value: 'Batterie' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onRenameTrack).toHaveBeenCalledWith('t1', 'Batterie')
    })

    it('blur valide le renommage', () => {
      const onRenameTrack = vi.fn()
      const { container } = renderHeader({ onRenameTrack })

      fireEvent.doubleClick(screen.getByText('Piste 1'))
      const input = container.querySelector('input[type="text"]')

      fireEvent.change(input, { target: { value: 'Voix' } })
      fireEvent.blur(input)

      expect(onRenameTrack).toHaveBeenCalledWith('t1', 'Voix')
    })

    it('Escape annule et restaure le nom', () => {
      const onRenameTrack = vi.fn()
      const { container } = renderHeader({ onRenameTrack })

      fireEvent.doubleClick(screen.getByText('Piste 1'))
      const input = container.querySelector('input[type="text"]')

      fireEvent.change(input, { target: { value: 'XXX' } })
      fireEvent.keyDown(input, { key: 'Escape' })

      expect(onRenameTrack).not.toHaveBeenCalled()
      expect(screen.getByText('Piste 1')).toBeInTheDocument()
    })

    it('trim le nom avant validation', () => {
      const onRenameTrack = vi.fn()
      const { container } = renderHeader({ onRenameTrack })

      fireEvent.doubleClick(screen.getByText('Piste 1'))
      const input = container.querySelector('input[type="text"]')

      fireEvent.change(input, { target: { value: '   Espacé   ' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onRenameTrack).toHaveBeenCalledWith('t1', 'Espacé')
    })

    it('nom vide → pas de rename', () => {
      const onRenameTrack = vi.fn()
      const { container } = renderHeader({ onRenameTrack })

      fireEvent.doubleClick(screen.getByText('Piste 1'))
      const input = container.querySelector('input[type="text"]')

      fireEvent.change(input, { target: { value: '   ' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onRenameTrack).not.toHaveBeenCalled()
    })

    it('nom inchangé → pas de rename', () => {
      const onRenameTrack = vi.fn()
      const { container } = renderHeader({ onRenameTrack })

      fireEvent.doubleClick(screen.getByText('Piste 1'))
      const input = container.querySelector('input[type="text"]')

      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onRenameTrack).not.toHaveBeenCalled()
    })
  })

  describe('Suppression', () => {
    it('clic sur delete appelle onTrackRemove', () => {
      const onTrackRemove = vi.fn()
      renderHeader({ onTrackRemove })
      fireEvent.click(screen.getByTestId('delete-track-btn'))
      expect(onTrackRemove).toHaveBeenCalledWith('t1')
    })
  })

  describe('État sélectionné', () => {
    it('couleur accent si selectedTrackId === track.id', () => {
      renderHeader({ selectedTrackId: 't1' })
      const nameEl = screen.getByText('Piste 1')
      expect(nameEl.style.color).toContain('var(--accent)')
    })

    it('couleur primary sinon', () => {
      renderHeader({ selectedTrackId: 't2' })
      const nameEl = screen.getByText('Piste 1')
      expect(nameEl.style.color).toContain('var(--text-primary)')
    })
  })
})