/**
 * @file Emoji picker modal.
 *
 * A modal that lets the user pick an emoji from:
 *
 * 1. **Default emojis** — a curated list from `useEmojis()`, truncated to
 *    `defaultEmojisCount` (default 24) unless the picker is expanded.
 * 2. **Custom emojis** — the user's own collection, grouped by category
 *    (only visible when expanded).
 *
 * Extra features:
 * - **Manual add** — a small inline input to paste / type an emoji directly
 *   (validated via `isValidEmoji()` and persisted via `addEmoji()`)
 * - **Show more / less** — toggles between compact and full view
 * - **Manage link** — optional button to navigate to the emoji management page
 *
 * The modal is rendered in a portal to `document.body` and uses a custom
 * `zIndex` (default `99999`) so it sits above other modals (e.g. the
 * FeedbackModal).
 *
 * **Implementation note**: the actual modal body lives in `EmojiPickerBody`,
 * which is only mounted while `isOpen === true`. This guarantees that the
 * internal state (expanded / manual-add / error / just-added) is fully
 * destroyed when the modal closes, without needing a reset effect (which
 * React 19's `react-hooks/set-state-in-effect` rule flags as an anti-pattern).
 *
 * @see ../hooks/useEmojis.js — data source + `addEmoji` / `getCategoryInfo`
 * @see ../../constants/emojis.js — `isValidEmoji` validation
 * @see ../../features/emoji/EmojiPage.jsx — where the picker is used
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@core/i18n/LanguageContext";
import { useEmojis } from "@shared/hooks/useEmojis";
import { isValidEmoji } from "@shared/constants/emojis";

/** Default number of emojis shown before "Show more" is clicked. */
const DEFAULT_SHOW_COUNT = 24;

/**
 * Emoji picker modal — thin wrapper that mounts the actual modal body
 * only while open.
 *
 * By returning `null` when closed, we guarantee that `EmojiPickerBody`
 * (and all its state) is destroyed on close and recreated on open.
 * That's the React-19-recommended alternative to resetting state in an
 * effect.
 *
 * @param {Object} props - Forwarded to `EmojiPickerBody`.
 * @returns {JSX.Element|null}
 */
export default function EmojiPicker(props) {
  if (!props.isOpen) return null;
  return <EmojiPickerBody {...props} />;
}

/**
 * Inner modal body — lives only while the picker is open.
 *
 * @param {Object} props
 * @param {() => void} props.onClose - Called when the modal should close.
 * @param {(emoji: string) => void} props.onSelect - Called with the picked
 *   emoji. The modal auto-closes after this.
 * @param {string|null} [props.currentEmoji=null] - Currently-selected emoji
 *   (highlighted in the grid).
 * @param {() => void} [props.onManageClick] - Optional "Manage emojis"
 *   handler. When provided, a small link is shown in the footer.
 * @param {number} [props.defaultEmojisCount=24] - How many default emojis
 *   to show before expanding.
 * @param {boolean} [props.showManageLink=true] - Whether to render the
 *   "Manage" link (ignored if `onManageClick` is not provided).
 * @param {number} [props.zIndex=99999] - Custom z-index for the modal.
 * @returns {JSX.Element}
 */
function EmojiPickerBody({
  onClose,
  onSelect,
  currentEmoji = null,
  onManageClick,
  defaultEmojisCount = DEFAULT_SHOW_COUNT,
  showManageLink = true,
  zIndex = 99999,
}) {
  const { t } = useLanguage();
  const {
    defaultEmojis,
    customEmojis,
    customGrouped,
    addEmoji,
    getCategoryInfo,
  } = useEmojis();

  // Local UI state — reset automatically when the component unmounts
  // (which happens on close, since `EmojiPicker` returns `null`).
  const [expanded, setExpanded] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [manualError, setManualError] = useState("");
  const [justAdded, setJustAdded] = useState(null);

  const manualInputRef = useRef(null);

  // Auto-focus the manual input when it appears
  useEffect(() => {
    if (showManualAdd && manualInputRef.current) {
      manualInputRef.current.focus();
    }
  }, [showManualAdd]);

  // Escape closes the picker
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Default emojis: truncated when collapsed, full when expanded
  const displayedDefault = useMemo(() => {
    if (expanded) return defaultEmojis;
    return defaultEmojis.slice(0, defaultEmojisCount);
  }, [defaultEmojis, expanded, defaultEmojisCount]);

  // Whether "Show more" should be offered
  const hasMoreContent = useMemo(() => {
    if (defaultEmojis.length > defaultEmojisCount) return true;
    if (customEmojis.length > 0) return true;
    return false;
  }, [defaultEmojis.length, defaultEmojisCount, customEmojis.length]);

  /**
   * Handles an emoji click.
   * @param {string} emoji
   * @returns {void}
   */
  const handleSelect = (emoji) => {
    onSelect?.(emoji);
    onClose?.();
  };

  /**
   * Validates + persists a manually-typed emoji, then shows a success
   * confirmation for 2 s.
   *
   * @returns {Promise<void>}
   */
  const handleManualAdd = async () => {
    setManualError("");
    const trimmed = manualValue.trim();
    if (!trimmed) return;

    if (!isValidEmoji(trimmed)) {
      setManualError(t("emojiPickerAddInvalid"));
      return;
    }

    const result = await addEmoji(trimmed, null);
    if (result.success) {
      setJustAdded(trimmed);
      setManualValue("");
      setShowManualAdd(false);
      setTimeout(() => setJustAdded(null), 2000);
    } else {
      setManualError(result.error || t("emojiPickerAddError"));
    }
  };

  // Build the custom-emoji groups. `customGrouped` is shaped like
  // `{ [categoryId]: string[], __uncategorized__: string[] }`.
  const customGroups = Object.entries(customGrouped).map(([catId, emojis]) => {
    const info =
      catId === "__uncategorized__"
        ? {
            id: "__uncategorized__",
            label: t("emojiPickerUncategorized"),
            icon: "ti-mood-smile",
          }
        : getCategoryInfo(catId) || {
            id: catId,
            label: catId,
            icon: "ti-folder",
          };
    return { ...info, emojis };
  });

  return createPortal(
    <div
      data-testid="emoji-picker-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        // Light dim veil (no blur — matches the rest of the app's modals)
        background: "rgba(0,0,0,0.55)",
        zIndex,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        data-testid="emoji-picker-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 14,
          width: 360,
          maxWidth: "90vw",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {/* ─── HEADER ────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {t("emojiPickerTitle")}
          </span>
          <button
            data-testid="emoji-picker-close-button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              borderRadius: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.background = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* ─── SCROLLABLE CONTENT ───────────────────────────────────── */}
        <div
          style={{
            overflowY: "auto",
            flex: 1,
            marginRight: -8,
            paddingRight: 8,
          }}
        >
          {/* Default emojis section */}
          <Section title={t("emojiPickerDefaultSection")}>
            <Grid
              data-testid="emoji-picker-default-grid"
              emojis={displayedDefault}
              currentEmoji={currentEmoji}
              onSelect={handleSelect}
              dataTestIdPrefix="emoji-picker-default"
            />
          </Section>

          {/* Custom emojis sections — only visible when expanded */}
          {expanded && (
            <>
              {customGroups.map((group) => (
                <Section
                  key={group.id}
                  title={group.label}
                  icon={group.icon}
                  data-testid={`emoji-picker-custom-group-${group.id}`}
                >
                  <Grid
                    emojis={group.emojis}
                    currentEmoji={currentEmoji}
                    onSelect={handleSelect}
                    dataTestIdPrefix={`emoji-picker-custom-${group.id}`}
                  />
                </Section>
              ))}

              {customEmojis.length === 0 && (
                <div
                  data-testid="emoji-picker-no-custom"
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    textAlign: "center",
                    padding: "12px 0",
                    fontStyle: "italic",
                  }}
                >
                  {t("emojiPickerNoCustom")}
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── FOOTER: action buttons + discrete "Manage" link ──────── */}
        <div
          style={{
            display: "flex",
            gap: 6,
            paddingTop: 12,
            marginTop: 8,
            borderTop: "1px solid var(--border)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {hasMoreContent && !expanded && (
            <button
              data-testid="emoji-picker-show-more-button"
              onClick={() => setExpanded(true)}
              className="btn-secondary btn-sm"
              style={{ justifyContent: "center", fontSize: 12 }}
            >
              <i className="ti ti-chevron-down" />
              {t("emojiPickerShowMore")}
            </button>
          )}

          {expanded && (
            <button
              data-testid="emoji-picker-show-less-button"
              onClick={() => setExpanded(false)}
              className="btn-secondary btn-sm"
              style={{ justifyContent: "center", fontSize: 12 }}
            >
              <i className="ti ti-chevron-up" />
              {t("emojiPickerShowLess")}
            </button>
          )}

          {!showManualAdd && (
            <button
              data-testid="emoji-picker-add-manual-button"
              onClick={() => setShowManualAdd(true)}
              className="btn-secondary btn-sm"
              style={{ justifyContent: "center", fontSize: 12 }}
            >
              <i className="ti ti-plus" />
              {t("emojiPickerAddManual")}
            </button>
          )}

          {/* Discrete "Manage" link on the far right */}
          {showManageLink && onManageClick && (
            <button
              data-testid="emoji-picker-manage-button"
              onClick={() => {
                onClose?.();
                onManageClick();
              }}
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                fontSize: 11,
                cursor: "pointer",
                padding: "4px 6px",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "inherit",
                opacity: 0.85,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.textDecoration = "underline";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.85";
                e.currentTarget.style.textDecoration = "none";
              }}
            >
              {t("emojiPickerManage")}
              <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
            </button>
          )}
        </div>

        {/* ─── MANUAL ADD INPUT ─────────────────────────────────────── */}
        {showManualAdd && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                ref={manualInputRef}
                data-testid="emoji-picker-add-manual-input"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualAdd();
                  if (e.key === "Escape") {
                    setShowManualAdd(false);
                    setManualValue("");
                    setManualError("");
                  }
                }}
                placeholder={t("emojiPickerAddPlaceholder")}
                style={{ flex: 1, fontSize: 16, textAlign: "center" }}
                maxLength={8}
              />
              <button
                data-testid="emoji-picker-add-manual-confirm"
                onClick={handleManualAdd}
                className="btn-primary btn-sm"
                disabled={!manualValue.trim()}
                style={{ minWidth: 60 }}
              >
                {t("emojiPickerAddConfirm")}
              </button>
              <button
                onClick={() => {
                  setShowManualAdd(false);
                  setManualValue("");
                  setManualError("");
                }}
                className="btn-secondary btn-sm"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            {manualError && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--danger)",
                  marginTop: 4,
                }}
              >
                <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
                {manualError}
              </div>
            )}
          </div>
        )}

        {/* ─── ADD CONFIRMATION ─────────────────────────────────────── */}
        {justAdded && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "var(--success)",
              textAlign: "center",
              background: "rgba(29,158,117,0.1)",
              padding: "6px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--success)",
            }}
          >
            <i className="ti ti-check" style={{ marginRight: 4 }} />
            {t("emojiPickerAdded")} : {justAdded}
          </div>
        )}
      </div>

      {/* Local keyframes — the overlay is portaled to body, so it can't
          rely on the app's global CSS being loaded at that point. */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  );
}

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────

/**
 * A titled section inside the picker (e.g. "Default", "Animals", …).
 *
 * @param {Object} props
 * @param {string} props.title - Section title (already translated).
 * @param {string} [props.icon] - Optional Tabler icon class.
 * @param {React.ReactNode} props.children - Grid content.
 * @param {string} [props['data-testid']] - Testing hook.
 * @returns {JSX.Element}
 */
function Section({ title, icon, children, "data-testid": dataTestId }) {
  return (
    <div data-testid={dataTestId} style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 11 }} />}
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * A responsive grid of emoji buttons.
 *
 * @param {Object} props
 * @param {string[]} props.emojis - Emojis to render.
 * @param {string|null} props.currentEmoji - The currently-selected emoji
 *   (gets an accent border + light background).
 * @param {(emoji: string) => void} props.onSelect - Called on click.
 * @param {string} props.dataTestIdPrefix - Prefix for per-emoji `data-testid`
 *   (each item becomes `<prefix>-<emoji>`).
 * @param {string} [props['data-testid']] - Testing hook for the grid itself.
 * @returns {JSX.Element}
 */
function Grid({
  emojis,
  currentEmoji,
  onSelect,
  dataTestIdPrefix,
  "data-testid": dataTestId,
}) {
  return (
    <div
      data-testid={dataTestId}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(34px, 1fr))",
        gap: 4,
        background: "var(--bg-tertiary)",
        padding: 6,
        borderRadius: "var(--radius-sm)",
      }}
    >
      {emojis.map((emoji) => {
        const isActive = currentEmoji === emoji;
        return (
          <button
            key={emoji}
            data-testid={`${dataTestIdPrefix}-${emoji}`}
            onClick={() => onSelect(emoji)}
            style={{
              width: 34,
              height: 34,
              fontSize: 18,
              borderRadius: 5,
              border: `1px solid ${isActive ? "var(--accent)" : "transparent"}`,
              background: isActive ? "var(--accent-light)" : "var(--bg-secondary)",
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = "transparent";
              }
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}

export { EmojiPicker };