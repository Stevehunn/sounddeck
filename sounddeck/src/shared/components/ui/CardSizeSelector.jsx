/**
 * @file Small segmented control to pick a card size.
 *
 * Renders 3 buttons (small / medium / large) with an active state driven
 * by `value`. The active button gets an accent border + accent color +
 * a check icon. Hover previews the accent border on inactive buttons.
 *
 * Used in Options → Appearance to change the sound-card size on the
 * Home page, and in the sound-popup preview.
 *
 * @see @features/options/sections/AppearanceSection.jsx — main consumer
 * @see @shared/components/ui/CustomThemeEditor.jsx — sibling control
 */

import { useLanguage } from "@core/i18n/LanguageContext";

/**
 * Card size segmented control.
 *
 * @param {Object} props
 * @param {'small' | 'medium' | 'large'} props.value - Currently selected size.
 * @param {(value: 'small' | 'medium' | 'large') => void} props.onChange
 *   Called when the user clicks a different size.
 * @param {string} [_lang='fr'] - Legacy prop, unused (the language now
 *   comes from `useLanguage()`). Kept in the public API for backward
 *   compatibility.
 * @returns {JSX.Element}
 */
export default function CardSizeSelector({
  value,
  onChange,
  lang: _lang = "fr", // intentionally unused (see JSDoc)
}) {
  const { t } = useLanguage();

  // Built inside the component because `t` comes from a hook.
  const sizes = [
    { val: "small", label: t("cardSizeSmall"), icon: "ti-layout-grid" },
    { val: "medium", label: t("cardSizeMedium"), icon: "ti-layout-grid" },
    { val: "large", label: t("cardSizeLarge"), icon: "ti-layout-grid" },
  ];

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {sizes.map(({ val, label, icon }) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            border: `2px solid ${value === val ? "var(--accent)" : "var(--border)"}`,
            background:
              value === val ? "var(--accent-light)" : "var(--bg-tertiary)",
            color:
              value === val ? "var(--accent)" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontWeight: value === val ? 600 : 400,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (value !== val) {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--text-primary)";
            }
          }}
          onMouseLeave={(e) => {
            if (value !== val) {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }
          }}
        >
          <i className={icon} style={{ fontSize: 14 }} />
          {label}
          {value === val && (
            <i className="ti ti-check" style={{ fontSize: 11 }} />
          )}
        </button>
      ))}
    </div>
  );
}