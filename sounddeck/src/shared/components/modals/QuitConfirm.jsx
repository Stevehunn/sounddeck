/**
 * @file Quit confirmation modal.
 *
 * Shown when the user tries to close the app (window close button or
 * `before-quit` event) and "close to tray" is enabled. Offers 3 choices:
 * - **Quit** — actually quits the app
 * - **Minimize** — hides the window (app stays in the tray)
 * - **Cancel** — closes the modal (app keeps running)
 *
 * A "Remember my choice" checkbox passes the user's decision to the main
 * process (stored in `electron-store`), so the modal doesn't appear again.
 *
 * The minimize action closes the modal immediately (the main process
 * hides the window itself). Quit and Cancel rely on
 * `electronAPI.confirmQuit(action, remember)` to update the main process
 * state and return the final decision.
 *
 * @see electron/modules/windowManager.js — `onClose` handler
 * @see src/App.jsx — `showQuitConfirm` state
 */

import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { logError } from '@shared/utils/logger'

/**
 * Quit confirmation modal.
 *
 * @param {Object} props
 * @param {() => void} props.onClose - Called when the modal should close.
 * @param {'fr'|'en'|'es'} [_lang='fr'] - Kept for API compatibility; the
 *   effective language comes from `useLanguage()` (`currentLang`).
 * @returns {JSX.Element}
 */
export default function QuitConfirm({ onClose, _lang = 'fr' }) {
  const { t } = useLanguage()
  const [remember, setRemember] = useState(false)
  const [processing, setProcessing] = useState(false)

  /**
   * Handles a user choice ("quit" / "minimize" / "cancel").
   *
   * For "minimize", the modal closes immediately (the main process hides
   * the window). For "quit" and "cancel", the result of `confirmQuit` is
   * checked: `'cancel'` closes the modal.
   *
   * @param {'quit'|'minimize'|'cancel'} action
   * @returns {Promise<void>}
   */
  const handleAction = async (action) => {
    if (processing) return
    setProcessing(true)

    try {
      if (action === 'minimize') {
        onClose()
      }

      const result = await window.electronAPI.confirmQuit(action, remember)

      if (result === 'cancel') {
        onClose()
      }
    } catch (e) {
      logError('QuitConfirm', 'Erreur lors de la confirmation', e)
      onClose()
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={() => handleAction('cancel')}>
      <div
        className="modal"
        style={{ width: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title" style={{ color: 'var(--warning)' }}>
          <i
            className="ti ti-alert-triangle"
            style={{ color: 'var(--warning)', marginRight: 8 }}
          />
          {t('quitConfirmTitle')}
        </div>

        <div
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 20,
          }}
        >
          {t('quitConfirmMessage')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn-primary btn-xl"
            onClick={() => handleAction('quit')}
            disabled={processing}
            style={{
              width: '100%',
              justifyContent: 'center',
              background: 'var(--danger)',
              borderColor: 'var(--danger)',
              minHeight: 48,
            }}
          >
            <i className="ti ti-power" /> {t('quitConfirmQuit')}
          </button>

          <button
            className="btn-secondary btn-xl"
            onClick={() => handleAction('minimize')}
            disabled={processing}
            style={{ width: '100%', justifyContent: 'center', minHeight: 48 }}
          >
            <i className="ti ti-arrow-bar-to-bottom" /> {t('quitConfirmMinimize')}
          </button>

          <button
            className="btn-ghost"
            onClick={() => handleAction('cancel')}
            disabled={processing}
            style={{ width: '100%', justifyContent: 'center', minHeight: 34 }}
          >
            {t('quitConfirmCancel')}
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <input
            type="checkbox"
            id="rememberChoice"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ width: 'auto', accentColor: 'var(--accent)' }}
          />
          <label
            htmlFor="rememberChoice"
            style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
            }}
          >
            {t('quitConfirmRemember')}
          </label>
        </div>
      </div>
    </div>
  )
}