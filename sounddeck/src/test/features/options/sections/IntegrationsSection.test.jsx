import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: () => ({ t: (k) => k, currentLang: 'fr' }),
}))

vi.mock('@shared/components/settings/OBSControl', () => ({
  default: ({ lang }) => <div data-testid="obs-control" data-lang={lang} />,
}))

import IntegrationsSection from '@features/options/sections/IntegrationsSection'

describe('IntegrationsSection', () => {
  it('devrait rendre le titre integrations', () => {
    render(<IntegrationsSection sectionRef={() => {}} />)
    expect(screen.getByText('integrations')).toBeInTheDocument()
  })

  it('devrait rendre OBSControl', () => {
    render(<IntegrationsSection sectionRef={() => {}} />)
    expect(screen.getByTestId('obs-control')).toBeInTheDocument()
  })

  it('devrait passer currentLang à OBSControl', () => {
    render(<IntegrationsSection sectionRef={() => {}} />)
    expect(screen.getByTestId('obs-control').getAttribute('data-lang')).toBe('fr')
  })

  it('devrait exposer le testid de section', () => {
    render(<IntegrationsSection sectionRef={() => {}} />)
    expect(screen.getByTestId('section-integrations')).toBeInTheDocument()
  })
})