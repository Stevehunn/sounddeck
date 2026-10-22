/**
 * @file Imperative confirmation hook (`confirm({ title, message, type })`).
 *
 * Provides a promise-based confirmation API:
 *
 * @example
 *   const { confirm, ConfirmWrapper } = useConfirm({ lang })
 *
 *   const ok = await confirm({
 *     title: 'Delete this sound?',
 *     message: 'This cannot be undone.',
 *     type: 'danger',
 *   })
 *   if (ok) deleteSound()
 *
 *   // In JSX:
 *   return <><button onClick={onClick}>…</button><ConfirmWrapper /></>
 *
 * The wrapper is rendered via `createPortal` at `document.body` so it
 * overlays everything regardless of the caller's position in the tree.
 *
 * @see @shared/components/modals/ConfirmModal.jsx
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import ConfirmModal from '@shared/components/modals/ConfirmModal'

/**
 * Imperative confirmation hook.
 *
 * @param {Object} [options]
 * @param {'fr'|'en'|'es'} [options.lang='fr'] - Language passed to the modal.
 * @returns {{
 *   confirm: (options: {
 *     title: string,
 *     message: string,
 *     type?: 'danger'|'warning'|'info',
 *     confirmText?: string,
 *     cancelText?: string,
 *   }) => Promise<boolean>,
 *   ConfirmWrapper: React.FC,
 * }}
 */
export function useConfirm({ lang = 'fr' } = {}) {
  const [modalState, setModalState] = useState(null)

  /**
   * Opens the confirmation modal and resolves when the user picks.
   *
   * @param {Object} options
   * @returns {Promise<boolean>} `true` if confirmed, `false` if cancelled.
   */
  const confirm = (options) => {
    return new Promise((resolve) => {
      setModalState({
        ...options,
        onConfirm: () => {
          setModalState(null)
          resolve(true)
        },
        onCancel: () => {
          setModalState(null)
          resolve(false)
        },
      })
    })
  }

  /**
   * Renders the modal (via portal) if a confirmation is pending.
   * @returns {JSX.Element|null}
   */
  const ConfirmWrapper = () => {
    if (!modalState) return null

    return createPortal(
      <ConfirmModal
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        type={modalState.type || 'danger'}
        lang={lang}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
      />,
      document.body
    )
  }

  return { confirm, ConfirmWrapper }
}

export default useConfirm