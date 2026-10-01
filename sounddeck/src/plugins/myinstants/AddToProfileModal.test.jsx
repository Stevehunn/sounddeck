// src/plugins/myinstants/AddToProfileModal.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AddToProfileModal from './AddToProfileModal'

const t = (k) => k
const profiles = [
  { id: 'all', name: 'Tous', isDefault: true },
  { id: 'p1', name: 'Profil 1' },
]

describe('AddToProfileModal', () => {
  it('devrait retourner null si sound absent', () => {
    const { container } = render(<AddToProfileModal sound={null} t={t} />)
    expect(container.firstChild).toBeNull()
  })

  it('devrait afficher le titre et les profils', () => {
    render(
      <AddToProfileModal
        sound={{ id: 's1', emoji: '🔊' }}
        profiles={profiles}
        selectedProfile="all"
        onSelectProfile={() => {}}
        onClose={() => {}}
        onConfirm={() => {}}
        t={t}
      />
    )
    expect(screen.getByText('myinstantsAddToLibrary')).toBeInTheDocument()
    expect(screen.getByText('allSounds')).toBeInTheDocument()
    expect(screen.getByText('Profil 1')).toBeInTheDocument()
  })

  it('devrait afficher l\'emoji du son', () => {
    const { container } = render(
      <AddToProfileModal
        sound={{ id: 's1', emoji: '🎵' }}
        profiles={profiles}
        onSelectProfile={() => {}}
        onClose={() => {}}
        onConfirm={() => {}}
        t={t}
      />
    )
    expect(container.textContent).toContain('🎵')
  })

  it('devrait afficher 🔊 fallback si emoji absent', () => {
    const { container } = render(
      <AddToProfileModal
        sound={{ id: 's1' }}
        profiles={profiles}
        onSelectProfile={() => {}}
        onClose={() => {}}
        onConfirm={() => {}}
        t={t}
      />
    )
    expect(container.textContent).toContain('🔊')
  })

  it('devrait cocher le profil sélectionné', () => {
    const { container } = render(
      <AddToProfileModal
        sound={{ id: 's1' }}
        profiles={profiles}
        selectedProfile="p1"
        onSelectProfile={() => {}}
        onClose={() => {}}
        onConfirm={() => {}}
        t={t}
      />
    )
    const radios = container.querySelectorAll('input[type="radio"]')
    expect(radios[0].checked).toBe(false)
    expect(radios[1].checked).toBe(true)
  })

  it('devrait appeler onSelectProfile au change', () => {
    const onSelectProfile = vi.fn()
    const { container } = render(
      <AddToProfileModal
        sound={{ id: 's1' }}
        profiles={profiles}
        selectedProfile="all"
        onSelectProfile={onSelectProfile}
        onClose={() => {}}
        onConfirm={() => {}}
        t={t}
      />
    )
    fireEvent.click(container.querySelectorAll('input[type="radio"]')[1])
    expect(onSelectProfile).toHaveBeenCalledWith('p1')
  })

  it('devrait appeler onClose au click sur Annuler', () => {
    const onClose = vi.fn()
    render(
      <AddToProfileModal
        sound={{ id: 's1' }}
        profiles={profiles}
        selectedProfile="all"
        onSelectProfile={() => {}}
        onClose={onClose}
        onConfirm={() => {}}
        t={t}
      />
    )
    fireEvent.click(screen.getByText('myinstantsCancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait appeler onConfirm au click sur Ajouter', () => {
    const onConfirm = vi.fn()
    render(
      <AddToProfileModal
        sound={{ id: 's1' }}
        profiles={profiles}
        selectedProfile="all"
        onSelectProfile={() => {}}
        onClose={() => {}}
        onConfirm={onConfirm}
        t={t}
      />
    )
    fireEvent.click(screen.getByText('myinstantsAdd'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('devrait fermer au click sur overlay', () => {
    const onClose = vi.fn()
    const { container } = render(
      <AddToProfileModal
        sound={{ id: 's1' }}
        profiles={profiles}
        selectedProfile="all"
        onSelectProfile={() => {}}
        onClose={onClose}
        onConfirm={() => {}}
        t={t}
      />
    )
    fireEvent.click(container.querySelector('.modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('ne devrait PAS fermer au click sur modal', () => {
    const onClose = vi.fn()
    const { container } = render(
      <AddToProfileModal
        sound={{ id: 's1' }}
        profiles={profiles}
        selectedProfile="all"
        onSelectProfile={() => {}}
        onClose={onClose}
        onConfirm={() => {}}
        t={t}
      />
    )
    fireEvent.click(container.querySelector('.modal'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('devrait afficher ti-stack pour profil all', () => {
    const { container } = render(
      <AddToProfileModal
        sound={{ id: 's1' }}
        profiles={profiles}
        selectedProfile="all"
        onSelectProfile={() => {}}
        onClose={() => {}}
        onConfirm={() => {}}
        t={t}
      />
    )
    expect(container.querySelector('.ti-stack')).toBeInTheDocument()
    expect(container.querySelector('.ti-user')).toBeInTheDocument()
  })
})