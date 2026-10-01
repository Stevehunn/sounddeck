import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CheckingView, MissingYtdlpView } from './StatusViews'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k) => k,
    currentLang: 'fr',
  }),
}))

describe('CheckingView', () => {
  it('devrait afficher le titre', () => {
    render(<CheckingView />)
    expect(screen.getByText('youtubeTitle')).toBeInTheDocument()
  })

  it('devrait afficher le sub', () => {
    render(<CheckingView />)
    expect(screen.getByText('youtubeSub')).toBeInTheDocument()
  })
})

describe('MissingYtdlpView', () => {
  const baseProps = {
    onInstall: vi.fn(),
    downloading: false,
  }

  it('devrait afficher le titre youtubeTitle', () => {
    render(<MissingYtdlpView {...baseProps} />)
    expect(screen.getByText('youtubeTitle')).toBeInTheDocument()
  })

  it('devrait afficher "ytdlpRequired"', () => {
    render(<MissingYtdlpView {...baseProps} />)
    expect(screen.getByText('ytdlpRequired')).toBeInTheDocument()
  })

  it('devrait afficher "ytdlpDesc"', () => {
    render(<MissingYtdlpView {...baseProps} />)
    expect(screen.getByText('ytdlpDesc')).toBeInTheDocument()
  })

  it('devrait afficher "ytdlpManual"', () => {
    render(<MissingYtdlpView {...baseProps} />)
    expect(screen.getByText('ytdlpManual')).toBeInTheDocument()
  })

  it('devrait afficher le bouton "installYtdlp"', () => {
    render(<MissingYtdlpView {...baseProps} />)
    expect(screen.getByText('installYtdlp')).toBeInTheDocument()
  })

  it('devrait appeler onInstall au click', () => {
    const onInstall = vi.fn()
    render(<MissingYtdlpView {...baseProps} onInstall={onInstall} />)
    fireEvent.click(screen.getByText('installYtdlp'))
    expect(onInstall).toHaveBeenCalled()
  })

  it('devrait afficher "installing" si downloading', () => {
    render(<MissingYtdlpView {...baseProps} downloading={true} />)
    expect(screen.getByText('installing')).toBeInTheDocument()
  })

  it('devrait désactiver le bouton si downloading', () => {
    render(<MissingYtdlpView {...baseProps} downloading={true} />)
    const btn = screen.getByText('installing').closest('button')
    expect(btn).toBeDisabled()
  })
})