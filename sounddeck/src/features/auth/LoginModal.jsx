// src/features/auth/LoginModal.jsx
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@core/i18n/LanguageContext'
import { logError } from '@shared/utils/logger'

const API_BASE = 'https://api.sounddeck.stream'

export default function LoginModal({ onClose, onActivated, addToast }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [githubLogin, setGithubLogin] = useState('')
  const [manualKey, setManualKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Sous-mode du tab "login" :
  // 'normal' | 'forgot' | 'forgot-sent' | 'signup' | 'signup-sent'
  const [loginSubMode, setLoginSubMode] = useState('normal')

  // Champs partagés forgot / signup
  const [subEmail, setSubEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')

  // ─── LOGIN ────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) return setError(t('authErrorEmailRequired'))
    if (!password) return setError(t('authErrorPasswordRequired'))

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (!res.ok) {
        if (res.status === 401) setError(t('authErrorInvalidCredentials'))
        else if (res.status === 403) {
          const data = await res.json().catch(() => ({}))
          if (data.error === 'email_not_verified') {
            setError(t('authErrorEmailNotVerified'))
          } else {
            setError(t('authErrorGeneric'))
          }
        } else {
          setError(t('authErrorGeneric'))
        }
        return
      }
      const data = await res.json()
      if (!data?.token) return setError(t('authErrorGeneric'))
      await onActivated(data.token, data.email || email.trim())
    } catch (err) {
      logError('LoginModal', 'Erreur login', err)
      setError(t('authErrorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  // ─── FORGOT PASSWORD ──────────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError(null)

    const trimmed = subEmail.trim().toLowerCase()
    if (!trimmed) return setError(t('authErrorEmailRequired'))
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return setError(t('authErrorEmailInvalid'))
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })

      if (!res.ok && res.status !== 200) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'missing_email') {
          return setError(t('authErrorEmailRequired'))
        }
        setError(t('authErrorNetwork'))
        return
      }

      setLoginSubMode('forgot-sent')
    } catch (err) {
      logError('LoginModal', 'Erreur forgot password', err)
      setError(t('authErrorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  // ─── SIGNUP ───────────────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault()
    setError(null)

    const trimmed = subEmail.trim().toLowerCase()
    if (!trimmed) return setError(t('authErrorEmailRequired'))
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return setError(t('authErrorEmailInvalid'))
    }
    if (!signupPassword) return setError(t('authErrorPasswordRequired'))
    if (signupPassword.length < 6) {
      return setError(t('authErrorPasswordTooShort'))
    }
    if (signupPassword !== signupConfirm) {
      return setError(t('authErrorPasswordMismatch'))
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          password: signupPassword,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const map = {
          email_already_exists: t('authSignupErrorEmailExists'),
          invalid_email: t('authErrorEmailInvalid'),
          password_too_short: t('authErrorPasswordTooShort'),
          password_too_long: t('authErrorPasswordTooLong'),
          email_send_failed: t('authSignupErrorEmailFailed'),
        }
        setError(map[data.error] || t('authErrorGeneric'))
        return
      }

      setLoginSubMode('signup-sent')
    } catch (err) {
      logError('LoginModal', 'Erreur signup', err)
      setError(t('authErrorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  // ─── REDEEM CODE ──────────────────────────────────────────────────
  const handleRedeemCode = async (e) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) return setError(t('authErrorEmailRequired'))
    if (!password) return setError(t('authErrorPasswordRequired'))
    if (!code.trim()) return setError(t('authCodeErrorNotFound'))

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          code: code.trim().toUpperCase(),
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const map = {
          code_not_found: t('authCodeErrorNotFound'),
          code_revoked: t('authCodeErrorRevoked'),
          code_already_used: t('authCodeErrorAlreadyUsed'),
          code_expired: t('authCodeErrorExpired'),
          email_mismatch: t('authCodeErrorEmailMismatch'),
          email_already_exists: t('authCodeErrorEmailExists'),
          invalid_code_format: t('authCodeError'),
        }
        setError(map[data.error] || t('authCodeError'))
        return
      }

      if (!data?.token) return setError(t('authCodeError'))

      addToast?.(t('authCodeSuccess'), 'success')
      await onActivated(data.token, data.email || email.trim())
    } catch (err) {
      logError('LoginModal', 'Erreur redeem', err)
      setError(t('authErrorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  // ─── CLAIM GITHUB SPONSORSHIP ────────────────────────────────────
  const handleClaimSponsorship = async (e) => {
    e.preventDefault()
    setError(null)
    if (!githubLogin.trim()) return setError(t('authGithubErrorMissingLogin'))
    if (!email.trim()) return setError(t('authErrorEmailRequired'))
    if (!password) return setError(t('authErrorPasswordRequired'))

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/claim-sponsorship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubLogin: githubLogin.trim(),
          email: email.trim(),
          password,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const map = {
          sponsorship_not_found: t('authGithubErrorNotFound'),
          email_already_exists: t('authGithubErrorEmailExists'),
          invalid_github_login: t('authGithubErrorInvalidLogin'),
          missing_fields: t('authErrorGeneric'),
        }
        setError(map[data.error] || t('authGithubError'))
        return
      }

      if (!data?.token) return setError(t('authGithubError'))

      addToast?.(t('authGithubSuccess'), 'success')
      await onActivated(data.token, data.email || email.trim())
    } catch (err) {
      logError('LoginModal', 'Erreur claim sponsorship', err)
      setError(t('authErrorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  // ─── MANUAL KEY ───────────────────────────────────────────────────
  const handleManualActivate = async (e) => {
    e.preventDefault()
    setError(null)
    if (!manualKey.trim()) return setError(t('authManualInvalid'))

    setLoading(true)
    try {
      const result = await onActivated(manualKey.trim(), null)
      if (result?.success) addToast?.(t('authManualSuccess'), 'success')
      else setError(t('authManualInvalid'))
    } catch (err) {
      logError('LoginModal', 'Erreur activation manuelle', err)
      setError(t('authErrorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  // ─── RESET SOUS-MODE QUAND ON CHANGE DE TAB ───────────────────────
  const handleTabChange = (newTab) => {
    setTab(newTab)
    setError(null)
    if (newTab !== 'login') {
      setLoginSubMode('normal')
      setSubEmail('')
      setSignupPassword('')
      setSignupConfirm('')
    }
  }

  const goToSubMode = (mode) => {
    setError(null)
    setLoginSubMode(mode)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !loading) onClose?.()
  }

  const tabs = [
    { id: 'login', icon: 'ti-user', label: t('authTabLogin') },
    { id: 'github', icon: 'ti-brand-github', label: t('authTabGithub') },
    { id: 'code', icon: 'ti-gift', label: t('authTabCode') },
    { id: 'key', icon: 'ti-key', label: t('authTabKey') },
  ]

  return createPortal(
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal"
        style={{ width: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <i className="ti ti-lock" style={{ color: 'var(--accent)' }} />
          {t('authTitle')}
        </div>

        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginBottom: 16,
          }}
        >
          {t('authSubtitle')}
        </div>

        {/* ─── TABS ──────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 16,
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            padding: 4,
          }}
        >
          {tabs.map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
              style={{
                flex: 1,
                padding: '6px 6px',
                borderRadius: 6,
                border: 'none',
                background:
                  tab === id ? 'var(--bg-secondary)' : 'transparent',
                color:
                  tab === id
                    ? 'var(--text-primary)'
                    : 'var(--text-tertiary)',
                fontSize: 10,
                fontWeight: tab === id ? 500 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={label}
            >
              <i
                className={`ti ${icon}`}
                style={{ fontSize: 12, flexShrink: 0 }}
              />
              <span
                style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* ═══ TAB LOGIN — NORMAL ══════════════════════════════════ */}
        {tab === 'login' && loginSubMode === 'normal' && (
          <form
            onSubmit={handleLogin}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <EmailField
              value={email}
              onChange={setEmail}
              disabled={loading}
              autoFocus
            />
            <PasswordField
              value={password}
              onChange={setPassword}
              disabled={loading}
            />

            {/* Liens : Mot de passe oublié + Créer un compte */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: -6,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => goToSubMode('signup')}
                style={linkStyle}
                data-testid="login-modal-signup-link"
              >
                {t('authNoAccountYet')}{' '}
                <strong style={{ color: 'var(--accent)' }}>
                  {t('authCreateAccount')}
                </strong>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubEmail(email)
                  goToSubMode('forgot')
                }}
                style={linkStyle}
                data-testid="login-modal-forgot-link"
              >
                {t('authForgotPassword')}
              </button>
            </div>

            {error && <ErrorBox>{error}</ErrorBox>}
            <Actions
              onCancel={onClose}
              loading={loading}
              submitLabel={t('authLogin')}
              loadingLabel={t('authLoggingIn')}
              icon="ti-login"
            />
          </form>
        )}

        {/* ═══ TAB LOGIN — FORGOT ══════════════════════════════════ */}
        {tab === 'login' && loginSubMode === 'forgot' && (
          <form
            onSubmit={handleForgotPassword}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={infoStyle}>{t('authForgotPasswordSubtitle')}</div>

            <div>
              <label style={labelStyle}>{t('authEmail')}</label>
              <input
                type="email"
                value={subEmail}
                onChange={(e) => setSubEmail(e.target.value)}
                placeholder={t('authEmailPlaceholder')}
                className="input-lg"
                disabled={loading}
                autoFocus
                data-testid="login-modal-forgot-email"
              />
            </div>

            {error && <ErrorBox>{error}</ErrorBox>}

            <div style={subActionsStyle}>
              <button
                type="button"
                onClick={() => goToSubMode('normal')}
                className="btn-ghost btn-sm"
                disabled={loading}
                style={{ fontSize: 12 }}
              >
                <i className="ti ti-arrow-left" /> {t('authBack')}
              </button>

              <button
                type="submit"
                className="btn-primary btn-lg"
                disabled={loading || !subEmail.trim()}
              >
                {loading ? (
                  <>
                    <i
                      className="ti ti-loader"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    {t('authForgotPasswordSending')}
                  </>
                ) : (
                  <>
                    <i className="ti ti-send" />
                    {t('authForgotPasswordSend')}
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ═══ TAB LOGIN — FORGOT-SENT ═════════════════════════════ */}
        {tab === 'login' && loginSubMode === 'forgot-sent' && (
          <SuccessPanel
            icon="ti-mail-check"
            title={t('authForgotPasswordSent')}
            message={
              <>
                {t('authForgotPasswordSentDesc')}{' '}
                <span style={emailHighlightStyle}>{subEmail}</span>
              </>
            }
            hint={t('authForgotPasswordCheckSpam')}
            primaryLabel={t('authForgotPasswordResend')}
            primaryIcon="ti-refresh"
            onPrimary={() => goToSubMode('forgot')}
            secondaryLabel={t('authBack')}
            secondaryIcon="ti-arrow-left"
            onSecondary={() => goToSubMode('normal')}
          />
        )}

        {/* ═══ TAB LOGIN — SIGNUP ══════════════════════════════════ */}
        {tab === 'login' && loginSubMode === 'signup' && (
          <form
            onSubmit={handleSignup}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={infoStyle}>{t('authSignupSubtitle')}</div>

            <div>
              <label style={labelStyle}>{t('authEmail')}</label>
              <input
                type="email"
                value={subEmail}
                onChange={(e) => setSubEmail(e.target.value)}
                placeholder={t('authEmailPlaceholder')}
                className="input-lg"
                disabled={loading}
                autoFocus
                data-testid="login-modal-signup-email"
              />
            </div>

            <div>
              <label style={labelStyle}>{t('authPassword')}</label>
              <input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder={t('authSignupPasswordPlaceholder')}
                className="input-lg"
                disabled={loading}
                minLength={6}
                data-testid="login-modal-signup-password"
              />
            </div>

            <div>
              <label style={labelStyle}>{t('authSignupConfirmLabel')}</label>
              <input
                type="password"
                value={signupConfirm}
                onChange={(e) => setSignupConfirm(e.target.value)}
                placeholder={t('authSignupConfirmPlaceholder')}
                className="input-lg"
                disabled={loading}
                minLength={6}
                data-testid="login-modal-signup-confirm"
              />
            </div>

            {error && <ErrorBox>{error}</ErrorBox>}

            <div style={subActionsStyle}>
              <button
                type="button"
                onClick={() => goToSubMode('normal')}
                className="btn-ghost btn-sm"
                disabled={loading}
                style={{ fontSize: 12 }}
              >
                <i className="ti ti-arrow-left" /> {t('authBack')}
              </button>

              <button
                type="submit"
                className="btn-primary btn-lg"
                disabled={
                  loading ||
                  !subEmail.trim() ||
                  !signupPassword ||
                  !signupConfirm
                }
                data-testid="login-modal-signup-submit"
              >
                {loading ? (
                  <>
                    <i
                      className="ti ti-loader"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    {t('authSignupCreating')}
                  </>
                ) : (
                  <>
                    <i className="ti ti-user-plus" />
                    {t('authSignupCreate')}
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ═══ TAB LOGIN — SIGNUP-SENT ═════════════════════════════ */}
        {tab === 'login' && loginSubMode === 'signup-sent' && (
          <SuccessPanel
            icon="ti-mail-check"
            title={t('authSignupSent')}
            message={
              <>
                {t('authSignupSentDesc')}{' '}
                <span style={emailHighlightStyle}>{subEmail}</span>
              </>
            }
            hint={t('authSignupSentHint')}
            primaryLabel={t('authBack')}
            primaryIcon="ti-arrow-left"
            onPrimary={() => {
              setEmail(subEmail)
              setPassword('')
              goToSubMode('normal')
            }}
          />
        )}

        {/* ═══ TAB GITHUB ═════════════════════════════════════════ */}
        {tab === 'github' && (
          <form
            onSubmit={handleClaimSponsorship}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={infoStyle}>{t('authGithubSubtitle')}</div>
            <div>
              <label style={labelStyle}>{t('authGithubLoginLabel')}</label>
              <input
                type="text"
                value={githubLogin}
                onChange={(e) =>
                  setGithubLogin(e.target.value.replace(/^@/, ''))
                }
                placeholder={t('authGithubLoginPlaceholder')}
                className="input-lg"
                disabled={loading}
                style={{ fontFamily: 'monospace' }}
                data-testid="login-modal-github-input"
                autoFocus
              />
            </div>
            <EmailField value={email} onChange={setEmail} disabled={loading} />
            <PasswordField
              value={password}
              onChange={setPassword}
              disabled={loading}
            />
            {error && <ErrorBox>{error}</ErrorBox>}
            <Actions
              onCancel={onClose}
              loading={loading}
              submitLabel={t('authGithubActivate')}
              loadingLabel={t('authGithubActivating')}
              icon="ti-brand-github"
              disabled={!githubLogin.trim()}
            />
          </form>
        )}

        {/* ═══ TAB CODE ═══════════════════════════════════════════ */}
        {tab === 'code' && (
          <form
            onSubmit={handleRedeemCode}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={infoStyle}>{t('authCodeSubtitle')}</div>
            <EmailField
              value={email}
              onChange={setEmail}
              disabled={loading}
              autoFocus
            />
            <PasswordField
              value={password}
              onChange={setPassword}
              disabled={loading}
            />
            <div>
              <label style={labelStyle}>{t('authCodeLabel')}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t('authCodePlaceholder')}
                className="input-lg"
                disabled={loading}
                style={{
                  fontFamily: 'monospace',
                  letterSpacing: 1.5,
                  fontSize: 14,
                  textAlign: 'center',
                }}
                maxLength={19}
                data-testid="login-modal-code-input"
              />
            </div>
            {error && <ErrorBox>{error}</ErrorBox>}
            <Actions
              onCancel={onClose}
              loading={loading}
              submitLabel={t('authCodeActivate')}
              loadingLabel={t('authCodeActivating')}
              icon="ti-gift"
              disabled={!code.trim()}
            />
          </form>
        )}

        {/* ═══ TAB KEY ════════════════════════════════════════════ */}
        {tab === 'key' && (
          <form
            onSubmit={handleManualActivate}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('authKeySubtitle')}
            </div>
            <textarea
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder={t('authManualPlaceholder')}
              disabled={loading}
              rows={3}
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                resize: 'vertical',
                minHeight: 80,
                wordBreak: 'break-all',
              }}
              autoFocus
            />
            {error && <ErrorBox>{error}</ErrorBox>}
            <Actions
              onCancel={onClose}
              loading={loading}
              submitLabel={t('authManualActivate')}
              loadingLabel={t('authManualActivating')}
              icon="ti-key"
              disabled={!manualKey.trim()}
            />
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}

// ─── Styles partagés ───────────────────────────────────────────────────
const labelStyle = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: 6,
}

const infoStyle = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
  marginBottom: 4,
}

const linkStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  fontSize: 11,
  cursor: 'pointer',
  padding: '4px 0',
  fontFamily: 'inherit',
  textDecoration: 'none',
}

const emailHighlightStyle = {
  fontFamily: 'monospace',
  color: 'var(--accent)',
}

const subActionsStyle = {
  display: 'flex',
  gap: 8,
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 8,
}

// ─── Sub-components ────────────────────────────────────────────────────
function EmailField({ value, onChange, disabled, autoFocus }) {
  const { t } = useLanguage()
  return (
    <div>
      <label style={labelStyle}>{t('authEmail')}</label>
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('authEmailPlaceholder')}
        className="input-lg"
        disabled={disabled}
        autoFocus={autoFocus}
      />
    </div>
  )
}

function PasswordField({ value, onChange, disabled }) {
  const { t } = useLanguage()
  return (
    <div>
      <label style={labelStyle}>{t('authPassword')}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('authPasswordPlaceholder')}
        className="input-lg"
        disabled={disabled}
      />
    </div>
  )
}

function ErrorBox({ children }) {
  return (
    <div
      style={{
        padding: '8px 12px',
        background: 'rgba(224,82,82,0.1)',
        border: '1px solid var(--danger)',
        borderRadius: 'var(--radius-md)',
        fontSize: 12,
        color: 'var(--danger)',
      }}
    >
      <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
      {children}
    </div>
  )
}

function Actions({
  onCancel,
  loading,
  submitLabel,
  loadingLabel,
  icon,
  disabled,
}) {
  const { t } = useLanguage()
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'flex-end',
        marginTop: 8,
      }}
    >
      <button
        type="button"
        className="btn-secondary btn-lg"
        onClick={onCancel}
        disabled={loading}
      >
        {t('authCancel')}
      </button>
      <button
        type="submit"
        className="btn-primary btn-lg"
        disabled={disabled || loading}
      >
        {loading ? (
          <>
            <i
              className="ti ti-loader"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            {loadingLabel}
          </>
        ) : (
          <>
            <i className={`ti ${icon}`} />
            {submitLabel}
          </>
        )}
      </button>
    </div>
  )
}

// ─── SuccessPanel (utilisé pour forgot-sent et signup-sent) ────────────
function SuccessPanel({
  icon,
  title,
  message,
  hint,
  primaryLabel,
  primaryIcon,
  onPrimary,
  secondaryLabel,
  secondaryIcon,
  onSecondary,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        alignItems: 'center',
        padding: '12px 0 8px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(29,158,117,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          color: 'var(--success)',
        }}
      >
        <i className={`ti ${icon}`} />
      </div>

      <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>

      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          maxWidth: 400,
        }}
      >
        {message}
      </div>

      {hint && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            lineHeight: 1.5,
            maxWidth: 400,
            marginTop: 4,
          }}
        >
          {hint}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 12,
          width: '100%',
          justifyContent: 'center',
        }}
      >
        {secondaryLabel && (
          <button
            type="button"
            className="btn-secondary btn-lg"
            onClick={onSecondary}
            style={{ minWidth: 140 }}
          >
            {secondaryIcon && <i className={`ti ${secondaryIcon}`} />}{' '}
            {secondaryLabel}
          </button>
        )}
        <button
          type="button"
          className="btn-primary btn-lg"
          onClick={onPrimary}
          style={{ minWidth: 140 }}
        >
          {primaryIcon && <i className={`ti ${primaryIcon}`} />} {primaryLabel}
        </button>
      </div>
    </div>
  )
}