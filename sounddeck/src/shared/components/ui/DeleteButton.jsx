// src/shared/components/ui/DeleteButton.jsx
import React, { useState } from 'react'
import useConfirm from '@shared/hooks/useConfirm'
import { useLanguage } from '@core/i18n/LanguageContext'

const DeleteButton = ({
  onDelete,
  onConfirmStart,
  onConfirmEnd,
  confirmTitle = 'Confirmer la suppression',
  confirmMessage = 'Voulez-vous vraiment supprimer cet élément ?',
  itemName = '',
  size = 'sm',
  className = '',
  disabled = false,
  icon = 'ti-trash',
  label = 'Supprimer',
  showLabel = false,
  variant = 'ghost',
  type = 'danger',
  style = {},
}) => {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  const [isHovering, setIsHovering] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const handleClick = async (e) => {
    e?.stopPropagation?.()
    
    setIsConfirming(true)
    if (onConfirmStart) {
      onConfirmStart()
    }
    
    try {
      const confirmed = await confirm({
        title: confirmTitle,
        message: confirmMessage + (itemName ? ` "${itemName}"` : ''),
        type: type,
        confirmText: label,
        cancelText: t('cancel') || 'Annuler',
      })
      
      if (confirmed) {
        onDelete?.()
      }
    } catch (err) {
      // Ignorer les erreurs
    } finally {
      setIsConfirming(false)
      if (onConfirmEnd) {
        onConfirmEnd()
      }
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'ghost':
        return {
          backgroundColor: isHovering ? 'rgba(224, 82, 82, 0.1)' : 'transparent',
          color: isHovering ? 'var(--danger)' : 'var(--text-secondary)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: isHovering ? 'var(--danger)' : 'transparent',
        }
      case 'outline':
        return {
          backgroundColor: isHovering ? 'rgba(224, 82, 82, 0.1)' : 'transparent',
          color: isHovering ? 'var(--danger)' : 'var(--danger)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--danger)',
        }
      case 'danger':
      default:
        return {
          backgroundColor: isHovering ? '#c0392b' : 'var(--danger)',
          color: 'white',
          borderWidth: '0px',
          borderStyle: 'none',
          borderColor: 'transparent',
          boxShadow: isHovering 
            ? '0 4px 15px rgba(224, 82, 82, 0.4)' 
            : '0 2px 8px rgba(224, 82, 82, 0.2)',
        }
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'lg':
        return { padding: '8px 16px', fontSize: 14, minHeight: 36 }
      case 'md':
        return { padding: '6px 12px', fontSize: 13, minHeight: 32 }
      case 'sm':
      default:
        return { padding: '4px 8px', fontSize: 11, minHeight: 28 }
    }
  }

  const variantStyles = getVariantStyles()
  const sizeStyles = getSizeStyles()
  const isDisabled = disabled || isConfirming

  return (
    <>
      <button
        className={`delete-button ${className}`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        disabled={isDisabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          borderRadius: 'var(--radius-sm)',
          cursor: isDisabled ? 'default' : 'pointer',
          opacity: isDisabled ? 0.5 : 1,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovering && !isDisabled ? 'scale(1.05)' : 'scale(1)',
          outline: 'none',
          fontFamily: 'inherit',
          fontWeight: 500,
          ...variantStyles,
          ...sizeStyles,
          ...style,
        }}
        title={label}
      >
        <i className={`ti ${icon}`} style={{ fontSize: size === 'sm' ? 12 : 14 }} />
        {showLabel && <span>{label}</span>}
      </button>
      
      <ConfirmWrapper />
    </>
  )
}

export default DeleteButton