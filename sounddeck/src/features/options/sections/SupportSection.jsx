// src/features/options/sections/SupportSection.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { useLicense } from '@core/store/hooks/useLicense'
import Section from '../Section'
import LoginModal from '@features/auth/LoginModal'
import AccountPanel from '@features/auth/AccountPanel'

// ⚠️ À remplacer par ton vrai lien GitHub Sponsors
const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/SteveHun'

export default function SupportSection({ sectionRef, addToast }) {
  const { t } = useLanguage()
  const { status, isPro, activate, logout, loading } = useLicense()
  const [showLogin, setShowLogin] = useState(false)

  const handleActivated = async (token, email) => {
    const result = await activate(token, email)
    if (result.success) {
      addToast?.(t('authManualSuccess'), 'success')
      setShowLogin(false)
    }
    return result
  }

  const handleLogout = async () => {
    await logout()
    addToast?.(t('accountLogoutDone'), 'info')
  }

  const handleGithubSponsor = () => {
    window.electronAPI?.openExternal?.(GITHUB_SPONSORS_URL)
  }

  return (
    <>
      <Section ref={sectionRef} id="support" title={t('supportSectionTitle')} icon="ti-heart">
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
          {t('supportSectionDesc')}
        </div>

        {isPro && status ? (
          <AccountPanel
            status={status}
            onLogout={handleLogout}
            onLoginClick={() => setShowLogin(true)}
            addToast={addToast}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Bouton GitHub Sponsors */}
            <button
              type="button"
              className="btn-primary btn-lg"
              onClick={handleGithubSponsor}
              disabled={loading}
              style={{
                justifyContent: 'center',
                fontSize: 13,
                minHeight: 48,
                background: '#ea4aaa',
                borderColor: '#ea4aaa',
                color: 'white',
              }}
              data-testid="support-github-sponsor-btn"
            >
              <i className="ti ti-brand-github" style={{ fontSize: 16 }} />{' '}
              {t('supportGithubSponsor')}
            </button>

            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.6 }}>
              <div>{t('supportGithubSponsorDesc')} · <strong style={{ color: 'var(--accent)' }}>{t('supportGithubSponsorHint')}</strong></div>
              <div style={{ marginTop: 4 }}>{t('supportGithubSponsorNote')}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-tertiary)', fontSize: 11, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              {t('supportAlreadyDonor')}
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <button
              type="button"
              className="btn-secondary btn-lg"
              onClick={() => setShowLogin(true)}
              disabled={loading}
              style={{ justifyContent: 'center', fontSize: 13, minHeight: 44 }}
              data-testid="support-activate-btn"
            >
              <i className="ti ti-gift" /> {t('authTabCode')}
            </button>
          </div>
        )}
      </Section>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onActivated={handleActivated}
          addToast={addToast}
        />
      )}
    </>
  )
}