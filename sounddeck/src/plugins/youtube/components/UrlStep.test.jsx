import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import UrlStep from './UrlStep'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k) => k,
    currentLang: 'fr',
  }),
}))

describe('UrlStep', () => {
  const baseProps = {
    resetKey: 0,
    isTutorialMode: false,
    url: '',
    setUrl: vi.fn(),
    loadingInfo: false,
    onFetchInfo: vi.fn(),
  }

  it('devrait afficher le titre youtubeTitle', () => {
    render(<UrlStep {...baseProps} />)
    expect(screen.getByText('youtubeTitle')).toBeInTheDocument()
  })

  it('devrait afficher le placeholder', () => {
    render(<UrlStep {...baseProps} />)
    const input = screen.getByTestId('youtube-url-input')
    expect(input.placeholder).toBe('ytUrlPlaceholder')
  })

  it('devrait appeler setUrl on change', () => {
    const setUrl = vi.fn()
    render(<UrlStep {...baseProps} setUrl={setUrl} />)
    fireEvent.change(screen.getByTestId('youtube-url-input'), {
      target: { value: 'https://youtube.com/watch?v=x' },
    })
    expect(setUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=x')
  })

  it('devrait désactiver le bouton si url vide', () => {
    render(<UrlStep {...baseProps} url="" />)
    expect(screen.getByTestId('youtube-load-button')).toBeDisabled()
  })

  it('devrait activer le bouton si url présente', () => {
    render(<UrlStep {...baseProps} url="https://x" />)
    expect(screen.getByTestId('youtube-load-button')).not.toBeDisabled()
  })

  it('devrait afficher "loading2" si loadingInfo', () => {
    render(<UrlStep {...baseProps} url="x" loadingInfo={true} />)
    expect(screen.getByText('loading2')).toBeInTheDocument()
  })

  it('devrait appeler onFetchInfo au click', () => {
    const onFetchInfo = vi.fn()
    render(<UrlStep {...baseProps} url="x" onFetchInfo={onFetchInfo} />)
    fireEvent.click(screen.getByTestId('youtube-load-button'))
    expect(onFetchInfo).toHaveBeenCalled()
  })

  // ─── Mode tutoriel ────────────────────────────────────────────────

  it('devrait afficher l\'URL de démo en mode tutoriel', () => {
    render(<UrlStep {...baseProps} isTutorialMode={true} />)
    const input = screen.getByTestId('youtube-url-input')
    expect(input.value).toBe('https://www.youtube.com/watch?v=a5uQMwRMHcs')
  })

  it('devrait désactiver l\'input en mode tutoriel', () => {
    render(<UrlStep {...baseProps} isTutorialMode={true} />)
    expect(screen.getByTestId('youtube-url-input')).toBeDisabled()
  })

  it('devrait activer le bouton en mode tutoriel même avec URL vide', () => {
    render(<UrlStep {...baseProps} isTutorialMode={true} url="" />)
    expect(screen.getByTestId('youtube-load-button')).not.toBeDisabled()
  })

  it('ne devrait pas modifier l\'URL en mode tutoriel', () => {
    const setUrl = vi.fn()
    render(<UrlStep {...baseProps} isTutorialMode={true} setUrl={setUrl} />)
    fireEvent.change(screen.getByTestId('youtube-url-input'), {
      target: { value: 'autre' },
    })
    expect(setUrl).not.toHaveBeenCalled()
  })
})