import { useState } from 'react'
import { createPortal } from 'react-dom'
// ✅ CORRIGER L'IMPORT - Utiliser le chemin correct
import ConfirmModal from '@shared/components/modals/ConfirmModal'

export function useConfirm({ lang = 'fr' } = {}) {
  const [modalState, setModalState] = useState(null)

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
        }
      })
    })
  }

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