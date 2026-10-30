/**
 * @file Account panel shown in Options → Support when a user is connected.
 *
 * Displays:
 * - The current tier (free / pro / dev) with a color-coded badge
 * - Trial users see a small "Trial" sub-badge + the expiry date +
 *   an "Upgrade to lifetime Pro" CTA
 * - The user's email and issue date (if connected)
 * - Actions: reveal/copy license token, change account, logout
 *
 * Tier-specific behavior:
 * - **Pro / Dev**: shows the license token controls (the token is meant
 *   to be saved by the user in case they change PC)
 * - **Free**: no token controls (there's no meaningful license to save);
 *   an "Upgrade to Pro" CTA is shown by the parent (`SupportSection`)
 * - **Trial Pro** (`tier === 'pro'` + `expiresAt` set): same as Pro, plus
 *   a "Pro until <date>" banner and a "Upgrade to lifetime Pro" CTA
 */

import { useState } from "react";
import { useLanguage } from "@core/i18n/LanguageContext";

/**
 * @typedef {'free' | 'pro' | 'dev'} LicenseTier
 * @typedef {Object} LicenseStatus
 * @property {string|null} email - User email, null if not connected
 * @property {LicenseTier} [tier] - 'free' | 'pro' | 'dev'
 * @property {number} [issuedAt] - Unix timestamp (seconds)
 * @property {number|null} [expiresAt] - Trial expiration (Unix seconds),
 *   `null` for lifetime Pro.
 * @property {boolean} [neverExpires] - `true` for lifetime Pro.
 */

/**
 * Formats a Unix timestamp (seconds) into a short locale date.
 *
 * @param {number} unixSec
 * @returns {string}
 */
function formatExpiry(unixSec) {
  return new Date(unixSec * 1000).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Account panel with tier badge, user info, and actions.
 *
 * @param {Object} props
 * @param {LicenseStatus} props.status - Current license status.
 * @param {() => Promise<void>|void} props.onLogout - Called after confirm.
 * @param {() => void} props.onLoginClick - Opens the login modal.
 * @param {(msg: string, type?: string) => void} [props.addToast]
 * @returns {JSX.Element}
 */
export default function AccountPanel({
  status,
  onLogout,
  onLoginClick,
  addToast,
}) {
  const { t } = useLanguage();
  const [showToken, setShowToken] = useState(false);
  const [tokenValue, setTokenValue] = useState("");
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const isConnected = !!status.email;
  const tier = status.tier || "free";
  const isPro = tier === "pro" || tier === "dev";
  const isDev = tier === "dev";
  const isFree = tier === "free";
  const isTrial =
    isPro &&
    !isDev &&
    status.expiresAt != null &&
    status.neverExpires === false;

  // ─── Load / copy token ──────────────────────────────────────────────
  const loadToken = async () => {
    const tk = await window.electronAPI?.storeGet?.("licenseToken");
    setTokenValue(tk || "");
    setShowToken(true);
  };

  const copyToken = async () => {
    if (!tokenValue) return;
    try {
      await navigator.clipboard.writeText(tokenValue);
      addToast?.(t("accountTokenCopied"), "success");
    } catch (e) {
      addToast?.("❌ " + e.message, "error");
    }
  };

  // ─── Logout (2-click confirm, auto-cancel after 3s) ─────────────────
  const handleLogoutClick = () => {
    if (!confirmingLogout) {
      setConfirmingLogout(true);
      setTimeout(() => setConfirmingLogout(false), 3000);
      return;
    }
    onLogout?.();
  };

  // ─── Upgrade to lifetime Pro (opens GitHub Sponsors) ────────────────
  const handleUpgradeClick = () => {
    const url = "https://github.com/sponsors/Stevehunn";
    // Prefer the shell bridge; fall back to the update one if not present
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else if (window.electronAPI?.updateOpenGithub) {
      // Last resort: opens the GitHub releases page in a browser
      window.electronAPI.updateOpenGithub();
    } else {
      // Web dev fallback
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // ─── Tier-specific display config ───────────────────────────────────
  const tierConfig = isDev
    ? {
        label: t("tierDev"),
        header: t("supportDevMode"),
        desc: t("supportDevModeDesc"),
        color: "var(--accent)",
        bg: "rgba(124,111,247,0.06)",
      }
    : isPro
      ? {
          label: t("tierPro"),
          header: t("supportProActive"),
          desc: t("supportProActiveDesc"),
          color: "var(--success)",
          bg: "rgba(29,158,117,0.06)",
        }
      : {
          label: t("tierFree"),
          header: t("supportFreeActive"),
          desc: t("supportFreeActiveDesc"),
          color: "var(--text-secondary)",
          bg: "rgba(160,160,176,0.05)",
        };

  const issuedDate = status.issuedAt
    ? new Date(status.issuedAt * 1000).toLocaleDateString()
    : "—";

  return (
    <div
      style={{
        padding: "12px 14px",
        background: tierConfig.bg,
        border: `1px solid ${tierConfig.color}`,
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* ─── Header: tier badge ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <i
            className={`ti ${isFree ? "ti-user-circle" : "ti-rosette-discount-check"}`}
            style={{
              color: tierConfig.color,
              fontSize: 18,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: tierConfig.color,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tierConfig.header}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {isTrial && (
            <span
              data-testid="account-trial-badge"
              style={{
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 8,
                background: "rgba(239,159,39,0.15)",
                color: "var(--warning)",
                border: "1px solid var(--warning)",
                fontWeight: 600,
              }}
            >
              {t("trialBadge")}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 10,
              background: tierConfig.color,
              color: "white",
              fontWeight: 600,
            }}
          >
            {tierConfig.label}
          </span>
        </div>
      </div>

      {/* ─── Description ─────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        {tierConfig.desc}
      </div>

      {/* ─── Trial expiry banner ─────────────────────────────────── */}
      {isTrial && (
        <div
          data-testid="account-trial-expiry"
          style={{
            fontSize: 11,
            color: "var(--warning)",
            lineHeight: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <i className="ti ti-calendar-time" style={{ fontSize: 12 }} />
          {t("trialExpiresOn", { date: formatExpiry(status.expiresAt) })}
        </div>
      )}

      {/* ─── "Not connected" badge ───────────────────────────────── */}
      {!isConnected && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            background: "rgba(239,159,39,0.1)",
            border: "1px solid var(--warning)",
            borderRadius: 6,
            fontSize: 11,
            color: "var(--warning)",
          }}
        >
          <i className="ti ti-plug-off" style={{ fontSize: 12 }} />
          {t("accountNotConnected")}
        </div>
      )}

      {/* ─── Email + date ────────────────────────────────────────── */}
      {isConnected && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            fontSize: 11,
            paddingTop: 8,
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ color: "var(--text-tertiary)" }}>
              {t("accountEmail")}
            </div>
            <div
              style={{
                color: "var(--text-primary)",
                fontFamily: "monospace",
                fontSize: 11,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {status.email}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--text-tertiary)" }}>
              {t("accountIssuedAt")}
            </div>
            <div style={{ color: "var(--text-primary)" }}>{issuedDate}</div>
          </div>
        </div>
      )}

      {/* ─── Token display ───────────────────────────────────────── */}
      {showToken && tokenValue && (
        <div
          style={{
            padding: 8,
            background: "var(--bg-tertiary)",
            borderRadius: 6,
            fontSize: 10,
            fontFamily: "monospace",
            wordBreak: "break-all",
            color: "var(--text-secondary)",
            maxHeight: 80,
            overflowY: "auto",
          }}
        >
          {tokenValue}
        </div>
      )}

      {/* ─── Token warning (Pro / Dev only) ──────────────────────── */}
      {isPro && (
        <div
          style={{
            fontSize: 11,
            color: "var(--warning)",
            lineHeight: 1.5,
          }}
        >
          <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
          {t("accountTokenWarning")}
        </div>
      )}

      {/* ─── Actions ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginTop: 4,
          alignItems: "center",
        }}
      >
        {/* Token reveal/copy — Pro / Dev only */}
        {isPro && (
          <>
            {!showToken ? (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={loadToken}
                style={{ fontSize: 11 }}
              >
                <i className="ti ti-key" /> {t("accountTokenShow")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={copyToken}
                  style={{ fontSize: 11 }}
                >
                  <i className="ti ti-copy" /> {t("accountTokenCopy")}
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    setShowToken(false);
                    setTokenValue("");
                  }}
                  style={{ fontSize: 11 }}
                >
                  <i className="ti ti-eye-off" /> {t("accountTokenHide")}
                </button>
              </>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Upgrade CTA — Trial users only */}
        {isTrial && (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={handleUpgradeClick}
            style={{ fontSize: 11 }}
            data-testid="account-upgrade-lifetime-button"
          >
            <i className="ti ti-heart" /> {t("trialUpgradeCta")}
          </button>
        )}

        {/* Connected actions */}
        {isConnected && (
          <>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={onLoginClick}
              style={{ fontSize: 11 }}
              data-testid="account-change-button"
            >
              <i className="ti ti-switch-horizontal" /> {t("accountChange")}
            </button>

            <button
              type="button"
              className={`btn-${confirmingLogout ? "danger" : "ghost"} btn-sm`}
              onClick={handleLogoutClick}
              style={{
                fontSize: 11,
                color: confirmingLogout ? "white" : "var(--danger)",
              }}
              data-testid="account-logout-button"
            >
              <i
                className={`ti ${confirmingLogout ? "ti-alert-triangle" : "ti-logout"}`}
              />
              {confirmingLogout ? t("accountLogoutConfirm") : t("authLogout")}
            </button>
          </>
        )}

        {/* Not connected */}
        {!isConnected && (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={onLoginClick}
            style={{ fontSize: 11 }}
            data-testid="account-connect-button"
          >
            <i className="ti ti-login" /> {t("accountConnect")}
          </button>
        )}
      </div>

      {/* ─── Footer note ─────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          marginTop: 2,
        }}
      >
        <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
        {isConnected ? t("accountLogoutNote") : t("accountNotConnectedNote")}
      </div>
    </div>
  );
}