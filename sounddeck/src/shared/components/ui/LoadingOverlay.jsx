/**
 * @file Fullscreen loading overlay.
 *
 * A modal-like overlay that blocks the entire UI while a long-running
 * operation is in progress (importing a big sound, exporting a backup,
 * etc.). Renders a centered card with a spinner, a custom message (or
 * `t('loading')`), and a subtitle.
 *
 * The overlay is rendered in a portal to `document.body` so it always
 * sits above the app's layout (z-index `99999`), and uses the local
 * `fadeIn` keyframe defined in the app's `animations.css`.
 *
 * @see @shared/components/ui/Toast.jsx — the notification counterpart
 */

import { createPortal } from "react-dom";
import { useLanguage } from "@core/i18n/LanguageContext";

/**
 * Fullscreen loading overlay.
 *
 * @param {Object} props
 * @param {string} [props.message] - Custom message shown under the spinner
 *   (defaults to `t('loading')`).
 * @param {boolean} props.visible - Whether the overlay is shown. Returns
 *   `null` when `false`.
 * @returns {JSX.Element|null}
 */
export default function LoadingOverlay({ message, visible }) {
  const { t } = useLanguage();

  if (!visible) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "2px solid var(--accent)",
          borderRadius: "var(--radius-lg)",
          padding: "32px 40px",
          maxWidth: 400,
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <i
          className="ti ti-loader"
          style={{
            fontSize: 48,
            color: "var(--accent)",
            animation: "spin 1.5s linear infinite",
            display: "block",
            marginBottom: 16,
          }}
        />
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          {message || t("loading")}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {t("loadingSubtitle")}
        </div>
      </div>
    </div>,
    document.body,
  );
}