import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStore } from './useStore'

// ✅ Mock de uuid avec des IDs séquentiels
let uuidCounter = 0
vi.mock('uuid', () => ({
  v4: vi.fn(() => {
    uuidCounter++
    return `test-uuid-${uuidCounter}`
  })
}))

// Mock de la fonction save interne
vi.mock('../utils/audio', () => ({
  setStoreRef: vi.fn()
}))

// Fonction helper pour attendre l'initialisation du hook
const waitForStoreInit = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 150))
  })
}

describe('useStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    uuidCounter = 0 // ✅ Réinitialiser le compteur avant chaque test
    
    // Réinitialiser les mocks
    window.electronAPI.storeGet = vi.fn().mockImplementation((key) => {
      if (key === 'shortcuts') return Promise.resolve({})
      if (key === 'soundOrder') return Promise.resolve({})
      if (key === 'profiles') return Promise.resolve([])
      if (key === 'sounds') return Promise.resolve([])
      return Promise.resolve(undefined)
    })
    window.electronAPI.storeSet = vi.fn().mockResolvedValue()
    window.electronAPI.storeDelete = vi.fn().mockResolvedValue()
    window.electronAPI.updateShortcuts = vi.fn().mockResolvedValue()
    window.electronAPI.deleteSoundFile = vi.fn().mockResolvedValue({ success: true })
    window.electronAPI.toggleGlobalShortcuts = vi.fn().mockResolvedValue(true)
    window.electronAPI.getGlobalShortcutsState = vi.fn().mockResolvedValue(true)
    window.electronAPI.getStartMinimized = vi.fn().mockResolvedValue(false)
    window.electronAPI.getLaunchAtStartup = vi.fn().mockResolvedValue(false)
    window.electronAPI.updateProfileShortcut = vi.fn().mockResolvedValue()
    window.electronAPI.updateLoopShortcut = vi.fn().mockResolvedValue()
    window.electronAPI.updateStopAllShortcut = vi.fn().mockResolvedValue()
    window.electronAPI.updatePresentationShortcut = vi.fn().mockResolvedValue()
    window.electronAPI.updateToggleShortcutsAccelerator = vi.fn().mockResolvedValue()
    window.electronAPI.updateToggleWindowShortcut = vi.fn().mockResolvedValue()
  })

  it('devrait initialiser avec des valeurs par défaut', async () => {
    const { result } = renderHook(() => useStore())
    
    await waitForStoreInit()
    
    expect(result.current.profiles).toEqual([
      { id: 'all', name: 'Tous les sons', isDefault: true }
    ])
    expect(result.current.sounds).toEqual([])
    expect(result.current.shortcuts).toEqual({})
    expect(result.current.volume).toBe(80)
    expect(result.current.theme).toBe('dark')
    expect(result.current.lang).toBe('fr')
    expect(result.current.loopEnabled).toBe(false)
    expect(result.current.currentProfileId).toBe('all')
  })

  it('devrait créer un profil', async () => {
    const { result } = renderHook(() => useStore())
    
    await waitForStoreInit()
    
    let newProfile
    await act(async () => {
      newProfile = await result.current.createProfile('Test Profile')
    })
    
    expect(newProfile).toBeDefined()
    expect(newProfile.name).toBe('Test Profile')
    expect(result.current.profiles.length).toBe(2)
    expect(newProfile.id).toBe('test-uuid-1') // ✅ Premier ID
  })

  it('devrait ajouter un son', async () => {
    const { result } = renderHook(() => useStore())
    
    await waitForStoreInit()
    
    let newSound
    await act(async () => {
      newSound = await result.current.addSound({
        name: 'Test Sound',
        path: '/fake/path/sound.mp3',
        profiles: ['all']
      })
    })
    
    expect(newSound).toBeDefined()
    expect(newSound.name).toBe('Test Sound')
    expect(newSound.path).toBe('/fake/path/sound.mp3')
    expect(result.current.sounds.length).toBe(1)
  })

  it('devrait supprimer un son', async () => {
    const { result } = renderHook(() => useStore())
    
    await waitForStoreInit()
    
    let newSound
    await act(async () => {
      newSound = await result.current.addSound({
        name: 'Test Sound',
        path: '/fake/path/sound.mp3',
        profiles: ['all']
      })
    })
    
    const soundId = newSound.id
    expect(result.current.sounds.length).toBe(1)
    
    await act(async () => {
      await result.current.deleteSound(soundId)
    })
    
    expect(result.current.sounds.find(s => s.id === soundId)).toBeUndefined()
    expect(result.current.sounds.length).toBe(0)
  })

  it('devrait définir un raccourci', async () => {
    const { result } = renderHook(() => useStore())
    
    await waitForStoreInit()
    
    let newSound
    await act(async () => {
      newSound = await result.current.addSound({
        name: 'Test Sound',
        path: '/fake/path/sound.mp3',
        profiles: ['all']
      })
    })
    
    await act(async () => {
      await result.current.setShortcut(newSound.id, 'Ctrl+Shift+1')
    })
    
    expect(result.current.shortcuts[newSound.id]).toBe('Ctrl+Shift+1')
  })

  it('devrait basculer le loop', async () => {
    const { result } = renderHook(() => useStore())
    
    await waitForStoreInit()
    
    expect(result.current.loopEnabled).toBe(false)
    
    await act(() => {
      result.current.toggleLoop()
    })
    
    expect(result.current.loopEnabled).toBe(true)
    
    await act(() => {
      result.current.toggleLoop()
    })
    
    expect(result.current.loopEnabled).toBe(false)
  })

  it('devrait changer le volume', async () => {
    const { result } = renderHook(() => useStore())
    
    await waitForStoreInit()
    
    await act(async () => {
      await result.current.updateVolume(50)
    })
    
    expect(result.current.volume).toBe(50)
  })

  it('devrait changer la langue', async () => {
    const { result } = renderHook(() => useStore())
    
    await waitForStoreInit()
    
    await act(async () => {
      await result.current.updateLang('en')
    })
    
    expect(result.current.lang).toBe('en')
  })

  it('devrait changer le thème', async () => {
    const { result } = renderHook(() => useStore())
    
    await waitForStoreInit()
    
    await act(async () => {
      await result.current.updateTheme('light')
    })
    
    expect(result.current.theme).toBe('light')
  })

  it('devrait ajouter un son à un profil', async () => {
    const { result } = renderHook(() => useStore())
    
    await waitForStoreInit()
    
    let newSound
    await act(async () => {
      newSound = await result.current.addSound({
        name: 'Test Sound',
        path: '/fake/path/sound.mp3',
        profiles: ['profile1']
      })
    })
    
    await act(async () => {
      await result.current.addSoundToProfile(newSound.id, 'profile2')
    })
    
    const sound = result.current.sounds.find(s => s.id === newSound.id)
    expect(sound.profiles).toContain('profile1')
    expect(sound.profiles).toContain('profile2')
  })

  it('devrait supprimer un profil', async () => {
    const { result } = renderHook(() => useStore())
    
    await waitForStoreInit()
    
    let newProfile
    await act(async () => {
      newProfile = await result.current.createProfile('Test Profile')
    })
    
    const profileId = newProfile.id
    expect(result.current.profiles.length).toBe(2) // all + new
    
    await act(async () => {
      await result.current.deleteProfile(profileId)
    })
    
    expect(result.current.profiles.find(p => p.id === profileId)).toBeUndefined()
    expect(result.current.profiles.length).toBe(1) // seulement "all"
  })

  it('devrait switcher vers le prochain profil', async () => {
    const { result } = renderHook(() => useStore())
    
    await waitForStoreInit()
    
    // Le profil courant devrait être "all" par défaut
    expect(result.current.currentProfileId).toBe('all')
    
    // Créer deux profils (ils auront des IDs uniques)
    let profile1, profile2
    await act(async () => {
      profile1 = await result.current.createProfile('Profile 1')
    })
    await act(async () => {
      profile2 = await result.current.createProfile('Profile 2')
    })
    
    // Vérifier que les profils sont créés avec des IDs différents
    expect(profile1.id).not.toBe(profile2.id)
    expect(result.current.profiles.length).toBe(3) // all + 2 profils
    
    // Switcher vers le prochain (devrait aller sur Profile 1)
    await act(async () => {
      await result.current.switchToNextProfile()
    })
    
    // Vérifier qu'on est sur le premier profil utilisateur
    expect(result.current.currentProfileId).toBe(profile1.id)
    
    // Switcher encore (devrait aller sur Profile 2)
    await act(async () => {
      await result.current.switchToNextProfile()
    })
    
    // Vérifier qu'on est sur le deuxième profil
    expect(result.current.currentProfileId).toBe(profile2.id)
    
    // Switcher encore (devrait revenir sur "all")
    await act(async () => {
      await result.current.switchToNextProfile()
    })
    
    expect(result.current.currentProfileId).toBe('all')
  })
})