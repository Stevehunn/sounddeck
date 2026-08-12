// src/shared/components/ui/DeleteButton.jsx
import React, { useState } from 'react'
import useConfirm from '@shared/hooks/useConfirm'
import { useLanguage } from '@core/i18n/LanguageContext'

/**
 * Bouton Supprimer générique avec popup de confirmation
 * Utilise le système de confirmation existant de l'application
 * 
 * @param {Object} props
 * @param {Function} props.onDelete - Fonction appelée lors de la confirmation
 * @param {string} props.confirmTitle - Titre de la popup de confirmation
 * @param {string} props.confirmMessage - Message de confirmation
 * @param {string} props.itemName - Nom de l'élément à supprimer
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 * @param {string} props.className - Classes CSS supplémentaires
 * @param {boolean} props.disabled - Désactiver le bouton
 * @param {string} props.icon - Icône personnalisée (défaut: ti-trash)
 * @param {string} props.label - Label du bouton (défaut: 'Supprimer')
 * @param {boolean} props.showLabel - Afficher le label à côté de l'icône
 * @param {string} props.variant - 'danger' | 'ghost' | 'outline' (défaut: 'ghost')
 * @param {string} props.type - 'danger' | 'warning' | 'info' (défaut: 'danger')
 */
const DeleteButton = ({
  onDelete,
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
}) => {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  const [isHovering, setIsHovering] = useState(false)

  const handleClick = async (e) => {
    e?.stopPropagation?.()
    
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
  }

  // Styles selon la variante
  const getVariantStyles = () => {
    switch (variant) {
      case 'ghost':
        return {
          background: isHovering ? 'rgba(224, 82, 82, 0.1)' : 'transparent',
          color: isHovering ? 'var(--danger)' : 'var(--text-secondary)',
          borderWidth: isHovering ? '1px' : '1px',
          borderStyle: 'solid',
          borderColor: isHovering ? 'var(--danger)' : 'transparent',
        }
      case 'outline':
        return {
          background: isHovering ? 'rgba(224, 82, 82, 0.1)' : 'transparent',
          color: isHovering ? 'var(--danger)' : 'var(--danger)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--danger)',
        }
      case 'danger':
      default:
        return {
          background: isHovering ? '#c0392b' : 'var(--danger)',
          color: 'white',
          border: 'none',
          boxShadow: isHovering 
            ? '0 4px 15px rgba(224, 82, 82, 0.4)' 
            : '0 2px 8px rgba(224, 82, 82, 0.2)',
        }
    }
  }

  // Taille du bouton
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

  return (
    <>
      <button
        className={`delete-button ${className}`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        disabled={disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          borderRadius: 'var(--radius-sm)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovering && !disabled ? 'scale(1.05)' : 'scale(1)',
          outline: 'none',
          fontFamily: 'inherit',
          fontWeight: 500,
          ...variantStyles,
          ...sizeStyles,
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