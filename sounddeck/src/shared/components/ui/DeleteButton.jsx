/**
 * @file Confirmation-first delete button.
 *
 * A small reusable button that:
 *
 * 1. Shows a trash icon (or custom icon) styled according to a `variant`
 *    (ghost, outline, danger, ghost-danger) and a `size` (sm, md, lg).
 * 2. On click, opens a `useConfirm` dialog with a configurable title and
 *    message.
 * 3. Runs `onDelete` only if the user confirms — otherwise nothing.
 * 4. Optionally interpolates the item name into the message (via `{name}`
 *    or `{itemName}` placeholders, or by auto-appending `"item"` when no
 *    placeholder is present).
 *
 * Optional lifecycle hooks:
 * - `onConfirmStart` — called the moment the confirm dialog opens
 * - `onConfirmEnd` — called after the user responds (confirm or cancel)
 *
 * The dialog itself is rendered via `useConfirm`'s `ConfirmWrapper`, which
 * this component mounts next to the button. Callers don't need to add
 * anything extra.
 *
 * @see @shared/hooks/useConfirm — actual dialog implementation
 * @see @core/i18n/LanguageContext — translation source
 */

import { useState } from "react";
import useConfirm from "@shared/hooks/useConfirm";
import { useLanguage } from "@core/i18n/LanguageContext";

/**
 * Confirmation-first delete button.
 *
 * @param {Object} props
 * @param {() => void} [props.onDelete] - Called only if the user confirms.
 * @param {() => void} [props.onConfirmStart] - Called when the dialog opens.
 * @param {() => void} [props.onConfirmEnd] - Called after the dialog closes.
 * @param {string} [props.confirmTitle] - Override the dialog title
 *   (defaults to `t('confirmDeleteSound')`).
 * @param {string} [props.confirmMessage] - Override the dialog body
 *   (defaults to `t('confirmDeleteMessage')`). Supports `{name}` /
 *   `{itemName}` placeholders.
 * @param {string} [props.itemName=''] - Name of the item being deleted
 *   (interpolated into the message).
 * @param {'sm' | 'md' | 'lg'} [props.size='sm'] - Button size.
 * @param {string} [props.className=''] - Extra class on the button.
 * @param {boolean} [props.disabled=false] - Disables the button.
 * @param {string} [props.icon='ti-trash'] - Tabler icon class.
 * @param {string} [props.label] - Alias for `deleteLabel`.
 * @param {string} [props.deleteLabel] - Button label / dialog confirm text.
 * @param {boolean} [props.showLabel=false] - Whether to render the label
 *   next to the icon.
 * @param {'ghost' | 'outline' | 'danger' | 'ghost-danger'} [props.variant='ghost']
 *   Styling variant.
 * @param {string} [props.type='danger'] - Confirm dialog type.
 * @param {React.CSSProperties} [props.style={}] - Style overrides.
 * @returns {JSX.Element}
 */
const DeleteButton = ({
  onDelete,
  onConfirmStart,
  onConfirmEnd,
  confirmTitle,
  confirmMessage,
  itemName = "",
  size = "sm",
  className = "",
  disabled = false,
  icon = "ti-trash",
  label,
  deleteLabel,
  showLabel = false,
  variant = "ghost",
  type = "danger",
  style = {},
}) => {
  const { t, currentLang } = useLanguage();
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang });
  const [isHovering, setIsHovering] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const displayLabel = deleteLabel || label || t("delete") || "Supprimer";
  const displayTitle =
    confirmTitle || t("confirmDeleteSound") || "Confirmer la suppression";
  const displayMessage =
    confirmMessage ||
    t("confirmDeleteMessage") ||
    "Cette action est irréversible. Voulez-vous vraiment continuer ?";

  /**
   * Builds the final confirmation message, interpolating `itemName` when
   * the message contains `{name}` or `{itemName}`. If neither placeholder
   * is present but `itemName` is set, the name is appended in quotes
   * (best-effort hint to the user of what they're about to delete).
   *
   * @returns {string}
   */
  const buildFinalMessage = () => {
    let finalMessage = displayMessage;

    const hasNamePlaceholder = /\{name\}|\{itemName\}/.test(finalMessage);

    if (itemName && hasNamePlaceholder) {
      finalMessage = finalMessage
        .replace(/\{name\}/g, itemName)
        .replace(/\{itemName\}/g, itemName);
      return finalMessage;
    }

    if (itemName && !hasNamePlaceholder) {
      const hasNameInMessage =
        finalMessage.includes(`"${itemName}"`) ||
        finalMessage.includes(itemName);
      if (!hasNameInMessage) {
        finalMessage = `${finalMessage} "${itemName}"`;
      }
    }

    return finalMessage;
  };

  /**
   * Button click handler. Opens the confirm dialog and calls `onDelete`
   * only if the user confirms.
   *
   * @param {React.MouseEvent} [e]
   * @returns {Promise<void>}
   */
  const handleClick = async (e) => {
    e?.stopPropagation?.();

    setIsConfirming(true);
    if (onConfirmStart) {
      onConfirmStart();
    }

    try {
      const finalMessage = buildFinalMessage();

      const confirmed = await confirm({
        title: displayTitle,
        message: finalMessage,
        type,
        confirmText: displayLabel,
        cancelText: t("cancel") || "Annuler",
      });

      if (confirmed) {
        onDelete?.();
      }
    } catch (err) {
      console.error("❌ [DeleteButton] Erreur:", err);
    } finally {
      setIsConfirming(false);
      if (onConfirmEnd) {
        onConfirmEnd();
      }
    }
  };

  /**
   * Returns the CSS object matching the current `variant` + hover state.
   *
   * @returns {React.CSSProperties}
   */
  const getVariantStyles = () => {
    switch (variant) {
      case "ghost":
        return {
          backgroundColor: isHovering ? "rgba(224, 82, 82, 0.1)" : "transparent",
          color: isHovering ? "var(--danger)" : "var(--text-secondary)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: isHovering ? "var(--danger)" : "transparent",
        };
      case "outline":
        return {
          backgroundColor: isHovering ? "rgba(224, 82, 82, 0.1)" : "transparent",
          color: "var(--danger)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "var(--danger)",
        };
      case "danger":
        return {
          backgroundColor: isHovering ? "#c0392b" : "var(--danger)",
          color: "white",
          borderWidth: "0px",
          borderStyle: "none",
          borderColor: "transparent",
          boxShadow: isHovering
            ? "0 4px 15px rgba(224, 82, 82, 0.4)"
            : "0 2px 8px rgba(224, 82, 82, 0.2)",
        };
      case "ghost-danger":
      default:
        return {
          backgroundColor: isHovering ? "rgba(224, 82, 82, 0.1)" : "transparent",
          color: isHovering ? "var(--danger)" : "var(--text-secondary)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: isHovering ? "var(--danger)" : "transparent",
          borderRadius: "var(--radius-sm)",
          padding: "4px 8px",
          transition: "all 0.15s ease",
        };
    }
  };

  /**
   * Returns the CSS object matching the current `size`.
   *
   * @returns {React.CSSProperties}
   */
  const getSizeStyles = () => {
    switch (size) {
      case "lg":
        return { padding: "8px 16px", fontSize: 14, minHeight: 36 };
      case "md":
        return { padding: "6px 12px", fontSize: 13, minHeight: 32 };
      case "sm":
      default:
        return { padding: "4px 8px", fontSize: 11, minHeight: 28 };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const isDisabled = disabled || isConfirming;

  return (
    <>
      <button
        className={`delete-button ${className}`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        disabled={isDisabled}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          borderRadius: "var(--radius-sm)",
          cursor: isDisabled ? "default" : "pointer",
          opacity: isDisabled ? 0.5 : 1,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isHovering && !isDisabled ? "scale(1.05)" : "scale(1)",
          outline: "none",
          fontFamily: "inherit",
          fontWeight: 500,
          ...variantStyles,
          ...sizeStyles,
          ...style,
        }}
        title={displayLabel}
      >
        <i
          className={`ti ${icon}`}
          style={{ fontSize: size === "sm" ? 12 : 14 }}
        />
        {showLabel && <span>{displayLabel}</span>}
      </button>

      <ConfirmWrapper />
    </>
  );
};

export default DeleteButton;