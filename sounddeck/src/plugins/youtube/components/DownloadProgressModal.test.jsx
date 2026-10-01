// src/plugins/youtube/components/DownloadProgressModal.test.jsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import DownloadProgressModal from './DownloadProgressModal'

const t = (k) => k

describe('DownloadProgressModal', () => {
  it('devrait retourner null si visible=false', () => {
    const { container } = render(
      <DownloadProgressModal visible={false} progress={0} status="" t={t} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait afficher "downloadInProgress" si < 100', () => {
    const { container } = render(
      <DownloadProgressModal visible={true} progress={50} status="" t={t} />
    )
    expect(container.textContent).toContain('downloadInProgress')
  })

  it('devrait afficher "downloadComplete" si >= 100', () => {
    const { container } = render(
      <DownloadProgressModal visible={true} progress={100} status="" t={t} />
    )
    expect(container.textContent).toContain('downloadComplete')
  })

  it('devrait afficher le pourcentage arrondi', () => {
    const { container } = render(
      <DownloadProgressModal visible={true} progress={42.7} status="" t={t} />
    )
    expect(container.textContent).toContain('43%')
  })

  it('devrait afficher le loader si < 100', () => {
    const { container } = render(
      <DownloadProgressModal visible={true} progress={50} status="" t={t} />
    )
    expect(container.querySelector('.ti-loader')).toBeInTheDocument()
    expect(container.querySelector('.ti-check')).not.toBeInTheDocument()
  })

  it('devrait afficher le check si >= 100', () => {
    const { container } = render(
      <DownloadProgressModal visible={true} progress={100} status="" t={t} />
    )
    expect(container.querySelector('.ti-check')).toBeInTheDocument()
    expect(container.querySelector('.ti-loader')).not.toBeInTheDocument()
  })

  it('devrait afficher le statut', () => {
    const { container } = render(
      <DownloadProgressModal visible={true} progress={50} status="Traitement" t={t} />
    )
    expect(container.textContent).toContain('Traitement')
  })

  it('devrait afficher "pleaseWait" si < 100', () => {
    const { container } = render(
      <DownloadProgressModal visible={true} progress={50} status="" t={t} />
    )
    expect(container.textContent).toContain('pleaseWait')
  })

  it('devrait afficher "preparingAudio" si >= 100', () => {
    const { container } = render(
      <DownloadProgressModal visible={true} progress={100} status="" t={t} />
    )
    expect(container.textContent).toContain('preparingAudio')
  })

  it('la barre devrait refléter le pourcentage', () => {
    const { container } = render(
      <DownloadProgressModal visible={true} progress={75} status="" t={t} />
    )
    const bar = container.querySelector('div[style*="width: 75%"]')
    expect(bar).toBeInTheDocument()
  })

  it('devrait accepter progress=0', () => {
    const { container } = render(
      <DownloadProgressModal visible={true} progress={0} status="" t={t} />
    )
    expect(container.textContent).toContain('0%')
  })
})