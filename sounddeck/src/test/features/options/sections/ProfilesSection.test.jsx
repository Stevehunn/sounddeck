import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

// DeleteButton mocké en simple bouton
vi.mock('@shared/components/ui', () => ({
  DeleteButton: ({ onDelete }) => (
    <button data-testid="delete-profile-btn" onClick={onDelete}>
      Delete
    </button>
  ),
}))

import ProfilesSection from '@features/options/sections/ProfilesSection'

describe('ProfilesSection', () => {
  let store
  let addToast

  const profiles = [
    { id: 'all', name: 'Tous', isDefault: true },
    { id: 'p1', name: 'Gaming', isDefault: false },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    store = {
      profiles,
      sounds: [
        { id: 's1', profiles: ['all', 'p1'] },
        { id: 's2', profiles: ['all'] },
      ],
      deleteProfile: vi.fn().mockResolvedValue(),
    }
    addToast = vi.fn()

    window.electronAPI = {
      exportProfile: vi.fn().mockResolvedValue({
        success: true,
        soundCount: 5,
        sizeMb: '1.2',
      }),
      importProfile: vi.fn().mockResolvedValue({
        success: true,
        profileName: 'Importé',
        soundCount: 3,
      }),
    }
  })

  const renderSection = () =>
    render(<ProfilesSection sectionRef={() => {}} store={store} addToast={addToast} />)

  it('devrait afficher le titre optionsProfiles', () => {
    renderSection()
    expect(screen.getByText('optionsProfiles')).toBeInTheDocument()
  })

  it('devrait afficher tous les profils', () => {
    renderSection()
    expect(screen.getByText('allSounds')).toBeInTheDocument() // 'all'
    expect(screen.getByText('Gaming')).toBeInTheDocument()
  })

  it('devrait compter les sons par profil', () => {
    renderSection()
    // Gaming → 1 son, all → 2 sons
    const rows = screen.getAllByText(/\d+ sounds/)
    expect(rows.length).toBeGreaterThanOrEqual(2)
  })

  it('devrait exposer un bouton export par profil', () => {
    renderSection()
    const exportBtns = screen.getAllByText('exportProfile')
    expect(exportBtns).toHaveLength(2)
  })

  it('devrait appeler exportProfile IPC au click', async () => {
    renderSection()
    const exportBtns = screen.getAllByText('exportProfile')
    fireEvent.click(exportBtns[1])

    await waitFor(() => {
      expect(window.electronAPI.exportProfile).toHaveBeenCalledWith('p1')
    })
  })

  it('devrait afficher un toast succès export', async () => {
    renderSection()
    fireEvent.click(screen.getAllByText('exportProfile')[1])

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('profileExported'),
        'success'
      )
    })
  })

  it('devrait afficher un toast erreur export', async () => {
    window.electronAPI.exportProfile.mockResolvedValue({
      success: false,
      error: 'disk full',
    })
    renderSection()
    fireEvent.click(screen.getAllByText('exportProfile')[1])

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('disk full'),
        'error'
      )
    })
  })

  it('ne devrait PAS afficher DeleteButton pour "all"', () => {
    renderSection()
    // 1 seul delete (p1) car 'all' est isDefault
    const deleteBtns = screen.getAllByTestId('delete-profile-btn')
    expect(deleteBtns).toHaveLength(1)
  })

  it('devrait appeler deleteProfile au click', async () => {
    renderSection()
    fireEvent.click(screen.getByTestId('delete-profile-btn'))

    await waitFor(() => {
      expect(store.deleteProfile).toHaveBeenCalledWith('p1')
    })
  })

  it('devrait afficher un toast après suppression', async () => {
    renderSection()
    fireEvent.click(screen.getByTestId('delete-profile-btn'))

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith('profileDeleted', 'info')
    })
  })

  it('devrait afficher le bouton import en bas', () => {
    renderSection()
    expect(screen.getByText('importProfile')).toBeInTheDocument()
  })

  it('devrait appeler importProfile IPC', async () => {
    renderSection()
    fireEvent.click(screen.getByText('importProfile'))

    await waitFor(() => {
      expect(window.electronAPI.importProfile).toHaveBeenCalled()
    })
  })

  it('devrait afficher un toast succès import', async () => {
    renderSection()
    fireEvent.click(screen.getByText('importProfile'))

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('profileImported'),
        'success'
      )
    })
  })
})