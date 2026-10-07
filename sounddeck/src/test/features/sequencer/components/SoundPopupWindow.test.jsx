// src/test/features/sequencer/components/SoundPopupWindow.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'

// ─── MOCKS ─────────────────────────────────────────────────────────────
vi.mock('@shared/utils/fileUrl', () => ({
  buildFileUrl: vi.fn((p) => (p ? `sounddeck-local://file/${p}` : null)),
}))

import { buildFileUrl } from '@shared/utils/fileUrl'
import SoundPopupWindow from '@features/sequencer/components/SoundPopupWindow'

// ─── GARANTIE rAF/cAF TOUJOURS DÉFINIS ────────────────────────────────
// (évite les ReferenceError lors des cleanups React après les fake timers)
if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (cb) => {
    cb(Date.now())
    return 1
  }
}
if (typeof globalThis.cancelAnimationFrame !== 'function') {
  globalThis.cancelAnimationFrame = () => {}
}

// ─── MOCK DE L'API POPUP ──────────────────────────────────────────────
let updateCallback = null

const popupAPI = {
  onUpdate: vi.fn(),
  sendAction: vi.fn(),
  requestHide: vi.fn(),
  sendReady: vi.fn(),
  setHover: vi.fn(),
}

beforeEach(() => {
  updateCallback = null
  popupAPI.onUpdate.mockReset().mockImplementation((cb) => {
    updateCallback = cb
    return vi.fn()
  })
  popupAPI.sendAction.mockReset()
  popupAPI.requestHide.mockReset()
  popupAPI.sendReady.mockReset()
  popupAPI.setHover.mockReset()

  global.window.soundPopupAPI = popupAPI
  buildFileUrl.mockClear()

  // ✅ rAF synchrone (pour que sendReady s'exécute dans les tests)
  //    On assigne directement sur globalThis pour que cancelAnimationFrame
  //    reste défini même après vi.useRealTimers() / unstubAllGlobals().
  globalThis.requestAnimationFrame = (cb) => {
    cb(Date.now())
    return 1
  }
  globalThis.cancelAnimationFrame = () => {}
})

afterEach(() => {
  vi.useRealTimers()
  delete global.window.soundPopupAPI
})

const triggerUpdate = (payload) => {
  act(() => {
    updateCallback?.(payload)
  })
}

// ═══════════════════════════════════════════════════════════════════════
// PLACEHOLDER
// ═══════════════════════════════════════════════════════════════════════
describe('SoundPopupWindow > Placeholder', () => {
  it('rend un placeholder avant tout payload', () => {
    const { container } = render(<SoundPopupWindow />)
    expect(
      container.querySelector('.sound-popup__placeholder')
    ).toBeInTheDocument()
  })

  it('s\'abonne à onUpdate au mount', () => {
    render(<SoundPopupWindow />)
    expect(popupAPI.onUpdate).toHaveBeenCalledWith(expect.any(Function))
  })

  it('désabonne du listener au unmount', () => {
    const unsubscribe = vi.fn()
    popupAPI.onUpdate.mockReturnValueOnce(unsubscribe)

    const { unmount } = render(<SoundPopupWindow />)
    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// AFFICHAGE APRÈS UPDATE
// ═══════════════════════════════════════════════════════════════════════
describe('SoundPopupWindow > Affichage', () => {
  it('affiche le nom du son', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'Mon super son', emoji: '🎵', duration: 5 })

    expect(screen.getByText('Mon super son')).toBeInTheDocument()
  })

  it('affiche l\'emoji si pas d\'image', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔥', duration: 3 })

    expect(screen.getByText('🔥')).toBeInTheDocument()
  })

  it('affiche 🔊 si ni image ni emoji', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', duration: 3 })

    expect(screen.getByText('🔊')).toBeInTheDocument()
  })

  it('affiche l\'image via buildFileUrl si fournie', () => {
    // ✅ FIX : on capture `container` pour cibler l'img décoratif (alt="")
    const { container } = render(<SoundPopupWindow />)
    triggerUpdate({
      name: 'X',
      emoji: '🔥',
      image: '/sounds/img.png',
      duration: 3,
    })

    expect(buildFileUrl).toHaveBeenCalledWith('/sounds/img.png')
    const img = container.querySelector('.sound-popup__thumb img')
    expect(img).toBeInTheDocument()
    expect(img.getAttribute('src')).toBe('sounddeck-local://file//sounds/img.png')
  })

  it('n\'appelle pas buildFileUrl si pas d\'image', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 3 })

    expect(buildFileUrl).not.toHaveBeenCalled()
  })

  it('formate la durée en m:ss', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 65 })

    expect(screen.getByText('1:05')).toBeInTheDocument()
  })

  it('fallback sur 0:00 pour durée invalide', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: NaN })

    expect(screen.getByText('0:00')).toBeInTheDocument()
  })

  it('affiche le compteur index/total si fournis', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({
      name: 'X',
      emoji: '🔊',
      duration: 5,
      index: 1,
      total: 5,
    })

    expect(screen.getByText(/2\/5/)).toBeInTheDocument()
  })

  it('n\'affiche pas le compteur sans index/total', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5 })

    expect(screen.queryByText(/·/)).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// TAILLE
// ═══════════════════════════════════════════════════════════════════════
describe('SoundPopupWindow > Taille', () => {
  it('utilise medium par défaut', () => {
    const { container } = render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5 })

    expect(container.querySelector('.sound-popup--medium')).toBeInTheDocument()
  })

  it('applique la classe small', () => {
    const { container } = render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5, cardSize: 'small' })

    expect(container.querySelector('.sound-popup--small')).toBeInTheDocument()
  })

  it('applique la classe large', () => {
    const { container } = render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5, cardSize: 'large' })

    expect(container.querySelector('.sound-popup--large')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// THÈMES
// ═══════════════════════════════════════════════════════════════════════
describe('SoundPopupWindow > Thème', () => {
  it('applique les vars dark par défaut', () => {
    const { container } = render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5 })

    const popup = container.querySelector('.sound-popup')
    expect(popup.style.getPropertyValue('--accent')).toBe('#7C6FF7')
  })

  it('applique le thème light', () => {
    const { container } = render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5, theme: 'light' })

    const popup = container.querySelector('.sound-popup')
    expect(popup.style.getPropertyValue('--accent')).toBe('#534AB7')
  })

  it('applique le thème dark-blue', () => {
    const { container } = render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5, theme: 'dark-blue' })

    const popup = container.querySelector('.sound-popup')
    expect(popup.style.getPropertyValue('--accent')).toBe('#2f81f7')
  })

  it('applique le thème custom', () => {
    const { container } = render(<SoundPopupWindow />)
    triggerUpdate({
      name: 'X',
      emoji: '🔊',
      duration: 5,
      theme: 'custom',
      customTheme: { accent: '#FF00FF' },
    })

    const popup = container.querySelector('.sound-popup')
    expect(popup.style.getPropertyValue('--accent')).toBe('#FF00FF')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// BOUTONS
// ═══════════════════════════════════════════════════════════════════════
describe('SoundPopupWindow > Actions', () => {
  it('affiche les 3 boutons prev/pause/next', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5 })

    expect(screen.getByTestId('sound-popup-prev')).toBeInTheDocument()
    expect(screen.getByTestId('sound-popup-pause')).toBeInTheDocument()
    expect(screen.getByTestId('sound-popup-next')).toBeInTheDocument()
  })

  it('click prev → sendAction("prev")', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5 })

    fireEvent.click(screen.getByTestId('sound-popup-prev'))
    expect(popupAPI.sendAction).toHaveBeenCalledWith('prev')
  })

  it('click next → sendAction("next")', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5 })

    fireEvent.click(screen.getByTestId('sound-popup-next'))
    expect(popupAPI.sendAction).toHaveBeenCalledWith('next')
  })

  it('click pause → sendAction("pause") + bascule l\'icône', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5 })

    const btn = screen.getByTestId('sound-popup-pause')

    // État initial : icône pause
    expect(btn.querySelector('.ti-player-pause-filled')).toBeInTheDocument()

    fireEvent.click(btn)
    expect(popupAPI.sendAction).toHaveBeenCalledWith('pause')

    // Après click : icône play (car paused=true)
    expect(btn.querySelector('.ti-player-play-filled')).toBeInTheDocument()
  })

  it('le pause reset à chaque nouvel update', () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5 })

    fireEvent.click(screen.getByTestId('sound-popup-pause'))
    expect(
      screen.getByTestId('sound-popup-pause').querySelector('.ti-player-play-filled')
    ).toBeInTheDocument()

    // Nouvelle update
    triggerUpdate({ name: 'Y', emoji: '🎵', duration: 3 })
    expect(
      screen.getByTestId('sound-popup-pause').querySelector('.ti-player-pause-filled')
    ).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// HOVER
// ═══════════════════════════════════════════════════════════════════════
describe('SoundPopupWindow > Hover', () => {
  it('mouseEnter → setHover(true)', () => {
    const { container } = render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5 })

    fireEvent.mouseEnter(container.querySelector('.sound-popup'))
    expect(popupAPI.setHover).toHaveBeenCalledWith(true)
  })

  it('mouseLeave → setHover(false)', () => {
    const { container } = render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5 })

    fireEvent.mouseLeave(container.querySelector('.sound-popup'))
    expect(popupAPI.setHover).toHaveBeenCalledWith(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// READY & AUTO-HIDE
// ═══════════════════════════════════════════════════════════════════════
describe('SoundPopupWindow > Ready', () => {
  it('envoie sendReady après le premier rendu', async () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5 })

    await waitFor(() => expect(popupAPI.sendReady).toHaveBeenCalledTimes(1))
  })

  it('n\'envoie sendReady qu\'une fois par update', async () => {
    render(<SoundPopupWindow />)
    triggerUpdate({ name: 'X', emoji: '🔊', duration: 5 })
    await waitFor(() => expect(popupAPI.sendReady).toHaveBeenCalledTimes(1))

    triggerUpdate({ name: 'Y', emoji: '🎵', duration: 3 })
    await waitFor(() => expect(popupAPI.sendReady).toHaveBeenCalledTimes(2))
  })
})

describe('SoundPopupWindow > Auto-hide', () => {
  it('cache après 4500ms', () => {
    vi.useFakeTimers()
    const { container } = render(<SoundPopupWindow />)

    act(() => {
      updateCallback?.({ name: 'X', emoji: '🔊', duration: 5 })
    })

    const popup = container.querySelector('.sound-popup')
    expect(popup).toHaveClass('visible')

    act(() => {
      vi.advanceTimersByTime(4500)
    })

    expect(popup).toHaveClass('hidden')
    expect(popupAPI.requestHide).toHaveBeenCalled()
  })

  it('hover annule le timer d\'auto-hide', () => {
    vi.useFakeTimers()
    const { container } = render(<SoundPopupWindow />)

    act(() => {
      updateCallback?.({ name: 'X', emoji: '🔊', duration: 5 })
    })

    // Mouse enter après 2s
    act(() => {
      vi.advanceTimersByTime(2000)
      fireEvent.mouseEnter(container.querySelector('.sound-popup'))
    })

    // Advance de 5s (aurait dû auto-hide si pas de hover)
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(container.querySelector('.sound-popup')).toHaveClass('visible')
  })

  it('mouseLeave réarme le timer', () => {
    vi.useFakeTimers()
    const { container } = render(<SoundPopupWindow />)

    act(() => {
      updateCallback?.({ name: 'X', emoji: '🔊', duration: 5 })
    })

    const popup = container.querySelector('.sound-popup')
    fireEvent.mouseEnter(popup)
    fireEvent.mouseLeave(popup)

    act(() => {
      vi.advanceTimersByTime(4500)
    })

    expect(popup).toHaveClass('hidden')
  })
})