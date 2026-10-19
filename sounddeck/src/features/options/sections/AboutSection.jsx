// src/features/options/sections/AboutSection.jsx
/**
 * @file About section of the Options page.
 *
 * Shows the current app version (read from `appVersion` in the store,
 * which is written once at boot in `electron/main.js`), plus the
 * license, a link to the GitHub source, and a small footer.
 *
 * The version is loaded asynchronously from the store (via IPC) so the
 * displayed value always matches the actual installed build — no need
 * to bump a hardcoded constant on every release.
 *
 * **Defensive**: the store value is coerced to a string. If the value is
 * missing, not a string, or the IPC fails, the UI shows `…` (loading) or
 * `?` (invalid) instead of trying to render a non-primitive (which would
 * crash React with "Objects are not valid as a React child").
 */

import { useState, useEffect } from "react";
import { useLanguage } from "@core/i18n/LanguageContext";
import Section from "../Section";
import OptionRow from "../OptionRow";

/**
 * Placeholder shown while the app version is being loaded (or if the
 * store doesn't have it, e.g. in dev). Never displayed in a normal
 * packaged build for more than a few ms.
 */
const VERSION_PLACEHOLDER = "…";

/**
 * Coerces the raw `appVersion` store value to a printable string.
 *
 * Guards against unexpected types (`undefined`, `null`, arrays, objects)
 * that could be present if the store got corrupted or if a future
 * migration writes a non-string.
 *
 * @param {unknown} value
 * @returns {string}
 */
function normalizeVersion(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return "?";
}

/**
 * @param {Object} props
 * @param {React.RefObject<HTMLElement>} [props.sectionRef]
 * @returns {JSX.Element}
 */
export default function AboutSection({ sectionRef }) {
  const { t } = useLanguage();
  const [appVersion, setAppVersion] = useState(
    /** @type {string|null} */ (null),
  );

  // Load the app version from the store (populated by electron/main.js
  // on every boot — see `store.set("appVersion", app.getVersion())`).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const version = await window.electronAPI?.storeGet?.("appVersion");
        if (!cancelled) setAppVersion(normalizeVersion(version));
      } catch {
        if (!cancelled) setAppVersion("?");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Opens the GitHub repo in the user's default browser.
   * @returns {void}
   */
  const handleOpenSource = () => {
    window.electronAPI?.openExternal?.(
      "https://github.com/Stevehunn/Soundboard",
    );
  };

  return (
    <Section
      ref={sectionRef}
      id="about"
      title={t("aboutSectionTitle")}
      icon="ti-info-circle"
    >
      <OptionRow label={t("aboutVersion")}>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            color: "var(--accent)",
            fontWeight: 600,
            background: "var(--bg-tertiary)",
            padding: "3px 10px",
            borderRadius: 6,
          }}
        >
          v{appVersion ?? VERSION_PLACEHOLDER}
        </span>
      </OptionRow>

      <OptionRow label={t("aboutLicense")}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {t("aboutLicenseValue")}
        </span>
      </OptionRow>

      <OptionRow label={t("aboutSourceCode")}>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={handleOpenSource}
          style={{ fontSize: 11 }}
        >
          <i className="ti ti-brand-github" /> GitHub
        </button>
      </OptionRow>

      <div
        style={{
          marginTop: 12,
          padding: "12px 14px",
          background: "var(--bg-tertiary)",
          borderRadius: "var(--radius-md)",
          fontSize: 11,
          color: "var(--text-tertiary)",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 6 }}>🎧</div>
        <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
          {t("aboutMadeWith")}
        </div>
        <div>{t("aboutOpenSource")}</div>
      </div>
    </Section>
  );
}