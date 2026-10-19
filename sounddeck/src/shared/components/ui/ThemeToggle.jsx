/**
 * @file Auto theme toggle (dark at night, light during the day).
 *
 * A small control (typically in Options → Appearance) that:
 *
 * - Lets the user opt into **automatic** dark/light switching
 * - Switches to **dark** between 20:00 and 05:59, **light** otherwise
 *   (see `applyAutoTheme`)
 * - Persists the on/off preference in electron-store (`autoTheme` key)
 * - Re-evaluates the theme at the top of every hour while the app is open
 *
 * The persisted preference is loaded **once, at mount** (async, from the
 * store). React 19's `react-hooks/set-state-in-effect` rule normally
 * forbids setState in effects, but the async store read is the exact
 * use-case the rule documents as legitimate — hence the targeted
 * `eslint-disable-next-line` comments below.
 *
 * @see ./CustomThemeEditor.jsx — sibling control (custom palette)
 * @see @core/store — persists `autoTheme` (bool) + `theme` ('dark' | 'light' | 'custom')
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@core/i18n/LanguageContext";

/** electron-store key holding the "auto theme" boolean. */
const STORAGE_KEY = "autoTheme";

/**
 * Returns the number of milliseconds until the next hour boundary (when
 * the auto theme should re-evaluate). Guarded to at least 1 minute to
 * avoid a tight loop if the clock is at XX:59:59.xxx.
 *
 * @returns {number} Milliseconds until the next check (≥ 60 000).
 */
function msUntilNextThemeCheck() {
  const now = new Date();
  const minute = now.getMinutes();
  const second = now.getSeconds();

  // ms until the next minute 00 of the next hour
  const msToNextHour = ((59 - minute) * 60 + (60 - second)) * 1000;

  return Math.max(msToNextHour, 60000); // safety floor: 1 min
}

/**
 * Auto theme toggle.
 *
 * @param {Object} props
 * @param {'dark'|'light'|'custom'} [props.currentTheme] - Currently
 *   applied theme. Not currently read by this component, but kept in the
 *   public API so the parent's intent is obvious.
 * @param {(theme: 'dark'|'light') => void} props.onThemeChange - Called
 *   whenever the auto-theme logic decides the theme should be
 *   `'dark'` or `'light'`.
 * @param {'fr'|'en'|'es'} [props.lang='fr'] - Legacy prop, unused (the
 *   language now comes from `useLanguage()`).
 * @returns {JSX.Element}
 */
export default function ThemeToggle({
  currentTheme: _currentTheme, // intentionally unused (see JSDoc)
  onThemeChange,
  lang: _lang = "fr", // intentionally unused (see JSDoc)
}) {
  const { t } = useLanguage();
  const [autoTheme, setAutoTheme] = useState(false);
  const initializedRef = useRef(false);
  const timeoutRef = useRef(null);

  /**
   * Reads the current hour and calls `onThemeChange` with the
   * corresponding theme (`dark` if < 6h or > 19h, `light` otherwise).
   *
   * Stable across renders thanks to `useCallback` (only depends on
   * `onThemeChange`), so it's safe to use in effect dependency arrays.
   *
   * @returns {void}
   */
  const applyAutoTheme = useCallback(() => {
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 19;
    onThemeChange(isNight ? "dark" : "light");
  }, [onThemeChange]);

  // ─── LOAD persisted preference (once, at mount) ─────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      try {
        let saved = null;

        if (window.electronAPI?.storeGet) {
          saved = await window.electronAPI.storeGet(STORAGE_KEY);
        }

        // One-shot migration from the old localStorage key
        if (saved === undefined || saved === null) {
          const legacy = localStorage.getItem("sounddeck-auto-theme");
          if (legacy !== null) {
            saved = legacy === "true";
            await window.electronAPI?.storeSet?.(STORAGE_KEY, saved);
            try {
              localStorage.removeItem("sounddeck-auto-theme");
            } catch {
              // Ignore — the key may be read-only in some browsers
            }
          }
        }

        const isAuto = saved === true;

        setAutoTheme(isAuto);

        if (isAuto) {
          applyAutoTheme();
        }
      } catch (e) {
        console.warn("[ThemeToggle] Erreur init:", e);
      }
    };

    init();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [applyAutoTheme]);

  // ─── HOURLY RE-EVALUATION (only when auto is on) ────────────────────
  useEffect(() => {
    if (!autoTheme) return;

    const scheduleNextCheck = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        applyAutoTheme();
        scheduleNextCheck();
      }, msUntilNextThemeCheck());
    };

    scheduleNextCheck();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [autoTheme, applyAutoTheme]);

  /**
   * Toggles the auto theme on/off and persists the new state.
   *
   * @returns {Promise<void>}
   */
  const toggleAutoTheme = async () => {
    const newState = !autoTheme;
    setAutoTheme(newState);

    try {
      await window.electronAPI?.storeSet?.(STORAGE_KEY, newState);
    } catch (e) {
      console.warn("[ThemeToggle] Erreur save:", e);
    }

    if (newState) {
      applyAutoTheme();
    }
  };

  // Derived values for the UI
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour > 19;
  const timeEmoji = isNight ? "🌙" : "☀️";

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={toggleAutoTheme}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 12,
          border: `2px solid ${autoTheme ? "var(--accent)" : "var(--border)"}`,
          background: autoTheme
            ? "var(--accent-light)"
            : "var(--bg-tertiary)",
          color: autoTheme ? "var(--accent)" : "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontWeight: autoTheme ? 600 : 400,
          transition: "all 0.15s ease",
        }}
      >
        <span style={{ fontSize: 16 }}>{timeEmoji}</span>
        {autoTheme ? t("themeAutoOn") : t("themeAutoOff")}
        {autoTheme && (
          <span
            style={{
              fontSize: 9,
              color: "var(--text-tertiary)",
              background: "var(--bg-tertiary)",
              padding: "0 6px",
              borderRadius: 10,
            }}
          >
            {isNight ? `🌙 ${t("themeNight")}` : `☀️ ${t("themeDay")}`}
          </span>
        )}
      </button>
    </div>
  );
}